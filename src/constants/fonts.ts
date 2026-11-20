import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

// Type system.
//  · Display: Bricolage Grotesque, a characterful grotesque with lively
//    numerals, for big moments (ETA, screen and section titles).
//  · UI: Plus Jakarta Sans, a soft geometric sans that echoes the rounded
//    "Magicmeat" wordmark, for labels, chips and search.
// Custom fonts carry their weight in the family name, so don't also set
// fontWeight on these styles (Android would fall back to the system font).
export const FONT_ASSETS = {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

export const FONT = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
} as const;
