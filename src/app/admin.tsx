import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { goBack } from '../utils/navigation';
import { notify, confirmAction } from '../utils/dialogs';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { adminSignIn, adminSignOut, validCoords } from '../services/backend';
import { orderLabel } from '../utils/orderId';
import { PRODUCTS } from '../data/mockData';
import type { Order, Product } from '../types';
import {
  AppIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Alert02Icon,
  Call02Icon,
  Cancel01Icon,
  ChefHatIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  FlashIcon,
  Location01Icon,
  MapsIcon,
  MinusSignIcon,
  Motorbike01Icon,
  Note01Icon,
  PackageIcon,
  PlusSignIcon,
  Search01Icon,
  Store01Icon,
  Tick02Icon,
} from '../components/HugeIcon';

// Store admin.
//  · Today card (Stripe Dashboard): sales, orders and deliveries at a glance.
//  · Orders grouped by stage (Linear), each a card with its next action
//    (Uber Eats Orders: Reject / Accept on new orders, waiting time).
//  · Order details in a sheet with a step timeline (IKEA order details).
//  · Stock grouped by category with low / out filters (Shopify Inventory).

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
  hairline: '#E8E8ED',
  fill: '#F2F2F7',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  green: '#16A34A',
  greenDark: '#15803D',
  greenSoft: '#F0FDF4',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  purple: '#7E22CE',
  purpleSoft: '#FAF5FF',
};

const LOW_STOCK_KG = 5;

type Stage = 'new' | 'preparing' | 'packed' | 'on_way' | 'delivered' | 'cancelled';

const STAGES: {
  key: Exclude<Stage, 'delivered' | 'cancelled'>;
  title: string;
  color: string;
  soft: string;
  icon: any;
}[] = [
  { key: 'new', title: 'New', color: C.red, soft: C.redSoft, icon: Alert02Icon },
  { key: 'preparing', title: 'Preparing', color: C.blue, soft: C.blueSoft, icon: ChefHatIcon },
  { key: 'packed', title: 'Packed, needs a rider', color: C.amber, soft: C.amberSoft, icon: PackageIcon },
  { key: 'on_way', title: 'On the way', color: C.purple, soft: C.purpleSoft, icon: Motorbike01Icon },
];

const TIMELINE: { key: Stage; title: string }[] = [
  { key: 'new', title: 'Order received' },
  { key: 'preparing', title: 'Cutting and cleaning' },
  { key: 'packed', title: 'Packed' },
  { key: 'on_way', title: 'Out with rider' },
  { key: 'delivered', title: 'Delivered' },
];

function stageOf(o: Order): Stage {
  switch (o.status) {
    case 'placed':
      return 'new';
    case 'butcher_prepping':
      return 'preparing';
    case 'cold_packed':
      return 'packed';
    case 'rider_assigned':
    case 'out_for_delivery':
      return 'on_way';
    case 'delivered':
      return 'delivered';
    default:
      return 'cancelled';
  }
}

const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';
const itemCount = (o: Order) => o.items.reduce((n, i) => n + i.quantity, 0);
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function minutesSince(ms: number | undefined, now: number): number | null {
  if (!ms) return null;
  return Math.max(0, Math.round((now - ms) / 60000));
}

function ago(mins: number | null): string {
  if (mins === null) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hr ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
  return `${Math.floor(h / 24)} d`;
}

/* ================================================================ login */

// Staff sign in with an email account that has an admins/{uid} document
// (see scripts/make-admin.ts). Firestore rules enforce the same check.
function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ok = await adminSignIn(email, password);
      if (!ok) {
        setError('This account is not a store admin.');
        await adminSignOut();
      }
    } catch (e: any) {
      const code = e?.code || '';
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Wrong email or password.'
          : 'Could not sign in. Check your connection.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginSafe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.loginNav}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => goBack('/profile-menu')}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.loginBadge}>
            <AppIcon icon={Store01Icon} size={26} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.loginTitle}>Store admin</Text>
          <Text style={styles.loginSub}>Sign in with your MagicMeat staff account to manage orders and stock.</Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.field}
            placeholder="you@magicmeat.in"
            placeholderTextColor={C.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.field}
            placeholder="Password"
            placeholderTextColor={C.tertiary}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {!!error && <Text style={styles.loginError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.bigBtn, { marginTop: 22 }, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.bigBtnText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 18, alignSelf: 'center' }}>
            <Text style={styles.mutedLink}>Back to the shop</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ============================================================ order card */

