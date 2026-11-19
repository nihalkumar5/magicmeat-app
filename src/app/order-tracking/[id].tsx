import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../../store/useStore';
import { goBack } from '../../utils/navigation';
import { confirmAction } from '../../utils/dialogs';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { SUPPORT_EMAIL } from '../../constants/support';
import type { OrderStatus } from '../../types';
import {
  AppIcon,
  ArrowLeft01Icon,
  Call02Icon,
  Message01Icon,
  ShieldCheckIcon,
  Tick02Icon,
  Location01Icon,
  Cash01Icon,
  Mail01Icon,
  ArrowRight01Icon,
} from '../../components/HugeIcon';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#16A34A',
  greenDark: '#15803D',
  greenBg: '#F0FDF4',
  track: '#E5E7EB',
};

const STAGES: { key: OrderStatus; title: string; sub: string }[] = [
  { key: 'placed', title: 'Order placed', sub: 'We’ve received your order' },
  { key: 'butcher_prepping', title: 'Being prepared', sub: 'Cleaned and cut the way you chose' },
  { key: 'cold_packed', title: 'Packed', sub: 'Sealed and packed cold' },
  { key: 'out_for_delivery', title: 'On the way', sub: 'Your rider is heading to you' },
  { key: 'delivered', title: 'Delivered', sub: 'Enjoy your meal' },
];

const HEADLINE: Record<string, { title: string; sub: string }> = {
  placed: { title: 'Order placed', sub: 'The store will start preparing it shortly.' },
  butcher_prepping: { title: 'Being prepared', sub: 'Your meat is being cleaned and cut fresh.' },
  cold_packed: { title: 'Packed and ready', sub: 'Waiting for a rider to pick it up.' },
  rider_assigned: { title: 'Rider assigned', sub: 'Your rider is on the way to the store.' },
  out_for_delivery: { title: 'On the way', sub: 'Your rider is heading to you.' },
  delivered: { title: 'Delivered', sub: 'Enjoy your meal. Thank you for ordering!' },
  cancelled: { title: 'Order cancelled', sub: 'You haven’t been charged. Order again any time.' },
};

// Shown once, right after checkout: a quick check-mark moment before the
// customer reads the tracking details.
function PlacedBanner() {
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);
  return (
    <Animated.View style={[styles.placedBanner, { opacity }]} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.placedCheck, { transform: [{ scale }] }]}>
        <AppIcon icon={Tick02Icon} size={26} color="#FFFFFF" strokeWidth={3} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={styles.placedTitle}>Order placed!</Text>
        <Text style={styles.placedSub}>We’ve got it. You’ll pay when it arrives.</Text>
      </View>
    </Animated.View>
  );
}

