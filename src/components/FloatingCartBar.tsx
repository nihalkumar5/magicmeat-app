import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { useTabBarInset } from './FloatingTabBar';
import { FREE_DELIVERY_ABOVE } from '../data/pricing';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { AppIcon, ArrowRight01Icon } from './HugeIcon';
import { PressableScale, useBump, prefersReducedMotion } from './motion';

const RED = '#DC2626';

// Compact "View basket" pill (Blinkit / Swiggy Instamart style): photos of
// what's in the basket, item count and total, a free-delivery nudge
// (Bolt Food style) and an arrow button.
const FloatingCartBarComponent: React.FC = () => {
  const tabInset = useTabBarInset();
  const cart = useStore((state) => state.cart);
  const fulfillment = useStore((state) => state.orderFulfillment);
  const deliveryMode = useStore((state) => state.deliveryMode);

  if (cart.length === 0) return null;
  return <CartBarBody cart={cart} fulfillment={fulfillment} deliveryMode={deliveryMode} tabInset={tabInset} />;
};

function CartBarBody({
  cart,
  fulfillment,
  deliveryMode,
  tabInset,
}: {
  cart: ReturnType<typeof useStore.getState>['cart'];
  fulfillment: string;
  deliveryMode: string;
  tabInset: number;
}) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const itemTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const toFree = FREE_DELIVERY_ABOVE - itemTotal;
  const progress = Math.min(1, itemTotal / FREE_DELIVERY_ABOVE);
  // Free delivery applies to Normal only; Express always has a fee.
  const showNudge = fulfillment === 'delivery' && deliveryMode !== 'instant';
  const thumbs = cart.slice(0, 3);

  // Arrives from below with a spring the first time something is added.
  const [enter] = useState(() => new Animated.Value(prefersReducedMotion() ? 1 : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
  }, [enter]);
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [90, 0] });

  // Pops when the count changes; the free-delivery line fills smoothly.
  const bump = useBump(totalItems, 1.05);
  const [fill] = useState(() => new Animated.Value(progress));
  useEffect(() => {
    Animated.timing(fill, { toValue: progress, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, progress]);
  const fillWidth = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        tabInset > 0 && { bottom: tabInset + 6 },
        { opacity: enter, transform: [{ translateY: enterY }, { scale: bump }] },
      ]}
    >
      <PressableScale
        style={styles.pill}
        scaleTo={0.97}
        haptics="tap"
        onPress={() => router.push('/(tabs)/cart')}
        accessibilityRole="button"
        accessibilityLabel={`View basket, ${totalItems} item${totalItems > 1 ? 's' : ''}, ₹${itemTotal}`}
      >
        <View style={[styles.thumbs, { width: 34 + (thumbs.length - 1) * 16 }]}>
          {thumbs.map((item, i) => (
            <Image
              key={item.cartItemId}
              source={{ uri: optimizeImageUrl(item.product.image, 80) }}
              style={[styles.thumb, { left: i * 16, zIndex: 3 - i }]}
            />
          ))}
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>View basket</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {totalItems} item{totalItems > 1 ? 's' : ''} · ₹{itemTotal}
          </Text>
        </View>

        <View style={styles.arrow}>
          <AppIcon icon={ArrowRight01Icon} size={18} color={RED} strokeWidth={2.6} />
        </View>

        {showNudge && (
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: fillWidth }]} />
          </View>
        )}
      </PressableScale>

      {showNudge && (
        <Text style={styles.nudge}>
          {toFree > 0 ? (
            <>
              Add <Text style={styles.nudgeStrong}>₹{toFree}</Text> more for free delivery
            </>
          ) : (
            <Text style={styles.nudgeStrong}>Free delivery unlocked</Text>
          )}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 250,
    maxWidth: 340,
    paddingLeft: 8,
    paddingRight: 6,
    height: 58,
    borderRadius: 29,
    backgroundColor: RED,
    overflow: 'hidden',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 10,
  },
  thumbs: {
    height: 34,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: '#FFFFFF',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  fill: {
    height: 3,
    backgroundColor: '#FFFFFF',
  },
  nudge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    color: '#374151',
  },
  nudgeStrong: {
    fontWeight: '800',
    color: '#15803D',
  },
});

export const FloatingCartBar = React.memo(FloatingCartBarComponent);
