import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { haptic } from '../utils/haptics';

// Motion kit. One set of curves and springs for the whole app, so every
// press, entrance and count change feels like the same product.
//  · Springs for anything the finger touches (they follow, then settle).
//  · Ease-out for things that arrive on their own (fast in, gentle stop).
//  · Everything honours Reduce Motion.

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotion = !!v;
  })
  .catch(() => {});
try {
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    reduceMotion = !!v;
  });
} catch {}

export const prefersReducedMotion = () => reduceMotion;

export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const PRESS_SPRING = { speed: 40, bounciness: 0 };
export const RELEASE_SPRING = { speed: 18, bounciness: 9 };

/* ------------------------------------------------------- PressableScale */

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** Style of the visible (scaling) element: size, colour, radius… */
  style?: StyleProp<ViewStyle>;
  /** Style of the touch area, for layout such as flex: 1. */
  containerStyle?: StyleProp<ViewStyle>;
  /** How far it sinks while pressed. */
  scaleTo?: number;
  /** Haptic on press. */
  haptics?: 'tap' | 'select' | false;
};

/** Sinks under the finger and springs back: the app's standard press. */
export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  haptics = false,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number, spring: typeof PRESS_SPRING) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, ...spring }).start();
  };
  return (
    <Pressable
      style={containerStyle}
      onPressIn={(e: GestureResponderEvent) => {
        to(scaleTo, PRESS_SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        to(1, RELEASE_SPRING);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptics) haptic[haptics]();
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------- FadeInUp */

/** Rises and fades in once on mount. Use `delay` to stagger lists. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 14,
  duration = 460,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [p] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    const a = Animated.timing(p, { toValue: 1, duration, delay, easing: EASE_OUT, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, delay, duration]);
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return <Animated.View style={[style, { opacity: p, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/* --------------------------------------------------------------- PopIn */

/** Springs from small to full size on mount: for things that swap in
 *  place, like Add → stepper. Give it a `key` that changes with the state. */
export function PopIn({ children, style, from = 0.7 }: { children: ReactNode; style?: StyleProp<ViewStyle>; from?: number }) {
  const [p] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    const a = Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 10 });
    a.start();
    return () => a.stop();
  }, [p]);
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [from, 1] });
  const opacity = p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] });
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

/* ------------------------------------------------------------- useBump */

/** A scale that pops whenever `value` changes (counts, totals, badges). */
export function useBump(value: unknown, amount = 1.18): Animated.Value {
  const [scale] = useState(() => new Animated.Value(1));
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    if (reduceMotion) return;
    scale.setValue(amount);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14 }).start();
  }, [value, amount, scale]);
  return scale;
}