export default function OrderTrackingScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const justPlaced = placed === '1';
  const { activeOrder, orders, cancelOrder } = useStore();
  const order = orders.find((o) => o.id === id) || (activeOrder && activeOrder.id === id ? activeOrder : null);

  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <Text style={styles.emptyTitle}>Order not found</Text>
        <Text style={styles.emptySub}>It may still be loading, or the link is wrong.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/orders')}>
          <Text style={styles.primaryBtnText}>See your orders</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const stageIndex =
    order.status === 'rider_assigned' ? 3 : Math.max(0, STAGES.findIndex((s) => s.key === order.status));
  const headline = HEADLINE[order.status] || HEADLINE.placed;
  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  const confirmCancel = () =>
    confirmAction(
      'Cancel this order?',
      'The store hasn’t started preparing it yet.',
      'Cancel order',
      () => cancelOrder(order.id),
      'Keep order'
    );

  const emailSupport = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Help with order ${order.id}`)}`);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => goBack('/(tabs)')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.navTitle}>Order status</Text>
          <Text style={styles.navSub}>#{order.id}</Text>
        </View>
        <TouchableOpacity
          style={styles.navHelp}
          onPress={emailSupport}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Get help with this order"
        >
          <Text style={styles.link}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Just placed */}
        {justPlaced && order.status === 'placed' && <PlacedBanner />}

        {/* Status hero */}
        <View style={[styles.card, styles.hero]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroEyebrow, isCancelled && { color: C.secondary }]}>
                {isCancelled ? 'CANCELLED' : isDelivered ? 'COMPLETED' : order.deliveryMode === 'instant' ? 'EXPRESS' : 'SCHEDULED'}
              </Text>
              <Text style={styles.heroTitle}>{headline.title}</Text>
              {!isCancelled && !isDelivered ? (
                <Text style={styles.heroEta}>
                  {order.deliveryMode === 'instant' ? 'Arriving in ' : 'Arriving '}
                  <Text style={{ color: C.red, fontWeight: '800' }}>{order.eta}</Text>
                </Text>
              ) : null}
              <Text style={styles.heroSub}>{headline.sub}</Text>
            </View>
            <Image
              source={require('../../../assets/illustrations/delivery_courier.png')}
              style={styles.heroArt}
              resizeMode="contain"
            />
          </View>

          {!isCancelled && (
            <View style={styles.segments} accessibilityLabel={`Step ${stageIndex + 1} of ${STAGES.length}`}>
              {STAGES.slice(1).map((stage, i) => (
                <View
                  key={stage.key}
                  style={[styles.segment, (i < stageIndex || isDelivered) && styles.segmentDone]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Rider */}
        {!!order.riderName && !isCancelled && (
          <View style={[styles.card, styles.riderCard]}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>{order.riderName.trim()[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>{order.riderName}</Text>
              <Text style={styles.rowSub}>Your delivery partner</Text>
            </View>
            {!!order.riderPhone && !isDelivered && (
              <View style={styles.riderActions}>
                <TouchableOpacity
                  style={styles.roundAction}
                  onPress={() => Linking.openURL(`sms:+91${order.riderPhone}`)}
                  accessibilityLabel={`Message ${order.riderName}`}
                >
                  <AppIcon icon={Message01Icon} size={18} color={C.text} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roundAction, { backgroundColor: C.green }]}
                  onPress={() => Linking.openURL(`tel:+91${order.riderPhone}`)}
                  accessibilityLabel={`Call ${order.riderName}`}
                >
                  <AppIcon icon={Call02Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Progress */}
        {!isCancelled && (
          <>
            <Text style={styles.sectionLabel}>PROGRESS</Text>
            <View style={[styles.card, { paddingVertical: 14 }]}>
              {STAGES.map((stage, idx) => {
                const done = idx < stageIndex || (isDelivered && idx === stageIndex);
                const current = !isDelivered && idx === stageIndex;
                const last = idx === STAGES.length - 1;
                return (
                  <View key={stage.key} style={styles.stepRow}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                        {done && <AppIcon icon={Tick02Icon} size={13} color="#FFFFFF" strokeWidth={3} />}
                        {current && <View style={styles.stepDotInner} />}
                      </View>
                      {!last && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                    </View>
                    <View style={[styles.stepBody, !last && { paddingBottom: 18 }]}>
                      <View style={styles.stepTitleRow}>
                        <Text style={[styles.stepTitle, !(done || current) && { color: C.placeholder }]}>
                          {stage.title}
                        </Text>
                        <Text style={[styles.stepTime, current && { color: C.red, fontWeight: '700' }]}>
                          {idx === 0 ? order.placedAt : current ? 'Now' : ''}
                        </Text>
                      </View>
                      <Text style={[styles.stepSub, !(done || current) && { color: C.placeholder }]}>
                        {stage.sub}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Details */}
        <Text style={styles.sectionLabel}>DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <AppIcon icon={Location01Icon} size={18} color={C.secondary} strokeWidth={2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.detailLabel}>Deliver to</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{order.address}</Text>
            </View>
          </View>
          <View style={[styles.divider, { marginLeft: 30 }]} />
          <View style={styles.detailRow}>
            <AppIcon icon={Cash01Icon} size={18} color={C.secondary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>
                {isCancelled ? 'Nothing to pay' : isDelivered ? `Pay on delivery · ₹${order.total}` : `Pay ₹${order.total} on delivery (cash or UPI)`}
              </Text>
            </View>
          </View>
          {!!order.deliveryNote && (
            <>
              <View style={[styles.divider, { marginLeft: 30 }]} />
              <View style={styles.detailRow}>
                <AppIcon icon={Message01Icon} size={18} color={C.secondary} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Your note</Text>
                  <Text style={styles.detailValue}>{order.deliveryNote}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Items */}
        <Text style={styles.sectionLabel}>
          {itemCount} ITEM{itemCount > 1 ? 'S' : ''}
        </Text>
        <View style={[styles.card, { paddingVertical: 4 }]}>
          {order.items.map((item, idx) => (
            <View key={`${item.cartItemId}-${idx}`}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.itemRow}>
                <Image source={{ uri: optimizeImageUrl(item.product.image, 120) }} style={styles.thumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.quantity} × {item.selectedCut.name}
                    {item.selectedCut.allowsSkinOption ? ` · ${item.isSkinless ? 'Skinless' : 'With skin'}` : ''}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.unitPrice * item.quantity}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          {order.deliveryFee > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery fee</Text>
              <Text style={styles.billValue}>₹{order.deliveryFee}</Text>
            </View>
          )}
          {order.coldPackagingFee > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Cold pack</Text>
              <Text style={styles.billValue}>₹{order.coldPackagingFee}</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <TouchableOpacity style={styles.actionRow} onPress={emailSupport} activeOpacity={0.6}>
            <AppIcon icon={Mail01Icon} size={18} color={C.text} strokeWidth={2} />
            <Text style={styles.actionText}>Need help with this order?</Text>
            <AppIcon icon={ArrowRight01Icon} size={16} color={C.placeholder} strokeWidth={2} />
          </TouchableOpacity>
          {order.status === 'placed' && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={confirmCancel}
                activeOpacity={0.6}
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, { color: C.red, marginLeft: 0 }]}>Cancel order</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {order.status === 'placed' && (
          <Text style={styles.footnote}>You can cancel until the store starts preparing your order.</Text>
        )}

        <View style={styles.assurance}>
          <AppIcon icon={ShieldCheckIcon} size={14} color={C.secondary} strokeWidth={2} />
          <Text style={styles.assuranceText}>Something not right? We’ll replace it or refund you.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  placedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.greenBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  placedCheck: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.greenDark,
  },
  placedSub: {
    fontSize: 13,
    color: C.greenDark,
    marginTop: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 6,
    marginBottom: 18,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: C.red,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  navHelp: {
    width: 40,
    alignItems: 'flex-end',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  navSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 6,
  },

  /* hero */
  hero: {
    paddingVertical: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: C.red,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  heroEta: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.secondary,
    marginTop: 6,
  },
  heroArt: {
    width: 84,
    height: 84,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.track,
  },
  segmentDone: {
    backgroundColor: C.green,
  },

  /* rider */
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    marginTop: 12,
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
    fontSize: 18,
    fontWeight: '800',
  },
  riderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  rowSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },

  /* progress */
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepRail: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.track,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  stepDotCurrent: {
    borderColor: C.red,
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.red,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.track,
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: C.green,
  },
  stepBody: {
    flex: 1,
    paddingTop: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  stepTime: {
    fontSize: 12,
    color: C.secondary,
  },
  stepSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },

  /* details */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
  },
  detailLabel: {
    fontSize: 12,
    color: C.secondary,
  },
  detailValue: {
    fontSize: 15,
    color: C.text,
    marginTop: 2,
    lineHeight: 20,
  },

  /* items */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.bg,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  itemMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },

  /* actions */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  footnote: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 8,
    marginLeft: 6,
  },
  assurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  assuranceText: {
    fontSize: 12,
    color: C.secondary,
  },
});
