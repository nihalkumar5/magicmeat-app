import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useStore } from '../store/useStore';
import { couponHeadline, couponTerms } from '../data/pricing';
import { PressableScale, useBump } from './motion';
import { haptic } from '../utils/haptics';
import { notify } from '../utils/dialogs';
import { AppIcon, Tick02Icon, DiscountTag01Icon } from './HugeIcon';
import type { Coupon } from '../types';

const RED = '#DC2626';
const BG = '#F2F2F7'; // page background, used for the ticket notches
const TICKET_H = 56;

// Thin row of coupon "tickets" (Keeta / Gojek style): the deal on the left,
// a perforation, the code on the right. Tap to apply; checkout picks it up.
export function OffersStrip({ background = BG }: { background?: string }) {
  const coupons = useStore((s) => s.coupons);
  const applied = useStore((s) => s.appliedCouponCode);
  const setApplied = useStore((s) => s.setAppliedCoupon);
  const live = coupons.filter((c) => c.active);
  if (live.length === 0) return null;

  const toggle = (c: Coupon) => {
    if (applied === c.code) {
      haptic.select();
      setApplied(null);
      return;
    }
    haptic.success();
    setApplied(c.code);
    notify(`${c.code} applied`, `${couponHeadline(c)} · ${couponTerms(c)}. It's added at checkout.`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppIcon icon={DiscountTag01Icon} size={15} color={RED} strokeWidth={2.2} />
        <Text style={styles.headText}>Offers for you</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
      >
        {live.map((c) => (
          <Ticket key={c.code} coupon={c} on={applied === c.code} notch={background} onPress={() => toggle(c)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Ticket({ coupon, on, notch, onPress }: { coupon: Coupon; on: boolean; notch: string; onPress: () => void }) {
  const bump = useBump(on, 1.04);
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${couponHeadline(coupon)}, code ${coupon.code}. ${on ? 'Applied' : 'Tap to apply'}`}
    >
      <Animated.View style={[styles.ticket, on && styles.ticketOn, { transform: [{ scale: bump }] }]}>
        <View style={styles.deal}>
          <Text style={[styles.headline, on && styles.onText]} numberOfLines={1}>
            {couponHeadline(coupon)}
          </Text>
          <Text style={[styles.terms, on && styles.onSub]} numberOfLines={1}>
            {couponTerms(coupon)}
          </Text>
        </View>

        {/* perforation with half-circle notches */}
        <View style={styles.perf}>
          <View style={[styles.notch, styles.notchTop, { backgroundColor: notch }]} />
          <View style={[styles.dash, on && { borderColor: 'rgba(255,255,255,0.45)' }]} />
          <View style={[styles.notch, styles.notchBottom, { backgroundColor: notch }]} />
        </View>

        <View style={styles.codeSide}>
          {on ? (
            <View style={styles.appliedRow}>
              <AppIcon icon={Tick02Icon} size={13} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.appliedText}>Applied</Text>
            </View>
          ) : (
            <Text style={styles.code}>{coupon.code}</Text>
          )}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  row: {
    gap: 10,
    paddingHorizontal: 16,
  },
  ticket: {
    height: TICKET_H,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F7D9D9',
    overflow: 'hidden',
  },
  ticketOn: {
    backgroundColor: RED,
    borderColor: RED,
  },
  deal: {
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    minWidth: 112,
  },
  headline: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: RED,
  },
  terms: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  onText: {
    color: '#FFFFFF',
  },
  onSub: {
    color: 'rgba(255,255,255,0.85)',
  },
  perf: {
    width: 14,
    alignItems: 'center',
  },
  notch: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  notchTop: {
    top: -8,
  },
  notchBottom: {
    bottom: -8,
  },
  dash: {
    flex: 1,
    marginVertical: 9,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#EFC4C4',
  },
  codeSide: {
    justifyContent: 'center',
    paddingLeft: 6,
    paddingRight: 14,
  },
  code: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#1C1C1E',
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
