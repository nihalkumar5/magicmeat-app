import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Small, consistent haptics. Off on web, where the Vibration API buzzes
// phones far harder than a native "tick".
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** Light tap: add to basket, steppers, primary buttons. */
  tap: () => {
    if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Selection tick: tabs, segmented controls, chips. */
  select: () => {
    if (native) Haptics.selectionAsync().catch(() => {});
  },
  /** Success: order placed, login done. */
  success: () => {
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Warning: wrong code, sold out. */
  warn: () => {
    if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
