import { Platform, type ImageStyle, type ImageSourcePropType } from 'react-native';
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

/**
 * Tile tints. Every tint has the same lightness (≈94.5 %) and a gentle
 * saturation, and its hue follows the food on the plate: peach for chicken,
 * rose for mutton, a cool sea-blue for fish, apricot for curry cuts, cream
 * for eggs, sage for vegetables. Equal lightness keeps the grid calm; the
 * hue shift lets each tile read at a glance, and the food stays the most
 * saturated thing on screen. 'all' is a quiet neutral so the brand-red icon
 * leads.
 */
export const CATEGORY_TINT: Record<string, string> = {
  chicken: '#FAEDE8',
  mutton: '#F9E9EB',
  fish: '#EBF2F7',
  'curry-cuts': '#FAF0E8',
  eggs: '#F9F5E9',
  'fresh-produce': '#EDF6EC',
  all: '#F0F0F2',
};

export const categoryTint = (id: string) => CATEGORY_TINT[id] || CATEGORY_TINT.all;

// The plate floats above the tile with its own soft drop shadow that
// follows its round shape (filter on web/Android, layer shadow on iOS).
export const CATEGORY_IMG_3D: ImageStyle =
  Platform.OS === 'ios'
    ? { shadowColor: '#4A2410', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 4 }
    : ({ filter: 'drop-shadow(0px 3px 3px rgba(74,36,16,0.14))' } as ImageStyle);
