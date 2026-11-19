import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { PRODUCTS } from '../data/mockData';
import type { CartItem, CutOption, InventoryItem, Order, OrderStatus } from '../types';

// ---------------------------------------------------------------- auth

export function watchAuth(cb: (user: User | null) => void): Unsubscribe {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

// Customers sign in with their mobile number (OTP); the signed-in account
// owns their orders and profile.
function currentUser(): User | null {
  return auth?.currentUser ?? null;
}

/** True for a customer who logged in with OTP (not a guest or email admin). */
export function isPhoneUser(user: User | null): boolean {
  return !!user && user.uid.startsWith('phone_91');
}

/** 10-digit number from a phone account's uid ('phone_91XXXXXXXXXX'). */
export function phoneOf(user: User | null): string {
  return isPhoneUser(user) ? user!.uid.slice('phone_91'.length) : '';
}

// ------------------------------------------------------------- OTP login
// Talks to the OTP server in server/ (Vercel). It texts the code through
// Renflair and, once the code is right, returns a Firebase custom token.

// Public URL (not a secret); EXPO_PUBLIC_OTP_API_URL overrides it, e.g. for a
// local `vercel dev`.
const OTP_API = (process.env.EXPO_PUBLIC_OTP_API_URL || 'https://magicmeat-otp.vercel.app').replace(/\/$/, '');

export class OtpError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryIn?: number,
  ) {
    super(message);
  }
}

