import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { savePushToken } from './backend';

// Push notifications (Expo push service; FCM on Android, APNs on iOS).
// The device's Expo push token is stored at pushTokens/{uid}; the OTP
// server (server/api/notify/*) sends order updates and admin broadcasts.

// Show alerts while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ORDER_CHANNEL = 'orders';
export const OFFERS_CHANNEL = 'offers';

let registeredFor: string | null = null;

/** Asks for permission (once) and saves this device's push token. */
export async function registerForPush(uid: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice || registeredFor === uid) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ORDER_CHANNEL, {
        name: 'Order updates',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#DC2626',
      });
      await Notifications.setNotificationChannelAsync(OFFERS_CHANNEL, {
        name: 'Offers and news',
        importance: AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] no EAS projectId; run `eas init` so push tokens can be issued');
      return;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token, Platform.OS);
    registeredFor = uid;
  } catch (e) {
    console.warn('[push] registration failed', e);
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
