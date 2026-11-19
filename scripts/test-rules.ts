// Firestore rules tests. Run with:
//   npm run test:rules
// (starts the Firestore emulator, needs Java 21+).
import assert from 'node:assert/strict';
import { initializeApp as initClientApp, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  serverTimestamp,
  setLogLevel,
  type Firestore,
} from 'firebase/firestore';
import { initializeApp as initAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from '../src/data/mockData';
import { priceTableFor, packVariantsFor, cutForPack } from '../src/data/pricing';

setLogLevel('error');

const chicken = PRODUCTS.find((p) => p.netWeight === '500g')!;
const prices = priceTableFor(chicken);
const baseCut = chicken.availableCuts[0];

function line(cutId: string, quantity = 1, unitPrice = prices[cutId]) {
  return {
    productId: chicken.id,
    cutId,
    name: chicken.name,
    cutName: 'Curry cut',
    quantity,
    unitPrice,
    netWeight: '500g',
    grossWeight: '600g',
    isSkinless: true,
  };
}

function order(uid: string, id: string, items = [line(baseCut.id, 2)], overrides: Record<string, unknown> = {}) {
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const mode = (overrides.deliveryMode as string) ?? 'slot';
  const deliveryFee = mode === 'instant' ? 49 : subtotal < 499 ? 35 : 0;
  return {
    id,
    customerUid: uid,
    items,
    subtotal,
    deliveryFee,
    coldPackagingFee: 0,
    discount: 0,
    total: subtotal + deliveryFee,
    status: 'placed',
    paymentMethod: 'Cash on Delivery',
    fulfillment: 'delivery',
    deliveryMode: mode,
    slotLabel: mode === 'instant' ? 'Express · about 30 mins' : 'Normal · 60–90 mins',
    eta: mode === 'instant' ? '30 mins' : 'in 60–90 mins',
    address: 'Flat 1, Test Street, Raipur',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

const PROJECT = 'demo-magicmeat';
const apps: FirebaseApp[] = [];

// A Firestore client signed in as `uid` (or signed out), using the
// emulator's unsigned mock tokens.
function clientAs(uid: string | null): Firestore {
  const app = initClientApp({ projectId: PROJECT, apiKey: 'test' }, `app-${uid ?? 'anon'}`);
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, uid ? { mockUserToken: { user_id: uid } } : undefined);
  return db;
}

async function assertSucceeds(p: Promise<unknown>) {
  await p;
}

async function assertFails(p: Promise<unknown>) {
  try {
    await p;
  } catch (e: any) {
    if (e?.code === 'permission-denied') return;
    throw e;
  }
  throw new Error('Expected permission-denied, but the request succeeded');
}

let passed = 0;
async function test(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function main() {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  initAdminApp({ projectId: PROJECT });
  const privileged = getAdminFirestore();
  await privileged.recursiveDelete(privileged.collection('orders'));
  await privileged.doc(`products/${chicken.id}`).set({ prices, inStock: true, stockKg: 20 });
  await privileged.doc('products/oos').set({ prices: { x: 100 }, inStock: false, stockKg: 0 });
  await privileged.doc('admins/admin1').set({ email: 'admin@test' });

  const alice = clientAs('alice');
  const bob = clientAs('bob');
  const admin = clientAs('admin1');
  const anon = clientAs(null);

  console.log('products');
  await test('anyone can read products', () => assertSucceeds(getDoc(doc(anon, 'products', chicken.id))));
  await test('customer cannot change a price', () =>
    assertFails(updateDoc(doc(alice, 'products', chicken.id), { prices: { [baseCut.id]: 1 } })));
  await test('admin can change stock', () =>
    assertSucceeds(updateDoc(doc(admin, 'products', chicken.id), { stockKg: 19 })));

  console.log('orders: create');
  await test('valid order is accepted', () => assertSucceeds(setDoc(doc(alice, 'orders', 'MM-AAA111'), order('alice', 'MM-AAA111'))));
  const packs = packVariantsFor(chicken);
  const kgCut = cutForPack(chicken, baseCut, packs[1], false);
  await test('1 kg pack at its table price is accepted', () =>
    assertSucceeds(setDoc(doc(alice, 'orders', 'MM-AAA112'), order('alice', 'MM-AAA112', [line(kgCut.id, 1)]))));
  await test('lowered unit price is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA113'), order('alice', 'MM-AAA113', [line(baseCut.id, 2, 1)]))));
  await test('wrong total is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA114'), order('alice', 'MM-AAA114', undefined, { total: 10 }))));
  await test('skipped delivery fee is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA115'), order('alice', 'MM-AAA115', [line(baseCut.id, 1)], { deliveryFee: 0, total: prices[baseCut.id] }))));
  const bigOrder = [line(kgCut.id, 3)];
  await test('express order with its fee is accepted', () =>
    assertSucceeds(setDoc(doc(alice, 'orders', 'MM-AAA11A'), order('alice', 'MM-AAA11A', bigOrder, { deliveryMode: 'instant' }))));
  await test('express fee waived above the threshold is rejected', () => {
    const sub = bigOrder.reduce((n, it) => n + it.unitPrice * it.quantity, 0);
    return assertFails(setDoc(doc(alice, 'orders', 'MM-AAA11B'), order('alice', 'MM-AAA11B', bigOrder, { deliveryMode: 'instant', deliveryFee: 0, total: sub })));
  });
  await test('cold pack fee is rejected', () => {
    const o = order('alice', 'MM-AAA11C');
    return assertFails(setDoc(doc(alice, 'orders', 'MM-AAA11C'), { ...o, coldPackagingFee: 15, total: (o.total as number) + 15 }));
  });
  await test('unknown cut id is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA116'), order('alice', 'MM-AAA116', [line('free-cut', 1, 0)]))));
  await test('out-of-stock product is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA117'), order('alice', 'MM-AAA117', [{ ...line('x', 1, 100), productId: 'oos' }]))));
  await test('order for another user is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA118'), order('bob', 'MM-AAA118'))));
  await test('order that starts as delivered is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA119'), order('alice', 'MM-AAA119', undefined, { status: 'delivered' }))));
  await test('7 lines are rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA120'), order('alice', 'MM-AAA120', Array.from({ length: 7 }, () => line(baseCut.id, 1))))));
  await test('6 lines are accepted', () =>
    assertSucceeds(setDoc(doc(alice, 'orders', 'MM-AAA121'), order('alice', 'MM-AAA121', Array.from({ length: 6 }, () => line(baseCut.id, 1))))));
  await test('6 lines of 20 units each are accepted', () =>
    assertSucceeds(setDoc(doc(alice, 'orders', 'MM-AAA123'), order('alice', 'MM-AAA123', Array.from({ length: 6 }, () => line(baseCut.id, 20))))));
  await test('quantity above 20 is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA124'), order('alice', 'MM-AAA124', [line(baseCut.id, 21)]))));
  await test('extra field on a line is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA125'), order('alice', 'MM-AAA125', [{ ...line(baseCut.id, 1), discount: 50 } as any]))));
  await test('signed-out visitor cannot order', () =>
    assertFails(setDoc(doc(anon, 'orders', 'MM-AAA122'), order('alice', 'MM-AAA122'))));
  await test('overwriting an existing order is rejected', () =>
    assertFails(setDoc(doc(alice, 'orders', 'MM-AAA111'), order('alice', 'MM-AAA111'))));

  console.log('orders: read and update');
  await test('owner reads own order', () => assertSucceeds(getDoc(doc(alice, 'orders', 'MM-AAA111'))));
  await test('another customer cannot read it', () => assertFails(getDoc(doc(bob, 'orders', 'MM-AAA111'))));
  await test('admin reads any order', () => assertSucceeds(getDoc(doc(admin, 'orders', 'MM-AAA111'))));
  await test('owner cannot mark own order delivered', () =>
    assertFails(updateDoc(doc(alice, 'orders', 'MM-AAA111'), { status: 'delivered', updatedAt: serverTimestamp() })));
  await test('owner cannot change the total', () =>
    assertFails(updateDoc(doc(alice, 'orders', 'MM-AAA111'), { total: 1, updatedAt: serverTimestamp() })));
  await test('owner cancels a placed order', () =>
    assertSucceeds(updateDoc(doc(alice, 'orders', 'MM-AAA112'), { status: 'cancelled', updatedAt: serverTimestamp() })));
  await test('admin moves an order along', () =>
    assertSucceeds(updateDoc(doc(admin, 'orders', 'MM-AAA111'), { status: 'butcher_prepping', updatedAt: serverTimestamp() })));
  await test('owner cannot cancel once the butcher started', () =>
    assertFails(updateDoc(doc(alice, 'orders', 'MM-AAA111'), { status: 'cancelled', updatedAt: serverTimestamp() })));
  await test('admin cannot rewrite prices on an order', () =>
    assertFails(updateDoc(doc(admin, 'orders', 'MM-AAA111'), { total: 1, updatedAt: serverTimestamp() })));

  console.log('users and admins');
  const profile = { name: 'Asha', phone: '9876543210', updatedAt: serverTimestamp() };
  await test('user writes own profile', () => assertSucceeds(setDoc(doc(alice, 'users', 'alice'), profile)));
  await test('user cannot write someone else', () => assertFails(setDoc(doc(bob, 'users', 'alice'), profile)));
  await test('profile cannot carry a wallet balance', () =>
    assertFails(setDoc(doc(alice, 'users', 'alice'), { ...profile, walletBalance: 9999 })));
  await test('another user cannot read a profile', () => assertFails(getDoc(doc(bob, 'users', 'alice'))));
  await test('nobody can make themselves admin', () => assertFails(setDoc(doc(alice, 'admins', 'alice'), { email: 'x' })));

  await Promise.all(apps.map((a) => deleteApp(a)));
  assert.ok(passed > 0);
  console.log(`\n${passed} rules tests passed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
