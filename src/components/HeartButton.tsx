import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '../store/useStore';
import { haptic } from '../utils/haptics';
import { prefersReducedMotion } from './motion';

const RED = '#E11D48';
// 24×24 heart, rounded lobes.
const HEART =
  'M12 20.5c-.3 0-.6-.1-.8-.3C7.4 17 4 14 4 10.2 4 7.6 6 5.5 8.5 5.5c1.4 0 2.7.7 3.5 1.8.8-1.1 2.1-1.8 3.5-1.8C18 5.5 20 7.6 20 10.2c0 3.8-3.4 6.8-7.2 10-.2.2-.5.3-.8.3Z';

/**
 * Save-to-wishlist heart. Saved = solid red; tapping it pops, sends out a
 * soft ring and gives a success tick. Two looks: a white round button for
 * photos ('round') and a bare icon ('bare').
 */
export function HeartButton({
  productId,
  size = 20,
  variant = 'round',
  style,
  label,
}: {
  productId: string;
  size?: number;
  variant?: 'round' | 'bare';
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const saved = useStore((s) => s.wishlist.includes(productId));
  const toggle = useStore((s) => s.toggleWishlist);
  const [scale] = useState(() => new Animated.Value(1));
  const [ring] = useState(() => new Animated.Value(0));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion()) return;
    scale.setValue(saved ? 0.6 : 0.85);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: saved ? 16 : 6 }).start();
    if (saved) {
      ring.setValue(0);
      Animated.timing(ring, { toValue: 1, duration: 520, useNativeDriver: true }).start();
    }
  }, [saved, scale, ring]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] });
  const box = variant === 'round' ? size + 20 : size + 8;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        if (saved) haptic.select();
        else haptic.success();
        toggle(productId);
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `Remove ${label || 'item'} from saved` : `Save ${label || 'item'}`}
      style={[{ width: box, height: box }, variant === 'round' && styles.round, style]}
    >
      <View style={styles.center}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size + 6, height: size + 6, borderRadius: size, opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
              d={HEART}
              fill={saved ? RED : 'none'}
              stroke={saved ? RED : '#111111'}
              strokeWidth={1.9}
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: RED,
  },
});
