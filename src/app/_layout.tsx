import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { CutSelectorModal } from '../components/CutSelectorModal';
import { LocationSelectorModal } from '../components/LocationSelectorModal';
import {
  ensureGuestSession,
  isAdmin,
  subscribeAllOrders,
  subscribeMyOrders,
  subscribeProducts,
  watchAuth,
} from '../services/backend';
import type { Order } from '../types';
import { useStore } from '../store/useStore';

export default function RootLayout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const isDarkScreen =
    !pathname ||
    pathname === '/' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/' ||
    pathname === '/(tabs)/index';

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'magicmeat-web-root-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          * {
            box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Live prices and stock for everyone.
  useEffect(() => {
    return subscribeProducts((inventory) => {
      useStore.setState((state) => ({ inventory: { ...state.inventory, ...inventory } }));
    });
  }, []);

  // Sign every visitor in as a guest, then follow their orders. An admin who
  // signs in with email follows every order instead.
  useEffect(() => {
    let stopOrders: (() => void) | null = null;

    const applyOrders = (orders: Order[]) => {
      const active = orders.find((o) => o.status !== 'delivered' && o.status !== 'cancelled') || null;
      useStore.setState({ orders, activeOrder: active });
    };

    const stopAuth = watchAuth(async (user) => {
      stopOrders?.();
      stopOrders = null;

      if (!user) {
        useStore.setState({ uid: null, isAdmin: false, orders: [], activeOrder: null });
        ensureGuestSession().catch((e) => console.warn('[auth] guest sign-in failed', e?.code || e));
        return;
      }

      const admin = user.isAnonymous ? false : await isAdmin(user.uid);
      useStore.setState({ uid: user.uid, isAdmin: admin });
      stopOrders = admin ? subscribeAllOrders(applyOrders) : subscribeMyOrders(user.uid, applyOrders);
    });

    return () => {
      stopOrders?.();
      stopAuth();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={[styles.outerContainer, isDesktop && styles.outerContainerDesktop]}>
        <StatusBar style={isDarkScreen ? 'light' : 'dark'} />
        <View style={[styles.contentContainer, isDesktop && styles.contentContainerDesktop]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: THEME.colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="product/[id]"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="checkout"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="order-tracking/[id]"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="location-select"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="profile-menu"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
          </Stack>

          {/* Global Cut Customizer Modal */}
          <CutSelectorModal />

          {/* Global Location Selector Modal */}
          <LocationSelectorModal />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  outerContainerDesktop: {
    backgroundColor: '#FFFFFF',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  contentContainerDesktop: {
    width: '100%',
    minHeight: '100vh' as any,
    backgroundColor: '#FFFFFF',
  },
});