function OrderCard({
  order,
  now,
  onOpen,
  onAdvance,
  onReject,
  busy,
}: {
  order: Order;
  now: number;
  onOpen: () => void;
  onAdvance: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const stage = stageOf(order);
  const waited = minutesSince(order.createdAtMs, now);
  const late = stage === 'new' && waited !== null && waited >= 10;
  const slow = stage === 'new' && waited !== null && waited >= 5 && !late;
  const express = order.deliveryMode === 'instant';
  const thumbs = order.items.slice(0, 3);

  const primary: Record<string, { label: string; style: object }> = {
    new: { label: 'Accept', style: styles.btnRed },
    preparing: { label: 'Packed · Send with rider', style: styles.btnDark },
    packed: { label: 'Send with rider', style: styles.btnDark },
    on_way: { label: 'Mark as delivered', style: styles.btnGreen },
  };
  const action = primary[stage];

  return (
    <View style={styles.orderCard}>
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open order ${order.id}`}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {order.customerName || 'Customer'}
          </Text>
          <Text style={styles.cardTotal}>{rupees(order.total)}</Text>
        </View>

        <View style={styles.cardMetaRow}>
          <Text style={styles.cardId}>{orderLabel(order.id)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <AppIcon icon={Clock01Icon} size={12} color={late ? C.red : slow ? C.amber : C.secondary} strokeWidth={2.2} />
          <Text
            style={[
              styles.cardMeta,
              late && { color: C.red, fontWeight: '700' },
              slow && { color: C.amber, fontWeight: '700' },
            ]}
          >
            {stage === 'new' ? `Waiting ${ago(waited)}` : `${ago(waited)} ago`}
          </Text>
        </View>

        <View style={styles.itemsRow}>
          <View style={[styles.thumbs, { width: 30 + (thumbs.length - 1) * 18 }]}>
            {thumbs.map((it, i) => (
              <Image
                key={`${order.id}-${i}`}
                source={{ uri: optimizeImageUrl(it.product.image, 80) }}
                style={[styles.thumb, { left: i * 18, zIndex: 3 - i }]}
              />
            ))}
          </View>
          <Text style={styles.itemsText} numberOfLines={2}>
            {order.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}
          </Text>
        </View>

        <View style={styles.tags}>
          <View style={[styles.tag, express ? styles.tagExpress : null]}>
            {express && <AppIcon icon={FlashIcon} size={11} color={C.red} strokeWidth={2.4} />}
            <Text style={[styles.tagText, express && { color: C.red }]}>{express ? 'Express' : 'Normal'}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {itemCount(order)} item{itemCount(order) === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Pay on delivery</Text>
          </View>
          {!!order.deliveryNote && (
            <View style={[styles.tag, { backgroundColor: C.amberSoft }]}>
              <AppIcon icon={Note01Icon} size={11} color={C.amber} strokeWidth={2.4} />
              <Text style={[styles.tagText, { color: C.amber }]}>Note</Text>
            </View>
          )}
          {stage === 'on_way' && !!order.riderName && (
            <View style={[styles.tag, { backgroundColor: C.purpleSoft }]}>
              <AppIcon icon={Motorbike01Icon} size={11} color={C.purple} strokeWidth={2.4} />
              <Text style={[styles.tagText, { color: C.purple }]}>{order.riderName}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {action && (
        <View style={styles.cardActions}>
          {stage === 'new' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={onReject}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Reject order ${order.id}`}
            >
              <Text style={[styles.btnText, { color: C.text }]}>Reject</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, action.style, { flex: 1 }, busy && { opacity: 0.6 }]}
            onPress={onAdvance}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>{action.label}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ================================================================ screen */

