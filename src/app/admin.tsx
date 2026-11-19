import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { goBack } from '../utils/navigation';
import { notify, confirmAction } from '../utils/dialogs';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { adminSignIn, adminSignOut } from '../services/backend';
import { PRODUCTS } from '../data/mockData';
import type { Order, OrderStatus } from '../types';
import {
  AppIcon,
  ArrowLeft01Icon,
  Search01Icon,
  DeliveryTruck01Icon,
  PlusSignIcon,
  MinusSignIcon,
  Call02Icon,
  Location01Icon,
  Note01Icon,
  BeefIcon,
} from '../components/HugeIcon';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  redBg: '#FEF2F2',
  green: '#16A34A',
  greenDark: '#15803D',
  greenBg: '#F0FDF4',
  amber: '#B45309',
  amberBg: '#FFFBEB',
};

const STATUS: Record<string, { label: string; color: string; bg: string; next?: string }> = {
  placed: { label: 'New', color: C.amber, bg: '#FEF3C7', next: 'Accept & start preparing' },
  butcher_prepping: { label: 'Preparing', color: '#1D4ED8', bg: '#EFF6FF', next: 'Mark packed' },
  cold_packed: { label: 'Packed', color: '#0F766E', bg: '#F0FDFA', next: 'Dispatch with rider' },
  rider_assigned: { label: 'Rider assigned', color: '#7E22CE', bg: '#FAF5FF', next: 'Mark delivered' },
  out_for_delivery: { label: 'On the way', color: '#7E22CE', bg: '#FAF5FF', next: 'Mark delivered' },
  delivered: { label: 'Delivered', color: C.greenDark, bg: C.greenBg },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: C.redBg },
};

