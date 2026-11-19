import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Shop' }} />
      <Tabs.Screen name="cart" options={{ title: 'Basket' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      {/* Recipes is reached from the home screen, not the tab bar */}
      <Tabs.Screen name="recipes" options={{ href: null }} />
    </Tabs>
  );
}
