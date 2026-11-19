import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../../store/useStore';
import { reorderToCart } from '../../utils/reorder';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import type { Order } from '../../types';
import { AppIcon, ArrowRight01Icon, RotateLeft01Icon } from '../../components/HugeIcon';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#16A34A',
};

const STATUS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  placed: { label: 'Order placed', color: '#B45309', bg: '#FEF3C7', step: 0 },
  butcher_prepping: { label: 'Being prepared', color: '#1D4ED8', bg: '#EFF6FF', step: 1 },
  cold_packed: { label: 'Packed', color: '#0F766E', bg: '#F0FDFA', step: 2 },
  rider_assigned: { label: 'Rider assigned', color: '#7E22CE', bg: '#FAF5FF', step: 3 },
  out_for_delivery: { label: 'On the way', color: '#7E22CE', bg: '#FAF5FF', step: 3 },
  delivered: { label: 'Delivered', color: '#15803D', bg: '#F0FDF4', step: 4 },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6', step: 0 },
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
  const { orders } = useStore();
  const active = orders.filter(isActive);
  const past = orders.filter((o) => !isActive(o));

  const openOrder = (o: Order) => router.push({ pathname: '/order-tracking/[id]', params: { id: o.id } });

  const orderAgain = reorderToCart;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {orders.length === 0 && (
          <View style={styles.emptyCard}>
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

        {/* In progress */}
        {active.length > 0 && <Text style={styles.sectionLabel}>IN PROGRESS</Text>}
        {active.map((o) => {
          const st = STATUS[o.status] || STATUS.placed;
          return (
            <TouchableOpacity
              key={o.id}
              style={styles.activeCard}
              onPress={() => openOrder(o)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`${st.label}. Track order`}
            >
              <View style={styles.activeTop}>
                <View style={styles.liveDot} />
                <Text style={styles.activeStatus}>{st.label}</Text>
                <Text style={styles.activeId}>#{o.id.replace('MM-', '')}</Text>
              </View>
              <Text style={styles.activeEta}>
                {o.deliveryMode === 'instant' ? 'Arriving in ' : 'Arriving '}
                <Text style={{ color: '#FCA5A5' }}>{o.eta}</Text>
              </Text>
              <Text style={styles.activeMeta}>
                {itemCount(o)} item{itemCount(o) === 1 ? '' : 's'} · ₹{o.total} · Pay on delivery
              </Text>
              <View style={styles.segments}>
                {[1, 2, 3, 4].map((n) => (
                  <View key={n} style={[styles.segment, n <= st.step && styles.segmentDone]} />
                ))}
              </View>
              <View style={styles.trackRow}>
                <Text style={styles.trackText}>Track order</Text>
                <AppIcon icon={ArrowRight01Icon} size={16} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Past */}
        {past.length > 0 && <Text style={styles.sectionLabel}>PAST ORDERS</Text>}
        {past.length > 0 && (
          <View style={styles.card}>
            {past.map((o, idx) => {
              const st = STATUS[o.status] || STATUS.delivered;
              const thumbs = o.items.slice(0, 2);
              return (
                <View key={o.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.pastRow}
                    onPress={() => openOrder(o)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={`${summary(o)}, ${st.label}, ₹${o.total}`}
                  >
                    <View style={styles.thumbStack}>
                      {thumbs.map((item, i) => (
                        <Image
                          key={`${o.id}-thumb-${i}`}
                          source={{ uri: optimizeImageUrl(item.product.image, 120) }}
                          style={[styles.thumb, i === 1 && styles.thumbBack]}
                        />
                      ))}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.pastTitle} numberOfLines={1}>
                        {summary(o)}
                      </Text>
                      <Text style={styles.pastMeta} numberOfLines={1}>
                        {o.placedAt} · ₹{o.total}
                      </Text>
                      <View style={[styles.pill, { backgroundColor: st.bg }]}>
                        <Text style={[styles.pillText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <AppIcon icon={ArrowRight01Icon} size={16} color="#C7C7CC" strokeWidth={2.2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.againBtn}
                    onPress={() => orderAgain(o)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Order ${summary(o)} again`}
                  >
                    <AppIcon icon={RotateLeft01Icon} size={14} color={C.red} strokeWidth={2.2} />
                    <Text style={styles.againText}>Order again</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 110 }} />
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
    paddingBottom: 6,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 6,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },

  /* active */
  activeCard: {
    backgroundColor: C.text,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  activeStatus: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  activeId: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  activeEta: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: -0.3,
  },
  activeMeta: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 4,
  },
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  segmentDone: {
    backgroundColor: '#22C55E',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  trackText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* past */
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  thumbStack: {
    width: 56,
    height: 56,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.card,
    backgroundColor: C.bg,
    zIndex: 2,
  },
  thumbBack: {
    top: 6,
    left: 6,
    zIndex: 1,
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  pastMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  againBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 82,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  againText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.red,
  },

  /* empty */
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyArt: {
    width: 180,
    height: 150,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 6,
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
