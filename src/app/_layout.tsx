import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { CutSelectorModal } from '../components/CutSelectorModal';
import { LocationSelectorModal } from '../components/LocationSelectorModal';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { DialogHost } from '../components/DialogHost';
import { onOrderNotificationTap, registerForPush } from '../services/notifications';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from '../constants/fonts';
import {
  fetchProfile,
  isAdmin,
  isPhoneUser,
  phoneOf,
  subscribeAllOrders,
  subscribeMyOrders,
  saveWishlist,
  subscribeCoupons,
  subscribeWishlist,
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
    !pathname || pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/(tabs)/index';

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

  // Tapping an order notification opens that order.
  useEffect(
    () => onOrderNotificationTap((id) => router.push({ pathname: '/order-tracking/[id]', params: { id } })),
    []
  );

  // Live coupons (offers strip, checkout, admin).
  useEffect(() => subscribeCoupons((coupons) => useStore.setState({ coupons })), []);

  // Live prices and stock for everyone.
  useEffect(() => {
    return subscribeProducts((inventory) => {
      useStore.setState((state) => ({
        inventory: { ...state.inventory, ...inventory },
      }));
    });
  }, []);

  // Customers log in with their mobile number (OTP); then follow their
  // orders. An admin who signs in with email follows every order instead.
  // Old guest (anonymous) sessions count as logged out.
  useEffect(() => {
    let stopOrders: (() => void) | null = null;

    const applyOrders = (orders: Order[]) => {
      const active = orders.find((o) => o.status !== 'delivered' && o.status !== 'cancelled') || null;
      useStore.setState({ orders, activeOrder: active });
    };

    let stopWishlist: (() => void) | null = null;
    const stopAuth = watchAuth(async (user) => {
      stopOrders?.();
      stopOrders = null;
      stopWishlist?.();
      stopWishlist = null;

      if (!user || user.isAnonymous) {
        useStore.setState({
          uid: null,
          isAdmin: false,
          orders: [],
          activeOrder: null,
          authState: 'out',
        });
        return;
      }

      const admin = isPhoneUser(user) ? false : await isAdmin(user.uid);
      useStore.setState({ uid: user.uid, isAdmin: admin, authState: 'in' });
      if (isPhoneUser(user)) {
        // Order updates and offers by push (asks once; native only).
        registerForPush(user.uid);
        // Saved items follow the account. First snapshot: merge what this
        // phone had with what the account has, and store the union.
        let firstWishlist = true;
        stopWishlist = subscribeWishlist(user.uid, (remote) => {
          const local = useStore.getState().wishlist;
          if (firstWishlist) {
            firstWishlist = false;
            const merged = [...new Set([...(remote || []), ...local])];
            useStore.setState({ wishlist: merged });
            if (!remote || merged.length !== remote.length) saveWishlist(merged).catch(() => {});
            return;
          }
          if (remote) useStore.setState({ wishlist: remote });
        });
        // The verified number is the account's number; keep any saved name.
        const phone = phoneOf(user);
        const { profile, setProfile } = useStore.getState();
        if (profile.phone !== phone) setProfile({ ...profile, phone });
        fetchProfile().then((saved) => {
          const current = useStore.getState().profile;
          if (saved?.name && !current.name)
            setProfile({
              ...current,
              name: saved.name,
              email: saved.email || current.email,
            });
        });
      }
      stopOrders = admin ? subscribeAllOrders(applyOrders) : subscribeMyOrders(user.uid, applyOrders);
    });

    return () => {
      stopOrders?.();
      stopWishlist?.();
      stopAuth();
    };
  }, []);

  const authState = useStore((s) => s.authState);
  // Brand fonts; the splash stays up until they're in (or failed, then the
  // system font is used).
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const fontsReady = fontsLoaded || !!fontError;
  const signedIn = authState === 'in';

  // Logged out: always land on the login screen.
  useEffect(() => {
    if (authState === 'out' && pathname !== '/login') {
      router.replace('/login');
    }
  }, [authState, pathname]);

  if (authState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.boot}>
          <ActivityIndicator color="#DC2626" />
        </View>
        <AnimatedSplash ready={false} />
      </SafeAreaProvider>
    );
  }

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
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={signedIn}>
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
              <Stack.Screen name="wishlist" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen
                name="search"
                options={{
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              {/* Staff open /admin after logging in, then sign in with their email there. */}
              <Stack.Screen name="admin" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>

          {/* Global Cut Customizer Modal */}
          <CutSelectorModal />

          {/* Global Location Selector Modal */}
          <LocationSelectorModal />
        </View>
      </View>
      <DialogHost />
      <AnimatedSplash ready={fontsReady} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
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