type Filter = 'active' | OrderStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'placed', label: 'New' },
  { key: 'butcher_prepping', label: 'Preparing' },
  { key: 'cold_packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

function timeAgo(ms?: number): string {
  if (!ms) return '';
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
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
          : 'Could not sign in. Check your connection.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => goBack('/profile-menu')}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
        <View style={styles.loginBadge}>
          <AppIcon icon={BeefIcon} size={28} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={styles.loginTitle}>Store admin</Text>
        <Text style={styles.loginSub}>Sign in with your MagicMeat staff account.</Text>

        <View style={[styles.card, { alignSelf: 'stretch', marginTop: 24 }]}>
          <TextInput
            style={styles.loginInput}
            placeholder="Email"
            placeholderTextColor={C.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
          <View style={styles.divider} />
          <TextInput
            style={styles.loginInput}
            placeholder="Password"
            placeholderTextColor={C.placeholder}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </View>

        {!!error && <Text style={styles.loginError}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, { alignSelf: 'stretch', marginTop: 20 }, busy && { opacity: 0.7 }]}
          onPress={submit}
          disabled={busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 18 }}>
          <Text style={styles.link}>Back to the shop</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================================================================ screen */

export default function AdminScreen() {
  const { isAdmin, orders, inventory, updateOrderStatus, cancelOrder, assignRider, toggleStock, updateStockKg } =
    useStore();

  const [tab, setTab] = useState<'orders' | 'stock' | 'riders'>('orders');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [stockCat, setStockCat] = useState<'all' | 'chicken' | 'mutton' | 'fish' | 'eggs' | 'out'>('all');
  const [riderDrafts, setRiderDrafts] = useState<Record<string, { name: string; phone: string }>>({});

  const riderDraft = (orderId: string) => riderDrafts[orderId] || { name: '', phone: '' };
  const setRiderDraft = (orderId: string, patch: Partial<{ name: string; phone: string }>) =>
    setRiderDrafts((d) => ({ ...d, [orderId]: { ...riderDraft(orderId), ...patch } }));

  const activeOrders = orders.filter(isActive);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter((o) => o.status !== 'cancelled' && (o.createdAtMs ?? 0) >= startOfToday.getTime());
  const todayRevenue = todaysOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const deliveredToday = todaysOrders.filter((o) => o.status === 'delivered').length;
  const ridersOnRoad = orders.filter((o) => o.status === 'out_for_delivery' && o.riderName);
  const isOut = (id: string) => {
    const inv = inventory[id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  };
  const outOfStockCount = PRODUCTS.filter((p) => isOut(p.id)).length;

  const countFor = (key: Filter) =>
    key === 'all' ? orders.length : key === 'active' ? activeOrders.length : orders.filter((o) => o.status === key).length;

  // Active work is shown oldest first so the earliest order goes out first.
  const visibleOrders = (() => {
    if (filter === 'all') return orders;
    if (filter === 'active') return [...activeOrders].reverse();
    const list = orders.filter((o) => o.status === filter);
    return isActive({ status: filter } as Order) ? [...list].reverse() : list;
  })();

  const query = search.trim().toLowerCase();
  const visibleProducts = PRODUCTS.filter((p) => {
    if (stockCat === 'out' && !isOut(p.id)) return false;
    if (stockCat !== 'all' && stockCat !== 'out' && p.category !== stockCat) return false;
    return !query || p.name.toLowerCase().includes(query) || p.category.includes(query);
  });

  if (!isAdmin) return <AdminLogin />;

  const advance = (order: Order) => {
    if (order.status === 'placed') updateOrderStatus(order.id, 'butcher_prepping');
    else if (order.status === 'butcher_prepping') updateOrderStatus(order.id, 'cold_packed');
    else if (order.status === 'cold_packed') {
      const draft = riderDraft(order.id);
      if (!draft.name.trim()) return notify('Rider needed', 'Enter the rider name before dispatching.');
      if (!isValidPhone(draft.phone))
        return notify('Rider needed', "Enter the rider's 10-digit mobile number so the customer can call.");
      assignRider(order.id, draft.name.trim(), cleanPhone(draft.phone));
    } else if (order.status === 'out_for_delivery' || order.status === 'rider_assigned') {
      updateOrderStatus(order.id, 'delivered');
    }
  };

  const signOut = () =>
    confirmAction('Sign out?', 'You’ll need your password to sign in again.', 'Sign out', () => {
      adminSignOut().finally(() => router.replace('/(tabs)'));
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => goBack('/profile-menu')}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.link}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.largeTitle}>Store</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Segmented control */}
        <View style={styles.segmented}>
          {(
            [
              { key: 'orders', label: `Orders${activeOrders.length ? ` · ${activeOrders.length}` : ''}` },
              { key: 'stock', label: `Stock${outOfStockCount ? ` · ${outOfStockCount} out` : ''}` },
              { key: 'riders', label: 'Riders' },
            ] as const
          ).map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, tab === s.key && styles.segmentActive]}
              onPress={() => setTab(s.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === s.key }}
            >
              <Text style={[styles.segmentText, tab === s.key && styles.segmentTextActive]} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ============================================================ orders */}
        {tab === 'orders' && (
          <>
            <View style={styles.kpiRow}>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>{activeOrders.length}</Text>
                <Text style={styles.kpiLabel}>To do</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiValue}>₹{todayRevenue}</Text>
                <Text style={styles.kpiLabel}>Today · {todaysOrders.length} orders</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={[styles.kpiValue, { color: C.greenDark }]}>{deliveredToday}</Text>
                <Text style={styles.kpiLabel}>Delivered today</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => {
                const active = filter === f.key;
                const n = countFor(f.key);
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {f.label}
                      {n ? ` ${n}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {visibleOrders.length === 0 ? (
              <View style={[styles.card, styles.empty]}>
                <Text style={styles.emptyTitle}>{filter === 'active' ? 'All caught up' : 'No orders here'}</Text>
                <Text style={styles.emptySub}>New orders appear here instantly.</Text>
              </View>
            ) : (
              visibleOrders.map((order) => {
                const st = STATUS[order.status] || STATUS.placed;
                const draft = riderDraft(order.id);
                const active = isActive(order);
                return (
                  <View key={order.id} style={[styles.card, styles.orderCard]}>
                    {/* top */}
                    <View style={styles.orderTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderId}>#{order.id.replace('MM-', '')}</Text>
                        <Text style={styles.orderMeta}>
                          {timeAgo(order.createdAtMs) || order.placedAt} ·{' '}
                          {order.deliveryMode === 'instant' ? 'Express' : order.eta}
                        </Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: st.bg }]}>
                        <Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* customer */}
                    <View style={styles.customerRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {order.customerName || 'Guest customer'}
                        </Text>
                        <View style={styles.addressRow}>
                          <AppIcon icon={Location01Icon} size={13} color={C.secondary} strokeWidth={2} />
                          <Text style={styles.addressText} numberOfLines={2}>
                            {order.address}
                          </Text>
                        </View>
                      </View>
                      {!!order.customerPhone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => Linking.openURL(`tel:+91${order.customerPhone}`)}
                          accessibilityLabel={`Call ${order.customerName || 'customer'}`}
                        >
                          <AppIcon icon={Call02Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {!!order.deliveryNote && (
                      <View style={styles.noteBox}>
                        <AppIcon icon={Note01Icon} size={14} color={C.amber} strokeWidth={2} />
                        <Text style={styles.noteText}>{order.deliveryNote}</Text>
                      </View>
                    )}

                    {/* items */}
                    <View style={styles.itemsBox}>
                      {order.items.map((item, idx) => (
                        <View key={`${item.cartItemId}-${idx}`} style={styles.itemRow}>
                          <Text style={styles.itemQty}>{item.quantity}×</Text>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.product.name}
                            </Text>
                            <Text style={styles.itemCut} numberOfLines={1}>
                              {item.selectedCut.name}
                              {item.selectedCut.allowsSkinOption ? ` · ${item.isSkinless ? 'Skinless' : 'With skin'}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.itemPrice}>₹{item.unitPrice * item.quantity}</Text>
                        </View>
                      ))}
                      {order.coldPackagingFee > 0 && <Text style={styles.coldTag}>Cold pack requested</Text>}
                    </View>

                    {/* money + rider */}
                    <View style={styles.moneyRow}>
                      <Text style={styles.moneyLabel}>
                        {order.status === 'cancelled' ? 'Cancelled' : order.status === 'delivered' ? 'Collected' : 'Collect on delivery'}
                      </Text>
                      <Text style={styles.moneyValue}>₹{order.total}</Text>
                    </View>
                    {!!order.riderName && (
                      <View style={styles.riderLine}>
                        <AppIcon icon={DeliveryTruck01Icon} size={14} color={C.secondary} strokeWidth={2} />
                        <Text style={styles.riderLineText}>
                          {order.riderName}
                          {order.riderPhone ? ` · ${order.riderPhone}` : ''}
                        </Text>
                      </View>
                    )}

                    {/* dispatch form */}
                    {order.status === 'cold_packed' && (
                      <View style={styles.riderForm}>
                        <TextInput
                          style={styles.riderInput}
                          placeholder="Rider name"
                          placeholderTextColor={C.placeholder}
                          value={draft.name}
                          onChangeText={(name) => setRiderDraft(order.id, { name })}
                          maxLength={60}
                        />
                        <TextInput
                          style={styles.riderInput}
                          placeholder="Rider mobile"
                          placeholderTextColor={C.placeholder}
                          keyboardType="phone-pad"
                          value={draft.phone}
                          onChangeText={(phone) => setRiderDraft(order.id, { phone })}
                          maxLength={14}
                        />
                      </View>
                    )}

                    {/* actions */}
                    {active && (
                      <View style={styles.actions}>
                        {!!st.next && (
                          <TouchableOpacity
                            style={[styles.primaryBtn, { flex: 1 }]}
                            onPress={() => advance(order)}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                          >
                            <Text style={styles.primaryBtnText}>{st.next}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() =>
                            confirmAction(
                              'Cancel this order?',
                              `Order #${order.id} will be cancelled and the customer will see it.`,
                              'Cancel order',
                              () => cancelOrder(order.id),
                              'Keep'
                            )
                          }
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Cancel order ${order.id}`}
                        >
                          <Text style={styles.secondaryBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ============================================================ stock */}
        {tab === 'stock' && (
          <>
            <View style={styles.searchField}>
              <AppIcon icon={Search01Icon} size={17} color="#8E8E93" strokeWidth={2.2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products"
                placeholderTextColor="#8E8E93"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'out', label: `Out of stock${outOfStockCount ? ` ${outOfStockCount}` : ''}` },
                  { key: 'chicken', label: 'Chicken' },
                  { key: 'mutton', label: 'Mutton' },
                  { key: 'fish', label: 'Fish' },
                  { key: 'eggs', label: 'Eggs' },
                ] as const
              ).map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, stockCat === c.key && styles.chipActive]}
                  onPress={() => setStockCat(c.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, stockCat === c.key && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {visibleProducts.length === 0 ? (
              <View style={[styles.card, styles.empty]}>
                <Text style={styles.emptyTitle}>{stockCat === 'out' ? 'Everything is in stock' : 'No products found'}</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {visibleProducts.map((p, idx) => {
                  const inv = inventory[p.id] || { productId: p.id, inStock: true, stockKg: 0, availableCutIds: [] };
                  const out = isOut(p.id);
                  return (
                    <View key={p.id}>
                      {idx > 0 && <View style={[styles.divider, { marginLeft: 58 }]} />}
                      <View style={styles.stockRow}>
                        <Image source={{ uri: optimizeImageUrl(p.image, 100) }} style={[styles.stockThumb, out && { opacity: 0.4 }]} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.stockName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={[styles.stockMeta, out && { color: C.red, fontWeight: '600' }]}>
                            {out ? 'Out of stock' : `₹${p.basePrice} · ${p.netWeight}`}
                          </Text>
                          <View style={styles.kgStepper}>
                            <TouchableOpacity
                              style={styles.kgBtn}
                              onPress={() => updateStockKg(p.id, inv.stockKg - 5)}
                              accessibilityLabel={`Remove 5 kg of ${p.name}`}
                            >
                              <AppIcon icon={MinusSignIcon} size={13} color={C.text} strokeWidth={2.4} />
                            </TouchableOpacity>
                            <Text style={styles.kgText}>{inv.stockKg} kg</Text>
                            <TouchableOpacity
                              style={styles.kgBtn}
                              onPress={() => updateStockKg(p.id, inv.stockKg + 5)}
                              accessibilityLabel={`Add 5 kg of ${p.name}`}
                            >
                              <AppIcon icon={PlusSignIcon} size={13} color={C.text} strokeWidth={2.4} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Switch
                          value={!out}
                          onValueChange={() => toggleStock(p.id)}
                          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                          thumbColor="#FFFFFF"
                          accessibilityLabel={`${p.name} in stock`}
                          testID={`toggle-stock-${p.id}`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <Text style={styles.footnote}>Turning an item on with 0 kg adds 5 kg so customers can order it.</Text>
          </>
        )}

        {/* ============================================================ riders */}
        {tab === 'riders' && (
          <>
            <Text style={styles.sectionLabel}>ON DELIVERY ({ridersOnRoad.length})</Text>
            {ridersOnRoad.length === 0 ? (
              <View style={[styles.card, styles.empty]}>
                <Text style={styles.emptyTitle}>No rider is out</Text>
                <Text style={styles.emptySub}>Riders show up here when you dispatch a packed order.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {ridersOnRoad.map((o, idx) => (
                  <View key={o.id}>
                    {idx > 0 && <View style={[styles.divider, { marginLeft: 56 }]} />}
                    <View style={styles.riderRow}>
                      <View style={styles.riderAvatar}>
                        <Text style={styles.riderInitial}>{(o.riderName || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.stockName}>{o.riderName}</Text>
                        <Text style={styles.stockMeta} numberOfLines={1}>
                          #{o.id.replace('MM-', '')} · {o.customerName || 'Customer'}
                        </Text>
                      </View>
                      {!!o.riderPhone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => Linking.openURL(`tel:+91${o.riderPhone}`)}
                          accessibilityLabel={`Call ${o.riderName}`}
                        >
                          <AppIcon icon={Call02Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  navBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  primaryBtn: {
    backgroundColor: C.red,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  secondaryBtnText: {
    color: C.red,
    fontSize: 15,
    fontWeight: '600',
  },

  /* login */
  loginContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  loginBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  loginSub: {
    fontSize: 15,
    color: C.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  loginInput: {
    fontSize: 16,
    color: C.text,
    paddingVertical: 14,
  },
  loginError: {
    alignSelf: 'stretch',
    color: C.red,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginLeft: 6,
  },

  /* header */
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.greenBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.greenDark,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 10,
    padding: 2,
    marginTop: 12,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: C.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 6,
  },
  footnote: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 10,
    marginLeft: 6,
  },

  /* kpis + chips */
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpi: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: C.secondary,
    marginTop: 2,
  },
  chips: {
    gap: 8,
    paddingVertical: 12,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: C.text,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  emptySub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 4,
    textAlign: 'center',
  },

  /* order card */
  orderCard: {
    paddingVertical: 14,
    marginBottom: 12,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  orderMeta: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 3,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: C.secondary,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.amberBg,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#78350F',
  },
  itemsBox: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  itemQty: {
    width: 26,
    fontSize: 14,
    fontWeight: '800',
    color: C.red,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  itemCut: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  coldTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    paddingVertical: 4,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  moneyLabel: {
    fontSize: 14,
    color: C.secondary,
  },
  moneyValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  riderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  riderLineText: {
    fontSize: 13,
    color: C.secondary,
  },
  riderForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  riderInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  /* stock */
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: C.text,
  },
  clearText: {
    fontSize: 14,
    color: C.red,
    fontWeight: '600',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stockThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.bg,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  stockMeta: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  kgStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.bg,
    borderRadius: 14,
    marginTop: 6,
  },
  kgBtn: {
    width: 32,
    height: 28,
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

  /* riders */
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
