import { useContext } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext, type BottomTabBarProps } from 'expo-router/tabs';
import { useStore } from '../store/useStore';
import { AppIcon, Home01Icon, GridViewIcon, ShoppingBag01Icon, DeliveryBox01Icon } from './HugeIcon';

const BAR_HEIGHT = 62;
const BAR_GAP = 10;
const RED = '#DC2626';

const TABS: Record<string, { label: string; icon: any }> = {
  index: { label: 'Home', icon: Home01Icon },
  explore: { label: 'Shop', icon: GridViewIcon },
  cart: { label: 'Basket', icon: ShoppingBag01Icon },
  orders: { label: 'Orders', icon: DeliveryBox01Icon },
};

const isDesktopWeb = (width: number) => Platform.OS === 'web' && width >= 768;

// Space the floating bar takes at the bottom of a tab screen, so fixed
// footers (cart bar, checkout button) can sit above it. 0 outside the tabs
// and on desktop web, where the bar is hidden.
export function useTabBarInset(): number {
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!inTabs || isDesktopWeb(width)) return 0;
  return BAR_HEIGHT + Math.max(insets.bottom, BAR_GAP) + BAR_GAP;
}

// Floating capsule tab bar (the iOS "Liquid Glass" look used by Uber Eats,
// Subway and Crumbl): inset from the edges, rounded, with a soft highlight
// behind the selected tab.
export function FloatingTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cartCount = useStore((s) => s.cart.reduce((n, item) => n + item.quantity, 0));

  if (isDesktopWeb(width)) return null;

  const routes = state.routes.filter((r) => TABS[r.name]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, BAR_GAP) }]}>
      <View style={styles.bar}>
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const tab = TABS[route.name];
          const badge = route.name === 'cart' && cartCount > 0 ? cartCount : 0;

          const onPress = () => {
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
              <View style={[styles.pill, focused && styles.pillOn]}>
                <View>
                  <AppIcon
                    icon={tab.icon}
                    size={22}
                    color={focused ? RED : '#6B7280'}
                    strokeWidth={focused ? 2.2 : 1.8}
                  />
                  {!!badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  )}
                </View>
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

const styles = StyleSheet.create({
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
  pillOn: {
    backgroundColor: '#FEF2F2',
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