export default function AdminScreen() {
  const { isAdmin, orders, inventory, updateOrderStatus, cancelOrder, assignRider, toggleStock, updateStockKg } =
    useStore();

  const [tab, setTab] = useState<'orders' | 'stock' | 'riders'>('orders');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [rider, setRider] = useState({ name: '', phone: '' });
  const [showDone, setShowDone] = useState(false);
  // Order id → status it had when a button was tapped. The button shows a
  // spinner until the live update arrives with a different status, so one
  // tap is enough and double taps can't skip a step.
  const [pending, setPending] = useState<Record<string, string>>({});
  const isBusy = (o: Order) => pending[o.id] === o.status;
  const markPending = (o: Order) => setPending((p) => ({ ...p, [o.id]: o.status }));
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [now, setNow] = useState(() => Date.now());

  // Keep waiting times fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!isAdmin) return <AdminLogin />;

  /* ------------------------------------------------------------ numbers */
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const isToday = (o: Order) => (o.createdAtMs ?? 0) >= startOfToday.getTime();
  const todays = orders.filter((o) => isToday(o) && o.status !== 'cancelled');
  const sales = todays.reduce((s, o) => s + (o.total || 0), 0);
  const deliveredToday = todays.filter((o) => o.status === 'delivered').length;
  const active = orders.filter(isActive);
  const done = orders.filter((o) => !isActive(o)).slice(0, 20);

  const stockOf = (p: Product) =>
    inventory[p.id] || { productId: p.id, inStock: true, stockKg: 0, availableCutIds: [] as string[] };
  const isOut = (p: Product) => {
    const inv = inventory[p.id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  };
  const isLow = (p: Product) => !isOut(p) && stockOf(p).stockKg <= LOW_STOCK_KG;
  const outCount = PRODUCTS.filter(isOut).length;
  const lowCount = PRODUCTS.filter(isLow).length;

  const recentRiders = (() => {
    const seen = new Map<string, { name: string; phone: string }>();
    for (const o of orders) {
      if (o.riderName && o.riderPhone && !seen.has(o.riderPhone))
        seen.set(o.riderPhone, { name: o.riderName, phone: o.riderPhone });
    }
    return [...seen.values()].slice(0, 6);
  })();
  const onRoad = orders.filter((o) => stageOf(o) === 'on_way');

  const today = new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const detail = orders.find((o) => o.id === detailId) || null;
  const assigning = orders.find((o) => o.id === assignId) || null;

  /* ------------------------------------------------------------ actions */
  const openAssign = (order: Order) => {
    setRider(recentRiders[0] ? { ...recentRiders[0] } : { name: '', phone: '' });
    setDetailId(null);
    setAssignId(order.id);
  };

  const advance = (order: Order) => {
    const stage = stageOf(order);
    // Three steps for staff: Accept → Send with rider (packing is part of
    // it) → Delivered.
    if (isBusy(order)) return;
    if (stage === 'new') {
      markPending(order);
      updateOrderStatus(order.id, 'butcher_prepping');
    } else if (stage === 'preparing' || stage === 'packed') openAssign(order);
    else if (stage === 'on_way') {
      markPending(order);
      updateOrderStatus(order.id, 'delivered');
    }
  };

  const reject = (order: Order) =>
    confirmAction(
      stageOf(order) === 'new' ? 'Reject this order?' : 'Cancel this order?',
      `Order ${orderLabel(order.id)} will be cancelled and ${order.customerName || 'the customer'} will see it.`,
      stageOf(order) === 'new' ? 'Reject' : 'Cancel order',
      () => {
        cancelOrder(order.id);
        setDetailId(null);
      },
      'Keep',
    );

  const sendWithRider = () => {
    if (!assigning) return;
    if (!rider.name.trim()) return notify('Rider needed', 'Enter the rider’s name.');
    if (!isValidPhone(rider.phone)) return notify('Rider needed', 'Enter the rider’s 10-digit mobile number.');
    markPending(assigning);
    assignRider(assigning.id, rider.name.trim(), cleanPhone(rider.phone));
    setAssignId(null);
  };

  const signOut = () =>
    confirmAction('Sign out?', 'You’ll need your password to sign in again.', 'Sign out', () => {
      adminSignOut().finally(() => router.replace('/login'));
    });

  // Turn-by-turn from wherever this phone is now (Google Maps uses the
  // device's current location as the start) to the pin the customer chose;
  // older orders without a pin fall back to the address text.
  const openDirections = (order: Order) => {
    const destination = validCoords(order.lat, order.lng)
      ? `${order.lat},${order.lng}`
      : encodeURIComponent(order.address);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=two-wheeler`);
  };

  /* ------------------------------------------------------------- stock */
  const q = search.trim().toLowerCase();
  const stockList = PRODUCTS.filter((p) => {
    if (stockFilter === 'out' && !isOut(p)) return false;
    if (stockFilter === 'low' && !isLow(p)) return false;
    return !q || p.name.toLowerCase().includes(q) || p.category.includes(q);
  });
  const CATEGORY_TITLES: Record<string, string> = {
    chicken: 'Chicken',
    mutton: 'Mutton',
    fish: 'Fish',
    eggs: 'Eggs',
    'ready-to-cook': 'Ready to cook',
    'fresh-produce': 'Vegetables',
  };
  const stockGroups = Object.keys(CATEGORY_TITLES)
    .map((cat) => ({ cat, items: stockList.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  /* ------------------------------------------------------------ render */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* 0 · header */}
        <View style={styles.header}>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => goBack('/profile-menu')}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Store open</Text>
            </View>
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut} accessibilityRole="button">
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.largeTitle}>Today</Text>
          <Text style={styles.dateText}>{today}</Text>

          <View style={styles.todayCard}>
            <View style={styles.todayCell}>
              <Text style={styles.todayLabel}>Sales</Text>
              <Text style={styles.todayValue} numberOfLines={1} adjustsFontSizeToFit>
                {rupees(sales)}
              </Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayCell}>
              <Text style={styles.todayLabel}>Orders</Text>
              <Text style={styles.todayValue}>{todays.length}</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayCell}>
              <Text style={styles.todayLabel}>Delivered</Text>
              <Text style={[styles.todayValue, { color: C.greenDark }]}>{deliveredToday}</Text>
            </View>
          </View>

          {outCount > 0 && (
            <TouchableOpacity
              style={styles.alertRow}
              onPress={() => {
                setTab('stock');
                setStockFilter('out');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <View style={styles.alertIcon}>
                <AppIcon icon={Alert02Icon} size={16} color={C.red} strokeWidth={2.2} />
              </View>
              <Text style={styles.alertText}>
                <Text style={{ fontWeight: '700' }}>
                  {outCount} item{outCount === 1 ? '' : 's'} out of stock
                </Text>{' '}
                · customers can’t order {outCount === 1 ? 'it' : 'them'}
              </Text>
              <AppIcon icon={ArrowRight01Icon} size={16} color={C.tertiary} strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>

        {/* 1 · sticky segmented control */}
        <View style={styles.segmentWrap}>
          <View style={styles.segmented}>
            {(
              [
                { key: 'orders', label: 'Orders', n: active.length },
                { key: 'stock', label: 'Stock', n: outCount },
                { key: 'riders', label: 'Riders', n: onRoad.length },
              ] as const
            ).map((s) => {
              const on = tab === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.segment, on && styles.segmentOn]}
                  onPress={() => setTab(s.key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                    {s.label}
                    {s.n > 0 ? ` ${s.n}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2 · content */}
        <View style={styles.body}>
          {/* ======================================================== orders */}
          {tab === 'orders' && (
            <>
              {active.length === 0 && (
                <View style={styles.caughtUp}>
                  <View style={styles.caughtIcon}>
                    <AppIcon icon={Tick02Icon} size={26} color={C.green} strokeWidth={2.6} />
                  </View>
                  <Text style={styles.caughtTitle}>All caught up</Text>
                  <Text style={styles.caughtSub}>New orders show up here the moment they’re placed.</Text>
                </View>
              )}

              {STAGES.map((s) => {
                const list = active.filter((o) => stageOf(o) === s.key).reverse();
                if (list.length === 0) return null;
                return (
                  <View key={s.key} style={styles.section}>
                    <View style={styles.sectionHead}>
                      <View style={[styles.sectionIcon, { backgroundColor: s.soft }]}>
                        <AppIcon icon={s.icon} size={14} color={s.color} strokeWidth={2.2} />
                      </View>
                      <Text style={styles.sectionTitle}>{s.title}</Text>
                      <Text style={styles.sectionCount}>{list.length}</Text>
                    </View>
                    {list.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        now={now}
                        onOpen={() => setDetailId(o.id)}
                        onAdvance={() => advance(o)}
                        onReject={() => reject(o)}
                        busy={isBusy(o)}
                      />
                    ))}
                  </View>
                );
              })}

              {done.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHead}
                    onPress={() => setShowDone((v) => !v)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showDone }}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: C.greenSoft }]}>
                      <AppIcon icon={CheckmarkCircle02Icon} size={14} color={C.green} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.sectionTitle}>Completed</Text>
                    <Text style={styles.sectionCount}>{done.length}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.sectionLink}>{showDone ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                  {showDone && (
                    <View style={styles.group}>
                      {done.map((o, i) => {
                        const delivered = o.status === 'delivered';
                        return (
                          <TouchableOpacity
                            key={o.id}
                            style={[styles.doneRow, i > 0 && styles.rowBorder]}
                            onPress={() => setDetailId(o.id)}
                            activeOpacity={0.6}
                          >
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.doneName} numberOfLines={1}>
                                {o.customerName || 'Customer'}
                              </Text>
                              <Text style={styles.doneMeta} numberOfLines={1}>
                                {orderLabel(o.id)} · {o.placedAt}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.doneTotal}>{rupees(o.total)}</Text>
                              <Text style={[styles.doneStatus, { color: delivered ? C.greenDark : C.secondary }]}>
                                {delivered ? 'Delivered' : 'Cancelled'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* ========================================================= stock */}
          {tab === 'stock' && (
            <>
              <View style={styles.searchField}>
                <AppIcon icon={Search01Icon} size={17} color={C.tertiary} strokeWidth={2.2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products"
                  placeholderTextColor={C.tertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                />
                {!!search && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AppIcon icon={Cancel01Icon} size={16} color={C.tertiary} strokeWidth={2.2} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterRow}>
                {(
                  [
                    { key: 'all', label: 'All', n: PRODUCTS.length },
                    { key: 'low', label: 'Low', n: lowCount },
                    { key: 'out', label: 'Out of stock', n: outCount },
                  ] as const
                ).map((f) => {
                  const on = stockFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filter, on && styles.filterOn]}
                      onPress={() => setStockFilter(f.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, on && styles.filterTextOn]}>
                        {f.label} {f.n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {stockGroups.length === 0 ? (
                <View style={styles.caughtUp}>
                  <Text style={styles.caughtTitle}>
                    {stockFilter === 'out'
                      ? 'Everything is in stock'
                      : stockFilter === 'low'
                        ? 'Nothing is running low'
                        : 'No products found'}
                  </Text>
                </View>
              ) : (
                stockGroups.map((g) => (
                  <View key={g.cat} style={styles.section}>
                    <Text style={styles.groupTitle}>{CATEGORY_TITLES[g.cat].toUpperCase()}</Text>
                    <View style={styles.group}>
                      {g.items.map((p, i) => {
                        const inv = stockOf(p);
                        const out = isOut(p);
                        const low = isLow(p);
                        return (
                          <View key={p.id} style={[styles.stockRow, i > 0 && styles.rowBorder]}>
                            <Image
                              source={{ uri: optimizeImageUrl(p.image, 100) }}
                              style={[styles.stockThumb, out && { opacity: 0.35 }]}
                            />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.stockName} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={styles.stockMeta} numberOfLines={1}>
                                {rupees(p.basePrice)} · {p.netWeight}
                              </Text>
                              <View style={styles.stockControls}>
                                <View style={styles.kg}>
                                  <TouchableOpacity
                                    style={styles.kgBtn}
                                    onPress={() => updateStockKg(p.id, inv.stockKg - 5)}
                                    accessibilityLabel={`Remove 5 kg of ${p.name}`}
                                  >
                                    <AppIcon icon={MinusSignIcon} size={12} color={C.text} strokeWidth={2.6} />
                                  </TouchableOpacity>
                                  <Text style={styles.kgText}>{inv.stockKg} kg</Text>
                                  <TouchableOpacity
                                    style={styles.kgBtn}
                                    onPress={() => updateStockKg(p.id, inv.stockKg + 5)}
                                    accessibilityLabel={`Add 5 kg of ${p.name}`}
                                  >
                                    <AppIcon icon={PlusSignIcon} size={12} color={C.text} strokeWidth={2.6} />
                                  </TouchableOpacity>
                                </View>
                                {out ? (
                                  <Text style={[styles.stockState, { color: C.red }]}>Out of stock</Text>
                                ) : low ? (
                                  <Text style={[styles.stockState, { color: C.amber }]}>Running low</Text>
                                ) : null}
                              </View>
                            </View>
                            <Switch
                              value={!out}
                              onValueChange={() => toggleStock(p.id)}
                              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                              thumbColor="#FFFFFF"
                              accessibilityLabel={`${p.name} available`}
                              testID={`toggle-stock-${p.id}`}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
              <Text style={styles.footnote}>Turning an item on with 0 kg adds 5 kg so customers can order it.</Text>
            </>
          )}

          {/* ======================================================== riders */}
          {tab === 'riders' && (
            <>
              <View style={styles.section}>
                <Text style={styles.groupTitle}>ON DELIVERY</Text>
                {onRoad.length === 0 ? (
                  <View style={[styles.group, styles.groupEmpty]}>
                    <Text style={styles.emptyLine}>No rider is out right now.</Text>
                  </View>
                ) : (
                  <View style={styles.group}>
                    {onRoad.map((o, i) => (
                      <View key={o.id} style={[styles.riderRow, i > 0 && styles.rowBorder]}>
                        <View style={styles.riderAvatar}>
                          <Text style={styles.riderInitial}>{(o.riderName || '?')[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.stockName}>{o.riderName || 'Rider'}</Text>
                          <Text style={styles.stockMeta} numberOfLines={1}>
                            To {o.customerName || 'customer'} · collect {rupees(o.total)}
                          </Text>
                        </View>
                        {!!o.riderPhone && (
                          <TouchableOpacity
                            style={styles.roundAction}
                            onPress={() => Linking.openURL(`tel:+91${o.riderPhone}`)}
                            accessibilityLabel={`Call ${o.riderName}`}
                          >
                            <AppIcon icon={Call02Icon} size={17} color={C.green} strokeWidth={2.2} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.groupTitle}>RECENT RIDERS</Text>
                {recentRiders.length === 0 ? (
                  <View style={[styles.group, styles.groupEmpty]}>
                    <Text style={styles.emptyLine}>Riders you assign will be saved here for one-tap reuse.</Text>
                  </View>
                ) : (
                  <View style={styles.group}>
                    {recentRiders.map((r, i) => (
                      <View key={r.phone} style={[styles.riderRow, i > 0 && styles.rowBorder]}>
                        <View style={[styles.riderAvatar, { backgroundColor: C.fill }]}>
                          <Text style={[styles.riderInitial, { color: C.text }]}>{r.name[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.stockName}>{r.name}</Text>
                          <Text style={styles.stockMeta}>+91 {r.phone}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.roundAction}
                          onPress={() => Linking.openURL(`tel:+91${r.phone}`)}
                          accessibilityLabel={`Call ${r.name}`}
                        >
                          <AppIcon icon={Call02Icon} size={17} color={C.green} strokeWidth={2.2} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ================================================== order details */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetailId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDetailId(null)} accessibilityLabel="Close" />
        {detail && (
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Order {orderLabel(detail.id)}</Text>
                <Text style={styles.sheetSub}>
                  {detail.placedAt} ·{' '}
                  {detail.deliveryMode === 'instant' ? 'Express · 15–20 mins' : 'Normal · 45–60 mins'}
                </Text>
              </View>
              <TouchableOpacity style={styles.circleBtn} onPress={() => setDetailId(null)} accessibilityLabel="Close">
                <AppIcon icon={Cancel01Icon} size={18} color={C.text} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {/* timeline */}
              {stageOf(detail) === 'cancelled' ? (
                <View style={[styles.banner, { backgroundColor: C.fill }]}>
                  <Text style={styles.bannerText}>This order was cancelled.</Text>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {TIMELINE.map((t, i) => {
                    const cur = TIMELINE.findIndex((x) => x.key === stageOf(detail));
                    const doneStep = i < cur || stageOf(detail) === 'delivered';
                    const current = i === cur && stageOf(detail) !== 'delivered';
                    return (
                      <View key={t.key} style={styles.tlRow}>
                        <View style={styles.tlRail}>
                          <View style={[styles.tlDot, doneStep && styles.tlDotDone, current && styles.tlDotCurrent]}>
                            {doneStep && <AppIcon icon={Tick02Icon} size={10} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                          {i < TIMELINE.length - 1 && <View style={[styles.tlLine, doneStep && styles.tlLineDone]} />}
                        </View>
                        <Text
                          style={[
                            styles.tlText,
                            (doneStep || current) && { color: C.text },
                            current && { fontWeight: '800' },
                          ]}
                        >
                          {t.title}
                          {t.key === 'on_way' && detail.riderName ? ` · ${detail.riderName}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* customer */}
              <Text style={styles.groupTitle}>CUSTOMER</Text>
              <View style={[styles.group, { padding: 14 }]}>
                <Text style={styles.custName}>{detail.customerName || 'Customer'}</Text>
                {!!detail.customerPhone && <Text style={styles.custLine}>+91 {detail.customerPhone}</Text>}
                <View style={styles.addressRow}>
                  <AppIcon icon={Location01Icon} size={14} color={C.secondary} strokeWidth={2} />
                  <Text style={styles.addressText}>{detail.address}</Text>
                </View>
                <View style={styles.contactBtns}>
                  {!!detail.customerPhone && (
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => Linking.openURL(`tel:+91${detail.customerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <AppIcon icon={Call02Icon} size={16} color={C.green} strokeWidth={2.2} />
                      <Text style={styles.contactBtnText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.contactBtn}
                    onPress={() => openDirections(detail)}
                    activeOpacity={0.7}
                  >
                    <AppIcon icon={MapsIcon} size={16} color={C.blue} strokeWidth={2.2} />
                    <Text style={styles.contactBtnText}>Directions</Text>
                  </TouchableOpacity>
                </View>
                {!!detail.deliveryNote && (
                  <View style={styles.noteBox}>
                    <AppIcon icon={Note01Icon} size={14} color={C.amber} strokeWidth={2} />
                    <Text style={styles.noteText}>{detail.deliveryNote}</Text>
                  </View>
                )}
              </View>

              {/* items */}
              <Text style={styles.groupTitle}>ITEMS · {itemCount(detail)}</Text>
              <View style={styles.group}>
                {detail.items.map((it, i) => (
                  <View key={`${it.cartItemId}-${i}`} style={[styles.itemRow, i > 0 && styles.rowBorder]}>
                    <Image source={{ uri: optimizeImageUrl(it.product.image, 100) }} style={styles.itemThumb} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {it.product.name}
                      </Text>
                      <Text style={styles.itemCut} numberOfLines={1}>
                        {it.selectedCut.name}
                        {it.selectedCut.allowsSkinOption ? ` · ${it.isSkinless ? 'Skinless' : 'With skin'}` : ''}
                      </Text>
                    </View>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyText}>×{it.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* bill */}
              <Text style={styles.groupTitle}>PAYMENT</Text>
              <View style={[styles.group, { padding: 14, gap: 8 }]}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Items</Text>
                  <Text style={styles.billValue}>{rupees(detail.subtotal)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>
                    {detail.deliveryMode === 'instant' ? 'Express delivery' : 'Delivery'}
                  </Text>
                  <Text style={styles.billValue}>{detail.deliveryFee ? rupees(detail.deliveryFee) : 'Free'}</Text>
                </View>
                <View style={[styles.billRow, styles.billTotalRow]}>
                  <Text style={styles.billTotalLabel}>
                    {detail.status === 'delivered' ? 'Collected' : 'Collect on delivery'}
                  </Text>
                  <Text style={styles.billTotal}>{rupees(detail.total)}</Text>
                </View>
                <Text style={styles.billHint}>Cash or UPI</Text>
              </View>

              {isActive(detail) && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => reject(detail)} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>{stageOf(detail) === 'new' ? 'Reject order' : 'Cancel order'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {isActive(detail) && (
              <SafeAreaView edges={['bottom']} style={styles.sheetFooter}>
                <TouchableOpacity
                  style={[
                    styles.bigBtn,
                    stageOf(detail) === 'new' && { backgroundColor: C.red },
                    stageOf(detail) === 'on_way' && { backgroundColor: C.green },
                    isBusy(detail) && { opacity: 0.6 },
                  ]}
                  disabled={isBusy(detail)}
                  onPress={() => {
                    const s = stageOf(detail);
                    advance(detail);
                    if (s !== 'packed' && s !== 'preparing') setDetailId(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bigBtnText}>
                    {
                      {
                        new: 'Accept order',
                        preparing: 'Packed · Send with rider',
                        packed: 'Send with rider',
                        on_way: 'Mark as delivered',
                      }[stageOf(detail) as 'new' | 'preparing' | 'packed' | 'on_way']
                    }
                  </Text>
                </TouchableOpacity>
              </SafeAreaView>
            )}
          </View>
        )}
      </Modal>

      {/* ==================================================== assign rider */}
      <Modal visible={!!assigning} transparent animationType="slide" onRequestClose={() => setAssignId(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setAssignId(null)} accessibilityLabel="Close" />
          {assigning && (
            <View style={[styles.sheet, { maxHeight: undefined }]}>
              <View style={styles.grabber} />
              <View style={styles.sheetHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Assign a rider</Text>
                  <Text style={styles.sheetSub}>
                    {orderLabel(assigning.id)} · {assigning.customerName || 'Customer'} · collect{' '}
                    {rupees(assigning.total)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.circleBtn} onPress={() => setAssignId(null)} accessibilityLabel="Close">
                  <AppIcon icon={Cancel01Icon} size={18} color={C.text} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetBody}>
                {recentRiders.length > 0 && (
                  <>
                    <Text style={styles.groupTitle}>RECENT</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {recentRiders.map((r) => {
                        const on = rider.phone === r.phone;
                        return (
                          <TouchableOpacity
                            key={r.phone}
                            style={[styles.riderChip, on && styles.riderChipOn]}
                            onPress={() => setRider({ ...r })}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.riderChipText, on && { color: '#FFFFFF' }]}>{r.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                <Text style={styles.fieldLabel}>Rider name</Text>
                <TextInput
                  style={styles.field}
                  placeholder="e.g. Ramesh"
                  placeholderTextColor={C.tertiary}
                  value={rider.name}
                  onChangeText={(name) => setRider((r) => ({ ...r, name }))}
                  maxLength={60}
                />
                <Text style={styles.fieldLabel}>Rider mobile</Text>
                <TextInput
                  style={styles.field}
                  placeholder="10-digit number"
                  placeholderTextColor={C.tertiary}
                  keyboardType="phone-pad"
                  value={rider.phone}
                  onChangeText={(phone) => setRider((r) => ({ ...r, phone }))}
                  maxLength={14}
                />
                <Text style={styles.billHint}>The customer sees the rider’s name and can call this number.</Text>
              </View>

              <SafeAreaView edges={['bottom']} style={styles.sheetFooter}>
                <TouchableOpacity style={styles.bigBtn} onPress={sendWithRider} activeOpacity={0.85}>
                  <Text style={styles.bigBtnText}>Send with rider</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* header */
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    backgroundColor: C.greenSoft,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.greenDark,
  },
  signOutBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.secondary,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.8,
    marginTop: 14,
  },
  dateText: {
    fontSize: 15,
    color: C.secondary,
    marginTop: 2,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: C.card,
  },
  todayCell: {
    flex: 1,
    paddingHorizontal: 14,
  },
  todayDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.hairline,
  },
  todayLabel: {
    fontSize: 13,
    color: C.secondary,
    fontWeight: '600',
  },
  todayValue: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.card,
  },
  alertIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },

  /* segmented */
  segmentWrap: {
    backgroundColor: C.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 11,
    backgroundColor: '#E4E4EA',
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: C.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },
  segmentTextOn: {
    color: C.text,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
  },

  /* sections */
  section: {
    marginTop: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: C.tertiary,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: C.blue,
  },
  group: {
    borderRadius: 16,
    backgroundColor: C.card,
    overflow: 'hidden',
  },
  groupEmpty: {
    padding: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondary,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  emptyLine: {
    fontSize: 14,
    color: C.secondary,
  },

  /* order card */
  orderCard: {
    borderRadius: 18,
    backgroundColor: C.card,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  cardTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  cardId: {
    fontSize: 13,
    color: C.secondary,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 13,
    color: C.tertiary,
  },
  cardMeta: {
    fontSize: 13,
    color: C.secondary,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  thumbs: {
    height: 30,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: C.card,
    backgroundColor: C.fill,
  },
  itemsText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    lineHeight: 19,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: C.fill,
  },
  tagExpress: {
    backgroundColor: C.redSoft,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  btn: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnRed: {
    backgroundColor: C.red,
  },
  btnDark: {
    backgroundColor: C.text,
  },
  btnGreen: {
    backgroundColor: C.green,
  },
  btnGhost: {
    backgroundColor: C.fill,
  },

  /* completed */
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  doneName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  doneMeta: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  doneTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  doneStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  /* caught up */
  caughtUp: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  caughtIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  caughtTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  caughtSub: {
    fontSize: 14,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 4,
  },

  /* stock */
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: '#E4E4EA',
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: C.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filter: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  filterOn: {
    backgroundColor: C.text,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  filterTextOn: {
    color: '#FFFFFF',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stockThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: C.fill,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  stockMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  stockState: {
    fontSize: 12,
    fontWeight: '700',
  },
  kg: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
    backgroundColor: C.fill,
  },
  kgBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kgText: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  footnote: {
    fontSize: 12,
    color: C.tertiary,
    textAlign: 'center',
    marginTop: 16,
  },

  /* riders */
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  riderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: C.purple,
  },
  roundAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* sheets */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginTop: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  sheetSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  banner: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },

  /* timeline */
  timeline: {
    borderRadius: 16,
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  tlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tlRail: {
    alignItems: 'center',
    width: 18,
  },
  tlDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotDone: {
    borderColor: C.green,
    backgroundColor: C.green,
  },
  tlDotCurrent: {
    borderColor: C.red,
    borderWidth: 5,
  },
  tlLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  tlLineDone: {
    backgroundColor: C.green,
  },
  tlText: {
    flex: 1,
    fontSize: 15,
    color: C.tertiary,
    fontWeight: '600',
    paddingBottom: 14,
    marginTop: -1,
  },

  /* detail blocks */
  custName: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  custLine: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: C.secondary,
    lineHeight: 20,
  },
  contactBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.fill,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.amberSoft,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.fill,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  itemCut: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  qtyBadge: {
    minWidth: 36,
    height: 28,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontSize: 14,
    color: C.secondary,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  billTotalRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  billTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  billHint: {
    fontSize: 12,
    color: C.tertiary,
    marginTop: 6,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
  },
  riderChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  riderChipOn: {
    backgroundColor: C.text,
  },
  riderChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },

  /* shared */
  field: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginTop: 14,
    marginBottom: 6,
  },
  bigBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mutedLink: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },

  /* login */
  loginSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loginNav: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loginContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  loginBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 18,
  },
  loginSub: {
    fontSize: 15,
    color: C.secondary,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 8,
  },
  loginError: {
    fontSize: 14,
    fontWeight: '600',
    color: C.red,
    marginTop: 12,
  },
});
