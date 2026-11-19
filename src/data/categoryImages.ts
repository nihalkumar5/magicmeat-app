import { Platform, type ImageStyle, type ImageSourcePropType, type ViewStyle } from 'react-native';
import type { MeatCategory } from '../types';

// MagicMeat category cut-outs (512px transparent PNGs on a plate). Shown on
// a soft warm tile with resizeMode "contain". 'all' has no photo; screens
// show a grid icon for it.
export const CATEGORY_IMAGES: Partial<Record<MeatCategory, ImageSourcePropType>> = {
  chicken: require('../../assets/categories/chicken.png'),
  mutton: require('../../assets/categories/mutton.png'),
  fish: require('../../assets/categories/fish.png'),
  'curry-cuts': require('../../assets/categories/curry-cuts.png'),
  eggs: require('../../assets/categories/eggs.png'),
  'fresh-produce': require('../../assets/categories/veggies-fruits.png'),
};

/** Warm tile colour behind the cut-outs. */
export const CATEGORY_TILE_BG = '#FBF4EE';

// The tile itself stays flat; only the photo gets depth.
export const CATEGORY_TILE_3D: ViewStyle = {
  backgroundColor: CATEGORY_TILE_BG,
};

// The plate floats above the tile with its own soft drop shadow that
// follows its round shape (filter on web/Android, layer shadow on iOS).
export const CATEGORY_IMG_3D: ImageStyle =
  Platform.OS === 'ios'
    ? { shadowColor: '#4A2410', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 7 }
    : ({ filter: 'drop-shadow(0px 8px 6px rgba(74,36,16,0.32)) drop-shadow(0px 2px 2px rgba(74,36,16,0.18))' } as ImageStyle);