async function callOtp(path: string, body: Record<string, string>): Promise<any> {
  if (!OTP_API) throw new OtpError('Login is not set up yet. Please try again later.', 'not_configured');
  let res: Response;
  try {
    res = await fetch(`${OTP_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new OtpError('No internet connection. Please check and try again.', 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OtpError(data.message || 'Something went wrong. Please try again.', data.error || 'error', data.retryIn);
  }
  return data;
}

/** Texts a login code. Resolves with seconds until a resend is allowed. */
export async function requestOtp(phone: string): Promise<number> {
  const data = await callOtp('/api/otp/send', { phone });
  return typeof data.resendIn === 'number' ? data.resendIn : 30;
}

/** Checks the code and signs in. */
export async function verifyOtp(phone: string, code: string): Promise<User> {
  if (!auth) throw new OtpError('Firebase is not configured.', 'not_configured');
  const data = await callOtp('/api/otp/verify', { phone, code });
  const cred = await signInWithCustomToken(auth, data.token);
  return cred.user;
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function adminSignIn(email: string, password: string): Promise<boolean> {
  if (!auth) throw new Error('Firebase is not configured.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return isAdmin(cred.user.uid);
}

export async function adminSignOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function isAdmin(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

// ------------------------------------------------------------- products

export interface ProductDoc {
  inStock: boolean;
  stockKg: number;
  prices: Record<string, number>;
  availableCutIds?: string[];
}

export function subscribeProducts(cb: (inventory: Record<string, InventoryItem>) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, 'products'),
    (snap) => {
      const inventory: Record<string, InventoryItem> = {};
      snap.forEach((d) => {
        const data = d.data() as ProductDoc;
        inventory[d.id] = {
          productId: d.id,
          inStock: data.inStock !== false,
          stockKg: typeof data.stockKg === 'number' ? data.stockKg : 0,
          availableCutIds: data.availableCutIds || [],
          prices: data.prices || {},
        };
      });
      cb(inventory);
    },
    (err) => console.warn('[backend] products listener', err.code),
  );
}

export async function adminUpdateProduct(
  productId: string,
  patch: Partial<Pick<ProductDoc, 'inStock' | 'stockKg' | 'availableCutIds'>>,
) {
  if (!db) return;
  await updateDoc(doc(db, 'products', productId), patch);
}

// --------------------------------------------------------------- orders

interface OrderItemDoc {
  productId: string;
  cutId: string;
  name: string;
  cutName: string;
  quantity: number;
  unitPrice: number;
  netWeight: string;
  grossWeight: string;
  isSkinless: boolean;
}

interface OrderDoc {
  id: string;
  customerUid: string;
  items: OrderItemDoc[];
  subtotal: number;
  deliveryFee: number;
  coldPackagingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: Order['paymentMethod'];
  fulfillment: 'delivery' | 'takeaway';
  deliveryMode: Order['deliveryMode'];
  slotLabel: string;
  eta: string;
  address: string;
  lat?: number;
  lng?: number;
  deliveryNote?: string;
  customerName?: string;
  customerPhone?: string;
  riderName?: string;
  riderPhone?: string;
  currentTempCelsius?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function toItemDoc(item: CartItem): OrderItemDoc {
  return {
    productId: item.product.id,
    cutId: item.selectedCut.id,
    name: item.product.name,
    cutName: item.selectedCut.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    netWeight: item.selectedCut.netWeight,
    grossWeight: item.selectedCut.grossWeight,
    isSkinless: item.isSkinless,
  };
}

// Rebuild the app's CartItem shape from the slim stored line.
function fromItemDoc(it: OrderItemDoc, i: number): CartItem {
  const product = PRODUCTS.find((p) => p.id === it.productId) || {
    ...PRODUCTS[0],
    id: it.productId,
    name: it.name,
  };
  const baseCutId = it.cutId.split('__')[0];
  const known = product.availableCuts.find((c) => c.id === baseCutId);
  const selectedCut: CutOption = {
    ...(known || product.availableCuts[0]),
    id: it.cutId,
    name: it.cutName,
    netWeight: it.netWeight,
    grossWeight: it.grossWeight,
  };
  return {
    cartItemId: `${it.cutId}-${i}`,
    product,
    selectedCut,
    isSkinless: it.isSkinless,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
  };
}

function fromOrderDoc(d: OrderDoc): Order {
  const created = d.createdAt?.toDate?.();
  return {
    id: d.id,
    items: (d.items || []).map(fromItemDoc),
    deliveryMode: d.deliveryMode,
    slotLabel: d.slotLabel,
    subtotal: d.subtotal,
    deliveryFee: d.deliveryFee,
    coldPackagingFee: d.coldPackagingFee,
    discount: d.discount,
    total: d.total,
    status: d.status,
    currentTempCelsius: d.currentTempCelsius,
    riderName: d.riderName,
    riderPhone: d.riderPhone,
    placedAt: created
      ? created.toLocaleString([], {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Just now',
    createdAtMs: created ? created.getTime() : Date.now(),
    eta: d.eta,
    address: d.address,
    lat: typeof d.lat === 'number' ? d.lat : undefined,
    lng: typeof d.lng === 'number' ? d.lng : undefined,
    deliveryNote: d.deliveryNote,
    paymentMethod: d.paymentMethod,
    customerName: d.customerName,
    customerPhone: d.customerPhone,
  };
}

function subscribeOrderQuery(q: ReturnType<typeof query>, cb: (orders: Order[]) => void): Unsubscribe {
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => fromOrderDoc(d.data() as OrderDoc))),
    (err) => console.warn('[backend] orders listener', err.code),
  );
}

export function subscribeMyOrders(uid: string, cb: (orders: Order[]) => void): Unsubscribe {
  if (!db) return () => {};
  return subscribeOrderQuery(
    query(collection(db, 'orders'), where('customerUid', '==', uid), orderBy('createdAt', 'desc')),
    cb,
  );
}

export function subscribeAllOrders(cb: (orders: Order[]) => void): Unsubscribe {
  if (!db) return () => {};
  return subscribeOrderQuery(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), cb);
}

// Real coordinates only (the app's placeholder location is 0,0).
export function validCoords(lat?: number, lng?: number): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function newOrderId(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `MM-${Date.now().toString(36).toUpperCase()}${rand}`;
}

export interface NewOrderInput {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  coldPackagingFee: number;
  total: number;
  fulfillment: 'delivery' | 'takeaway';
  deliveryMode: Order['deliveryMode'];
  slotLabel: string;
  eta: string;
  address: string;
  deliveryNote?: string;
  customerName?: string;
  customerPhone?: string;
  lat?: number;
  lng?: number;
}

// Firestore rules re-check every price, fee and total in this document.
export async function createOrder(input: NewOrderInput): Promise<void> {
  if (!db) throw new Error('Firebase is not configured.');
  const user = currentUser();
  if (!user) throw new Error('Please log in again to place your order.');
  const data: Record<string, unknown> = {
    id: input.id,
    customerUid: user.uid,
    items: input.items.map(toItemDoc),
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    coldPackagingFee: input.coldPackagingFee,
    discount: 0,
    total: input.total,
    status: 'placed',
    paymentMethod: 'Cash on Delivery',
    fulfillment: input.fulfillment,
    deliveryMode: input.deliveryMode,
    slotLabel: input.slotLabel,
    eta: input.eta,
    address: input.address,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.deliveryNote) data.deliveryNote = input.deliveryNote.slice(0, 300);
  if (input.customerName) data.customerName = input.customerName.slice(0, 80);
  if (input.customerPhone) data.customerPhone = input.customerPhone.slice(0, 20);
  if (validCoords(input.lat, input.lng)) {
    data.lat = input.lat;
    data.lng = input.lng;
  }
  await setDoc(doc(db, 'orders', input.id), data);
}

export async function cancelMyOrder(orderId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

export async function adminUpdateOrder(
  orderId: string,
  patch: {
    status?: OrderStatus;
    riderName?: string;
    riderPhone?: string;
    currentTempCelsius?: number;
  },
): Promise<void> {
  if (!db) return;
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  await updateDoc(doc(db, 'orders', orderId), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
}

// -------------------------------------------------------------- profile

export interface UserProfile {
  name: string;
  phone: string;
  email?: string;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  if (!db) return;
  const user = currentUser();
  if (!user) return;
  const data: Record<string, unknown> = {
    name: profile.name.slice(0, 80),
    phone: profile.phone.slice(0, 20),
    updatedAt: serverTimestamp(),
  };
  if (profile.email) data.email = profile.email.slice(0, 120);
  await setDoc(doc(db, 'users', user.uid), data);
}

export async function fetchProfile(): Promise<UserProfile | null> {
  if (!db || !auth?.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch {
    return null;
  }
}
