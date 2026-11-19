import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import {
  AppIcon,
  Home01Icon,
  GridViewIcon,
  ShoppingBag01Icon,
  DeliveryBox01Icon,
} from '../../components/HugeIcon';

export default function TabLayout() {
  const cartCount = useStore((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: '#FFFFFF',
              borderTopColor: 'rgba(60, 60, 67, 0.18)',
              borderTopWidth: StyleSheet.hairlineWidth,
              height: 60 + bottomInset,
              paddingBottom: bottomInset,
              paddingTop: 6,
              elevation: 0,
            },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AppIcon icon={Home01Icon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Shop',
          tabBarAccessibilityLabel: 'Shop all products',
          tabBarIcon: ({ color, focused }) => (
            <AppIcon icon={GridViewIcon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Basket',
          tabBarAccessibilityLabel: cartCount > 0 ? `Basket, ${cartCount} items` : 'Basket',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <AppIcon icon={ShoppingBag01Icon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarAccessibilityLabel: 'Your orders',
          tabBarIcon: ({ color, focused }) => (
            <AppIcon icon={DeliveryBox01Icon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
      {/* Hide recipes tab from bar, accessible via categories */}
      <Tabs.Screen
        name="recipes"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: '#DC2626',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
