import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { savePushToken } from './backend';
import { orderLabel } from '../utils/orderId';
import type { Order, OrderStatus } from '../types';

// Show alerts while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const ORDER_CHANNEL = 'orders';
export const OFFERS_CHANNEL = 'offers';

let registeredFor: string | null = null;

/** Asks for permission and saves this device's push token. */
export async function registerForPush(uid: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice || registeredFor === uid) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
    return;
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ORDER_CHANNEL, {
        name: 'Order updates',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#DC2626',
        sound: 'default',
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync(OFFERS_CHANNEL, {
        name: 'Offers and news',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      '906bd961-0753-455c-b638-339f3dc00ff4';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token, Platform.OS);
    registeredFor = uid;
  } catch (e) {
    console.warn('[push] registration failed', e);
  }
}

/** Triggers immediate heads-up banner & vibration for any order status transition */
export function triggerLocalOrderNotification(order: Order, oldStatus?: OrderStatus) {
  const label = orderLabel(order.id);
  let title = '';
  let body = '';

  switch (order.status) {
    case 'placed':
      title = `🥩 Order Placed ${label}!`;
      body = `We received your order for ₹${order.total}. 100% fresh jhatka meat arriving soon!`;
      break;
    case 'butcher_prepping':
      title = `🔪 Butcher Prepping ${label}`;
      body = `Master butcher is preparing your fresh cuts right now.`;
      break;
    case 'cold_packed':
      title = `📦 Cold Packed ${label}`;
      body = `Your order is vacuum packed & sealed in cold chain packaging.`;
      break;
    case 'rider_assigned':
    case 'out_for_delivery':
      title = `🛵 Out For Delivery ${label}!`;
      body = order.riderName
        ? `${order.riderName} is on the way to your address!`
        : `Rider is on the way with your meat!`;
      break;
    case 'delivered':
      title = `✅ Delivered ${label}!`;
      body = `Your order has been delivered at your door. Enjoy! 😋`;
      break;
    case 'cancelled':
      title = `❌ Order Cancelled ${label}`;
      body = `Order was cancelled. Call support if unexpected.`;
      break;
    default:
      return;
  }

  // 1. Mobile System Notification Banner & Vibration
  if (Platform.OS !== 'web') {
    Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 400, 200, 400],
        data: { orderId: order.id },
      },
      trigger: null,
    }).catch((err) => console.warn('[local-notif] failed', err));

    try {
      Vibration.vibrate([0, 300, 150, 300], false);
    } catch {}
  } else {
    // 2. Web Browser Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch {}
    }
  }
}

/** Order id carried by a notification, if any. */
export function orderIdOf(response: Notifications.NotificationResponse | null | undefined): string | null {
  const data = response?.notification.request.content.data as { orderId?: unknown } | undefined;
  return typeof data?.orderId === 'string' ? data.orderId : null;
}

/** Calls `open` with the order id when the customer taps an order alert,
 *  including the tap that launched the app. Returns an unsubscribe. */
export function onOrderNotificationTap(open: (orderId: string) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      const id = orderIdOf(r);
      if (id) open(id);
    })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = orderIdOf(r);
    if (id) open(id);
  });
  return () => sub.remove();
}
