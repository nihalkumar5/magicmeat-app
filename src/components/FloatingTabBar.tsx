import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext, type BottomTabBarProps } from 'expo-router/tabs';
import { useStore } from '../store/useStore';
import { AppIcon, Home01Icon, GridViewIcon, ShoppingBag01Icon, DeliveryBox01Icon } from './HugeIcon';
import { prefersReducedMotion, useBump } from './motion';
import { haptic } from '../utils/haptics';

const BAR_HEIGHT = 62;
const BAR_GAP = 10;
const RED = '#DC2626';

const TABS: Record<string, { label: string; icon: any }> = {
  index: { label: 'Home', icon: Home01Icon },
  explore: { label: 'Shop', icon: GridViewIcon },
  cart: { label: 'Basket', icon: ShoppingBag01Icon },
  orders: { label: 'Orders', icon: DeliveryBox01Icon },
};

// Space the floating bar takes at the bottom of a tab screen, so fixed
// footers (cart bar, checkout button) can sit above it. 0 outside the tabs.
// Shown on every screen size, desktop web included.
export function useTabBarInset(): number {
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;
  const insets = useSafeAreaInsets();
  if (!inTabs) return 0;
  return BAR_HEIGHT + Math.max(insets.bottom, BAR_GAP) + BAR_GAP;
}

// Floating capsule tab bar (the iOS "Liquid Glass" look used by Uber Eats,
// Subway and Crumbl): inset from the edges, rounded, with a soft highlight
// behind the selected tab.
export function FloatingTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const cartCount = useStore((s) => s.cart.reduce((n, item) => n + item.quantity, 0));

  const routes = state.routes.filter((r) => TABS[r.name]);
  const activeIndex = Math.max(
    0,
    routes.findIndex((r) => r.key === state.routes[state.index]?.key),
  );

  // The highlight slides from tab to tab (iOS segmented-control feel).
  const [barW, setBarW] = useState(0);
  const [x] = useState(() => new Animated.Value(activeIndex));
  useEffect(() => {
    if (prefersReducedMotion()) {
      x.setValue(activeIndex);
      return;
    }
    Animated.spring(x, { toValue: activeIndex, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
  }, [x, activeIndex]);
  const slotW = routes.length ? (barW - 12) / routes.length : 0;
  const pillW = Math.min(slotW - 6, 84);
  const translateX = Animated.multiply(x, slotW);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, BAR_GAP) }]}>
      <View style={styles.bar} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {barW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.slider, { width: pillW, left: 6 + (slotW - pillW) / 2, transform: [{ translateX }] }]}
          />
        )}
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const tab = TABS[route.name];
          const badge = route.name === 'cart' && cartCount > 0 ? cartCount : 0;

          const onPress = () => {
            if (!focused) haptic.select();
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${tab.label}, ${badge} items` : tab.label}
            >
              <View style={styles.pill}>
                <TabIcon icon={tab.icon} focused={focused}>
                  {!!badge && <Badge count={badge} />}
                </TabIcon>
                <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Icon springs up a little when its tab becomes active.
function TabIcon({ icon, focused, children }: { icon: any; focused: boolean; children?: React.ReactNode }) {
  const bump = useBump(focused, focused ? 1.18 : 1);
  return (
    <Animated.View style={{ transform: [{ scale: bump }] }}>
      <AppIcon icon={icon} size={22} color={focused ? RED : '#6B7280'} strokeWidth={focused ? 2.2 : 1.8} />
      {children}
    </Animated.View>
  );
}

// Basket count pops when it changes.
function Badge({ count }: { count: number }) {
  const bump = useBump(count, 1.35);
  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: bump }] }]}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slider: {
    position: 'absolute',
    top: (BAR_HEIGHT - 50) / 2,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF2F2',
  },
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bar: {
    width: '100%',
    maxWidth: 440,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    minWidth: 68,
    paddingHorizontal: 10,
    borderRadius: 25,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  labelOn: {
    color: RED,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: RED,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
