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
  KeyboardAvoidingView,
  Platform,
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
import type { Order } from '../types';
import {
  AppIcon,
  ArrowLeft01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Search01Icon,
  DeliveryTruck01Icon,
  PlusSignIcon,
  MinusSignIcon,
  Call02Icon,
  Location01Icon,
  Note01Icon,
  Logout01Icon,
  Store01Icon,
} from '../components/HugeIcon';

// Store admin, modelled on the Shopify mobile admin: a dark header with
// today's numbers, then a white sheet with a scannable order list. Each
// order opens in place, and one dark button moves it to the next step.

const C = {
  ink: '#0B0B0C',
  bg: '#FFFFFF',
  soft: '#F4F4F5',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: '#ECECEF',
  red: '#DC2626',
  green: '#15803D',
  greenBg: '#ECFDF3',
};

type Stage = 'new' | 'preparing' | 'packed' | 'on_way' | 'delivered' | 'cancelled';

const STAGE: Record<Stage, { label: string; color: string; bg: string; next?: string }> = {
  new: { label: 'New', color: '#B45309', bg: '#FEF3C7', next: 'Accept and start preparing' },
  preparing: { label: 'Preparing', color: '#1D4ED8', bg: '#EFF6FF', next: 'Mark as packed' },
  packed: { label: 'Packed', color: '#0F766E', bg: '#F0FDFA', next: 'Send with rider' },
  on_way: { label: 'On the way', color: '#7E22CE', bg: '#FAF5FF', next: 'Mark as delivered' },
  delivered: { label: 'Delivered', color: C.green, bg: C.greenBg },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6' },
};

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

type Filter = 'todo' | Stage | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'new', label: 'New' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'packed', label: 'Packed' },
  { key: 'on_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';
const itemCount = (o: Order) => o.items.reduce((n, i) => n + i.quantity, 0);
const shortName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

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
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.field}
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

          {!!error && <Text style={styles.loginError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.darkBtn, { marginTop: 22 }, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.darkBtnText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 18, alignSelf: 'center' }}>
            <Text style={styles.mutedLink}>Back to the shop</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ================================================================ screen */

