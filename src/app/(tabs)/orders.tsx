import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../../store/useStore';
import { reorderToCart } from '../../utils/reorder';
import { CUSTOMER_STAGES, customerStage } from '../../utils/orderStage';
import { useTabBarInset } from '../../components/FloatingTabBar';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import type { Order } from '../../types';
import { AppIcon, ArrowRight01Icon, RotateLeft01Icon } from '../../components/HugeIcon';

const C = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#15803D',
};

const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';
const itemCount = (o: Order) => o.items.reduce((n, item) => n + item.quantity, 0);

function summary(o: Order): string {
  const first = o.items[0];
  if (!first) return 'Order';
  const name = first.product.name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const more = o.items.length - 1;
  return `${first.quantity}× ${name}${more > 0 ? ` + ${more} more` : ''}`;
}

export default function OrdersScreen() {
  const tabInset = useTabBarInset();
  const { orders } = useStore();
  const active = orders.filter(isActive);
  const past = orders.filter((o) => !isActive(o));

  const openOrder = (o: Order) => router.push({ pathname: '/order-tracking/[id]', params: { id: o.id } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {orders.length === 0 && (
          <View style={styles.empty}>
            <Image
              source={require('../../../assets/illustrations/checkout_counter.png')}
              style={styles.emptyArt}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>When you place an order, you can track it live from here.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)')} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Start shopping</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* In progress: one card per live order */}
        {active.length > 0 && <Text style={styles.sectionTitle}>In progress</Text>}
        {active.map((o) => {
          const stage = customerStage(o.status);
          const st = CUSTOMER_STAGES[stage];
          const thumbs = o.items.slice(0, 3);
          return (
            <TouchableOpacity
              key={o.id}
              style={styles.activeCard}
              onPress={() => openOrder(o)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${st.title}. Arriving ${o.eta}. Track order`}
            >
              <View style={styles.activeTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.liveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>{o.status === 'placed' ? 'Order placed' : st.title}</Text>
                  </View>
                  <Text style={styles.activeEta}>
                    {o.deliveryMode === 'instant' ? 'Arriving in ' : 'Arriving '}
                    {o.eta}
                  </Text>
                </View>
                <View style={[styles.activeThumbs, { width: 44 + (thumbs.length - 1) * 18 }]}>
                  {thumbs.map((item, i) => (
                    <Image
                      key={`${o.id}-a-${i}`}
                      source={{
                        uri: optimizeImageUrl(item.product.image, 100),
                      }}
                      style={[styles.activeThumb, { left: i * 18, zIndex: 3 - i }]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.segments}>
                {CUSTOMER_STAGES.map((s, n) => (
                  <View key={s.key} style={[styles.segment, n <= stage && styles.segmentDone]} />
                ))}
              </View>
              <View style={styles.stageLabels}>
                {CUSTOMER_STAGES.map((s, n) => (
                  <Text key={s.key} style={[styles.stageLabel, n <= stage && styles.stageLabelOn]}>
                    {s.title}
                  </Text>
                ))}
              </View>

              <View style={styles.activeFoot}>
                <Text style={styles.activeMeta} numberOfLines={1}>
                  {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'} · ₹{o.total} · Pay on delivery
                </Text>
                <View style={styles.trackBtn}>
                  <Text style={styles.trackText}>Track</Text>
                  <AppIcon icon={ArrowRight01Icon} size={14} color="#FFFFFF" strokeWidth={2.6} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Past orders (Bolt Food / DoorDash style list with a reorder button) */}
        {past.length > 0 && <Text style={styles.sectionTitle}>Past orders</Text>}
        {past.map((o, idx) => {
          const delivered = o.status === 'delivered';
          const first = o.items[0];
          return (
            <View key={o.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.pastRow}>
                <TouchableOpacity
                  style={styles.pastMain}
                  onPress={() => openOrder(o)}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel={`${summary(o)}, ${delivered ? 'Delivered' : 'Cancelled'}, ₹${o.total}. View details`}
                >
                  <View>
                    {first && (
                      <Image
                        source={{
                          uri: optimizeImageUrl(first.product.image, 140),
                        }}
                        style={styles.pastThumb}
                      />
                    )}
                    {o.items.length > 1 && (
                      <View style={styles.moreBadge}>
                        <Text style={styles.moreBadgeText}>+{o.items.length - 1}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pastTitle} numberOfLines={1}>
                      {summary(o)}
                    </Text>
                    <Text style={styles.pastMeta} numberOfLines={1}>
                      ₹{o.total} · {itemCount(o)} item
                      {itemCount(o) === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.pastDate} numberOfLines={1}>
                      {o.placedAt}
                      {'  '}
                      <Text style={delivered ? styles.statusDelivered : styles.statusCancelled}>
                        {delivered ? 'Delivered' : 'Cancelled'}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.againBtn}
                  onPress={() => reorderToCart(o)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Order ${summary(o)} again`}
                >
                  <AppIcon icon={RotateLeft01Icon} size={14} color={C.text} strokeWidth={2.2} />
                  <Text style={styles.againText}>Reorder</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 110 + tabInset }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginTop: 18,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },

  /* active */
  activeCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEF',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.green,
  },
  activeEta: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  activeThumbs: {
    height: 44,
  },
  activeThumb: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: C.card,
    backgroundColor: '#F3F4F6',
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  segmentDone: {
    backgroundColor: C.green,
  },
  stageLabels: {
    flexDirection: 'row',
    marginTop: 6,
  },
  stageLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: C.placeholder,
  },
  stageLabelOn: {
    color: C.text,
  },
  activeFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  activeMeta: {
    flex: 1,
    fontSize: 13,
    color: C.secondary,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: C.red,
  },
  trackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* past */
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  pastMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  pastThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  moreBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: C.text,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  pastMeta: {
    fontSize: 14,
    color: C.text,
    marginTop: 2,
  },
  pastDate: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 3,
  },
  statusDelivered: {
    color: C.green,
    fontWeight: '700',
  },
  statusCancelled: {
    color: C.red,
    fontWeight: '700',
  },
  againBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  againText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },

  /* empty */
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  emptyArt: {
    width: 200,
    height: 160,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: C.red,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