export default function AdminScreen() {
  const { isAdmin, orders, inventory, updateOrderStatus, cancelOrder, assignRider, toggleStock, updateStockKg } =
    useStore();

  const [tab, setTab] = useState<'orders' | 'stock' | 'riders'>('orders');
  const [filter, setFilter] = useState<Filter>('todo');
  const [openId, setOpenId] = useState<string | null>(null);
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
  const newCount = orders.filter((o) => o.status === 'placed').length;
  const ridersOnRoad = orders.filter((o) => stageOf(o) === 'on_way' && o.riderName);
  const isOut = (id: string) => {
    const inv = inventory[id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  };
  const outOfStockCount = PRODUCTS.filter((p) => isOut(p.id)).length;

  const countFor = (key: Filter) =>
    key === 'all'
      ? orders.length
      : key === 'todo'
        ? activeOrders.length
        : orders.filter((o) => stageOf(o) === key).length;

  // Work still to do is shown oldest first, so the earliest order goes out first.
  const visibleOrders = (() => {
    if (filter === 'all') return orders;
    if (filter === 'todo') return [...activeOrders].reverse();
    const list = orders.filter((o) => stageOf(o) === filter);
    return filter === 'delivered' || filter === 'cancelled' ? list : [...list].reverse();
  })();

  const query = search.trim().toLowerCase();
  const visibleProducts = PRODUCTS.filter((p) => {
    if (stockCat === 'out' && !isOut(p.id)) return false;
    if (stockCat !== 'all' && stockCat !== 'out' && p.category !== stockCat) return false;
    return !query || p.name.toLowerCase().includes(query) || p.category.includes(query);
  });

  if (!isAdmin) return <AdminLogin />;

  const advance = (order: Order) => {
    const stage = stageOf(order);
    if (stage === 'new') updateOrderStatus(order.id, 'butcher_prepping');
    else if (stage === 'preparing') updateOrderStatus(order.id, 'cold_packed');
    else if (stage === 'packed') {
      const draft = riderDraft(order.id);
      if (!draft.name.trim()) {
        setOpenId(order.id);
        return notify('Rider needed', 'Enter the rider name before sending the order.');
      }
      if (!isValidPhone(draft.phone)) {
        setOpenId(order.id);
        return notify('Rider needed', "Enter the rider's 10-digit mobile number so the customer can call.");
      }
      assignRider(order.id, draft.name.trim(), cleanPhone(draft.phone));
    } else if (stage === 'on_way') {
      updateOrderStatus(order.id, 'delivered');
    }
  };

  const signOut = () =>
    confirmAction('Sign out?', 'You’ll need your password to sign in again.', 'Sign out', () => {
      adminSignOut().finally(() => router.replace('/login'));
    });

  const stats = [
    { label: 'To do', value: String(activeOrders.length), hint: newCount ? `${newCount} new` : 'All caught up' },
    { label: 'Sales today', value: `₹${todayRevenue.toLocaleString('en-IN')}`, hint: `${todaysOrders.length} orders` },
    { label: 'Delivered', value: String(deliveredToday), hint: 'today' },
    {
      label: 'Out of stock',
      value: String(outOfStockCount),
      hint: outOfStockCount ? 'needs restock' : 'all in stock',
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Dark header (Shopify / eBay seller style) */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => goBack('/profile-menu')}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.storeId}>
            <View style={styles.storeAvatar}>
              <Text style={styles.storeAvatarText}>MM</Text>
            </View>
            <View>
              <Text style={styles.storeName}>MagicMeat Store</Text>
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live · orders update instantly</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <AppIcon icon={Logout01Icon} size={19} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statHint}>{s.hint}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* White sheet */}
      <View style={styles.sheet}>
        <View style={styles.tabs}>
          {(
            [
              { key: 'orders', label: 'Orders', badge: activeOrders.length },
              { key: 'stock', label: 'Stock', badge: outOfStockCount },
              { key: 'riders', label: 'Riders', badge: ridersOnRoad.length },
            ] as const
          ).map((t) => {
            const on = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
                {t.badge > 0 && (
                  <View style={[styles.tabBadge, on && styles.tabBadgeOn]}>
                    <Text style={[styles.tabBadgeText, on && styles.tabBadgeTextOn]}>{t.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============================================================ orders */}
          {tab === 'orders' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {FILTERS.map((f) => {
                  const on = filter === f.key;
                  const n = countFor(f.key);
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {f.label}
                        {n ? ` ${n}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {visibleOrders.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{filter === 'todo' ? 'All caught up' : 'No orders here'}</Text>
                  <Text style={styles.emptySub}>New orders appear here the moment a customer places them.</Text>
                </View>
              ) : (
                visibleOrders.map((order, idx) => {
                  const stage = stageOf(order);
                  const st = STAGE[stage];
                  const open = openId === order.id;
                  const active = isActive(order);
                  const draft = riderDraft(order.id);
                  const items = order.items.map((i) => `${i.quantity}× ${shortName(i.product.name)}`).join(', ');
                  return (
                    <View key={order.id}>
                      {idx > 0 && <View style={styles.divider} />}

                      {/* Row */}
                      <TouchableOpacity
                        style={styles.orderRow}
                        onPress={() => setOpenId(open ? null : order.id)}
                        activeOpacity={0.6}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        accessibilityLabel={`Order ${order.id}, ${st.label}, ₹${order.total}`}
                      >
                        <View style={styles.orderHead}>
                          <Text style={styles.orderId}>#{order.id.replace('MM-', '')}</Text>
                          <Text style={styles.orderTotal}>₹{order.total}</Text>
                        </View>
                        <Text style={styles.orderMeta} numberOfLines={1}>
                          {order.customerName || 'Customer'} • {itemCount(order)} item
                          {itemCount(order) === 1 ? '' : 's'} • {timeAgo(order.createdAtMs) || order.placedAt}
                        </Text>
                        <Text style={styles.orderItems} numberOfLines={open ? undefined : 1}>
                          {items}
                        </Text>
                        <View style={styles.badges}>
                          <View style={[styles.badge, { backgroundColor: st.bg }]}>
                            <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
                            <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                          </View>
                          <View style={[styles.badge, order.deliveryMode === 'instant' && styles.badgeExpress]}>
                            <Text
                              style={[
                                styles.badgeText,
                                { color: order.deliveryMode === 'instant' ? C.red : C.secondary },
                              ]}
                            >
                              {order.deliveryMode === 'instant' ? 'Express' : 'Normal'}
                            </Text>
                          </View>
                          <View style={styles.badge}>
                            <Text style={[styles.badgeText, { color: C.secondary }]}>
                              {order.status === 'delivered' ? 'Paid' : 'Cash / UPI on delivery'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <AppIcon
                            icon={open ? ArrowUp01Icon : ArrowDown01Icon}
                            size={16}
                            color={C.placeholder}
                            strokeWidth={2.2}
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Details */}
                      {open && (
                        <View style={styles.detail}>
                          <View style={styles.detailBlock}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.detailLabel}>DELIVER TO</Text>
                              <Text style={styles.detailName}>{order.customerName || 'Customer'}</Text>
                              <View style={styles.addressRow}>
                                <AppIcon icon={Location01Icon} size={13} color={C.secondary} strokeWidth={2} />
                                <Text style={styles.addressText}>{order.address}</Text>
                              </View>
                              {!!order.customerPhone && (
                                <Text style={styles.detailPhone}>+91 {order.customerPhone}</Text>
                              )}
                            </View>
                            {!!order.customerPhone && (
                              <TouchableOpacity
                                style={styles.callBtn}
                                onPress={() => Linking.openURL(`tel:+91${order.customerPhone}`)}
                                accessibilityLabel={`Call ${order.customerName || 'customer'}`}
                              >
                                <AppIcon icon={Call02Icon} size={17} color={C.text} strokeWidth={2} />
                              </TouchableOpacity>
                            )}
                          </View>

                          {!!order.deliveryNote && (
                            <View style={styles.noteBox}>
                              <AppIcon icon={Note01Icon} size={14} color="#B45309" strokeWidth={2} />
                              <Text style={styles.noteText}>{order.deliveryNote}</Text>
                            </View>
                          )}

                          <Text style={[styles.detailLabel, { marginTop: 14 }]}>ITEMS</Text>
                          {order.items.map((item, i) => (
                            <View key={`${item.cartItemId}-${i}`} style={styles.itemRow}>
                              <Image
                                source={{ uri: optimizeImageUrl(item.product.image, 100) }}
                                style={styles.itemThumb}
                              />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.itemName} numberOfLines={1}>
                                  {item.product.name}
                                </Text>
                                <Text style={styles.itemCut} numberOfLines={1}>
                                  {item.selectedCut.name}
                                  {item.selectedCut.allowsSkinOption
                                    ? ` · ${item.isSkinless ? 'Skinless' : 'With skin'}`
                                    : ''}
                                </Text>
                              </View>
                              <Text style={styles.itemQty}>× {item.quantity}</Text>
                            </View>
                          ))}

                          <View style={styles.moneyBox}>
                            <View style={styles.moneyRow}>
                              <Text style={styles.moneyLabel}>Items</Text>
                              <Text style={styles.moneyValue}>₹{order.subtotal}</Text>
                            </View>
                            <View style={styles.moneyRow}>
                              <Text style={styles.moneyLabel}>
                                {order.deliveryMode === 'instant' ? 'Express delivery' : 'Delivery'}
                              </Text>
                              <Text style={styles.moneyValue}>
                                {order.deliveryFee ? `₹${order.deliveryFee}` : 'Free'}
                              </Text>
                            </View>
                            <View style={[styles.moneyRow, styles.moneyTotalRow]}>
                              <Text style={styles.moneyTotalLabel}>
                                {order.status === 'delivered' ? 'Collected' : 'Collect on delivery'}
                              </Text>
                              <Text style={styles.moneyTotal}>₹{order.total}</Text>
                            </View>
                          </View>

                          {!!order.riderName && (
                            <View style={styles.riderLine}>
                              <AppIcon icon={DeliveryTruck01Icon} size={15} color={C.secondary} strokeWidth={2} />
                              <Text style={styles.riderLineText}>
                                {order.riderName}
                                {order.riderPhone ? ` · +91 ${order.riderPhone}` : ''}
                              </Text>
                            </View>
                          )}

                          {stage === 'packed' && (
                            <>
                              <Text style={[styles.detailLabel, { marginTop: 14 }]}>RIDER</Text>
                              <View style={styles.riderForm}>
                                <TextInput
                                  style={[styles.field, { flex: 1 }]}
                                  placeholder="Rider name"
                                  placeholderTextColor={C.placeholder}
                                  value={draft.name}
                                  onChangeText={(name) => setRiderDraft(order.id, { name })}
                                  maxLength={60}
                                />
                                <TextInput
                                  style={[styles.field, { flex: 1 }]}
                                  placeholder="Mobile"
                                  placeholderTextColor={C.placeholder}
                                  keyboardType="phone-pad"
                                  value={draft.phone}
                                  onChangeText={(phone) => setRiderDraft(order.id, { phone })}
                                  maxLength={14}
                                />
                              </View>
                            </>
                          )}

                          {active && (
                            <TouchableOpacity
                              style={styles.cancelLink}
                              onPress={() =>
                                confirmAction(
                                  'Cancel this order?',
                                  `Order #${order.id} will be cancelled and the customer will see it.`,
                                  'Cancel order',
                                  () => cancelOrder(order.id),
                                  'Keep',
                                )
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Cancel order ${order.id}`}
                            >
                              <Text style={styles.cancelText}>Cancel order</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Next step: always one tap away */}
                      {active && !!st.next && (
                        <TouchableOpacity
                          style={styles.nextBtn}
                          onPress={() => advance(order)}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                        >
                          <Text style={styles.nextBtnText}>{st.next}</Text>
                        </TouchableOpacity>
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
                <AppIcon icon={Search01Icon} size={17} color={C.placeholder} strokeWidth={2.2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products"
                  placeholderTextColor={C.placeholder}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                />
                {!!search && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.mutedLink}>Clear</Text>
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
                    style={[styles.chip, stockCat === c.key && styles.chipOn]}
                    onPress={() => setStockCat(c.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, stockCat === c.key && styles.chipTextOn]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {visibleProducts.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>
                    {stockCat === 'out' ? 'Everything is in stock' : 'No products found'}
                  </Text>
                </View>
              ) : (
                visibleProducts.map((p, idx) => {
                  const inv = inventory[p.id] || { productId: p.id, inStock: true, stockKg: 0, availableCutIds: [] };
                  const out = isOut(p.id);
                  return (
                    <View key={p.id}>
                      {idx > 0 && <View style={[styles.divider, { marginLeft: 64 }]} />}
                      <View style={styles.stockRow}>
                        <Image
                          source={{ uri: optimizeImageUrl(p.image, 100) }}
                          style={[styles.stockThumb, out && { opacity: 0.4 }]}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.stockName} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={[styles.stockMeta, out && styles.stockMetaOut]}>
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
                })
              )}
              <Text style={styles.footnote}>Turning an item on with 0 kg adds 5 kg so customers can order it.</Text>
            </>
          )}

          {/* ============================================================ riders */}
          {tab === 'riders' && (
            <>
              <Text style={styles.sectionTitle}>On delivery</Text>
              {ridersOnRoad.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No rider is out</Text>
                  <Text style={styles.emptySub}>Riders show up here when you send a packed order.</Text>
                </View>
              ) : (
                ridersOnRoad.map((o, idx) => (
                  <View key={o.id}>
                    {idx > 0 && <View style={[styles.divider, { marginLeft: 58 }]} />}
                    <View style={styles.riderRow}>
                      <View style={styles.riderAvatar}>
                        <Text style={styles.riderInitial}>{(o.riderName || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.stockName}>{o.riderName}</Text>
                        <Text style={styles.stockMeta} numberOfLines={1}>
                          #{o.id.replace('MM-', '')} · {o.customerName || 'Customer'} · ₹{o.total}
                        </Text>
                      </View>
                      {!!o.riderPhone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => Linking.openURL(`tel:+91${o.riderPhone}`)}
                          accessibilityLabel={`Call ${o.riderName}`}
                        >
                          <AppIcon icon={Call02Icon} size={17} color={C.text} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.ink,
  },

  /* header */
  header: {
    backgroundColor: C.ink,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeId: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  storeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  stats: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  stat: {
    width: 132,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  statHint: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },

  /* sheet */
  sheet: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    margin: 14,
    marginBottom: 6,
    padding: 4,
    borderRadius: 14,
    backgroundColor: C.soft,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabOn: {
    backgroundColor: C.bg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },
  tabTextOn: {
    color: C.text,
    fontWeight: '700',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeOn: {
    backgroundColor: C.ink,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secondary,
  },
  tabBadgeTextOn: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 16,
  },
  chips: {
    gap: 8,
    paddingVertical: 10,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: C.ink,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3F3F46',
  },
  chipTextOn: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: C.hairline,
  },

  /* order row */
  orderRow: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  orderHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  orderId: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.2,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  orderMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 3,
  },
  orderItems: {
    fontSize: 14,
    color: C.text,
    marginTop: 4,
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: C.soft,
  },
  badgeExpress: {
    backgroundColor: '#FEF2F2',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* order detail */
  detail: {
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 14,
    marginBottom: 10,
  },
  detailBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.placeholder,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  detailName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  detailPhone: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 3,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 3,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: C.secondary,
    lineHeight: 18,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
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
    gap: 10,
    paddingVertical: 6,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.soft,
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
  itemQty: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  moneyBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    gap: 6,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moneyLabel: {
    fontSize: 13,
    color: C.secondary,
  },
  moneyValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '600',
  },
  moneyTotalRow: {
    marginTop: 2,
  },
  moneyTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  moneyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  riderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  riderLineText: {
    fontSize: 13,
    color: C.secondary,
    fontWeight: '600',
  },
  riderForm: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.red,
  },

  /* shared fields and buttons */
  field: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: C.bg,
    paddingHorizontal: 12,
    fontSize: 15,
    color: C.text,
  },
  darkBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mutedLink: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },

  /* stock */
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: C.soft,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: C.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stockThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.soft,
  },
  stockName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  stockMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  stockMetaOut: {
    color: C.red,
    fontWeight: '700',
  },
  kgStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 4,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.soft,
  },
  kgBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kgText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    minWidth: 40,
    textAlign: 'center',
  },
  footnote: {
    fontSize: 12,
    color: C.placeholder,
    marginTop: 14,
    textAlign: 'center',
  },

  /* riders */
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginTop: 12,
    marginBottom: 4,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  riderAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7E22CE',
  },

  /* empty */
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 6,
  },

  /* login */
  loginSafe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loginNav: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: C.ink,
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
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginTop: 12,
    marginBottom: 6,
  },
  loginError: {
    fontSize: 14,
    fontWeight: '600',
    color: C.red,
    marginTop: 12,
  },
});
