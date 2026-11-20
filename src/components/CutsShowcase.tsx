import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { PRODUCTS } from '../data/mockData';
import { useStore, defaultCutFor } from '../store/useStore';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { haptic } from '../utils/haptics';
import { PressableScale, PopIn, useBump } from './motion';
import { AppIcon, PlusSignIcon, MinusSignIcon } from './HugeIcon';
import { FONT } from '../constants/fonts';
import { GUTTER, PHI, RADIUS, SPACE, TYPE } from '../constants/layout';
import type { Product } from '../types';

// "Today's fresh cuts": large photo cards with motion, dressed in the app's
// own language.
//  · Full-bleed photo; the centred card is full size, neighbours sit back
//    (scale + soft white veil) and photos drift slower than their cards.
//  · A white glass panel at the bottom carries the name (display font),
//    one line, price and the same ADD / stepper as the shop.
//  · Card proportions follow √φ (1 : 1.272), spacing the φ scale.

const PICKS: { id: string; tag: string; line: string }[] = [
  { id: 'c3', tag: 'Chicken', line: 'Juicy and bone-in. Made for tandoori and roasts.' },
  { id: 'm5', tag: 'Mutton', line: 'Tender boneless pieces for korma and kebabs.' },
  { id: 'f2', tag: 'Fish', line: 'Katla, cleaned and cut into curry steaks.' },
  { id: 'c7', tag: 'Chicken', line: 'Lean cubes for tikka, stir-fry and biryani.' },
  { id: 'm2', tag: 'Mutton', line: 'Bone-in and cut big, the way biryani needs it.' },
];

const RED = '#DC2626';
const shortName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

export function CutsShowcase() {
  const { width: screenW } = useWindowDimensions();
  const viewW = Math.min(screenW, 768);
  const cardW = Math.round(viewW * 0.7);
  const cardH = Math.round(cardW * Math.sqrt(PHI)); // √φ ≈ 1.272
  const step = cardW + SPACE.md;
  const [scrollX] = useState(() => new Animated.Value(0));

  const items = PICKS.map((p) => ({ ...p, product: PRODUCTS.find((x) => x.id === p.id) })).filter(
    (p): p is (typeof PICKS)[number] & { product: Product } => !!p.product,
  );
  if (items.length === 0) return null;

  const TRACK = 55;
  const thumbW = TRACK / items.length;
  const thumbX = scrollX.interpolate({
    inputRange: [0, Math.max(1, (items.length - 1) * step)],
    outputRange: [0, TRACK - thumbW],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap}>
      {/* Same header pattern as every other home section */}
      <View style={styles.head}>
        <Text style={styles.title}>Today’s fresh cuts</Text>
        <Text style={styles.sub}>Cut fresh to order, packed cold</Text>
      </View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: SPACE.md }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      >
        {items.map((item, i) => (
          <CutCard key={item.id} item={item} index={i} step={step} w={cardW} h={cardH} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressThumb, { width: thumbW, transform: [{ translateX: thumbX }] }]} />
      </View>
    </View>
  );
}

function CutCard({
  item,
  index,
  step,
  w,
  h,
  scrollX,
}: {
  item: { id: string; tag: string; line: string; product: Product };
  index: number;
  step: number;
  w: number;
  h: number;
  scrollX: Animated.Value;
}) {
  const { product } = item;
  const cartItem = useStore((s) => s.cart.find((c) => c.product.id === product.id));
  const qty = cartItem?.quantity ?? 0;
  const soldOut = useStore((s) => {
    const inv = s.inventory[product.id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  });
  const addToCart = useStore((s) => s.addToCart);
  const updateQuantity = useStore((s) => s.updateQuantity);
  const bump = useBump(qty);

  const input = [(index - 1) * step, index * step, (index + 1) * step];
  const scale = scrollX.interpolate({ inputRange: input, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
  const lift = scrollX.interpolate({ inputRange: input, outputRange: [SPACE.sm, 0, SPACE.sm], extrapolate: 'clamp' });
  const veil = scrollX.interpolate({ inputRange: input, outputRange: [0.4, 0, 0.4], extrapolate: 'clamp' });
  const parallax = scrollX.interpolate({
    inputRange: input,
    outputRange: [-w * 0.14, 0, w * 0.14],
    extrapolate: 'clamp',
  });
  const panelY = scrollX.interpolate({ inputRange: input, outputRange: [SPACE.md, 0, SPACE.md], extrapolate: 'clamp' });
  const mrp = product.originalPrice && product.originalPrice > product.basePrice ? product.originalPrice : 0;

  const add = () => {
    haptic.tap();
    addToCart(product, defaultCutFor(product), true, 1);
  };

  return (
    <Animated.View style={{ width: w, height: h, transform: [{ translateY: lift }, { scale }] }}>
      <PressableScale
        style={[styles.card, { width: w, height: h }]}
        scaleTo={0.98}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
        accessibilityLabel={`${shortName(product.name)}, ₹${product.basePrice}. ${item.line}`}
      >
        {/* Photo, wider than the card so it can drift (parallax) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { left: -w * 0.16, right: -w * 0.16, transform: [{ translateX: parallax }] },
          ]}
        >
          <Image
            source={{ uri: optimizeImageUrl(product.image, 700) }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            fadeDuration={0}
          />
        </Animated.View>

        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>

        {/* Liquid glass panel: blur of the photo behind, a light tint, a
            bright rim on top and a soft inner sheen, floating on a shadow */}
        <Animated.View style={[styles.panelShadow, { transform: [{ translateY: panelY }] }]}>
          <View style={styles.panel}>
            <BlurView
              intensity={55}
              tint="light"
              blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.glassTint} />
            <View pointerEvents="none" style={styles.sheen}>
              {[0.42, 0.28, 0.16, 0.07, 0].map((o, k) => (
                <View key={k} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${o})` }} />
              ))}
            </View>
            <View pointerEvents="none" style={styles.rim} />
            <Text style={styles.name} numberOfLines={1}>
              {shortName(product.name)}
            </Text>
            <Text style={styles.line} numberOfLines={2}>
              {item.line}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{product.basePrice}</Text>
              {!!mrp && <Text style={styles.mrp}>₹{mrp}</Text>}
              <Text style={styles.weight}>· {product.netWeight}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Neighbours sit back */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, { opacity: veil }]} />
      </PressableScale>

      {/* ADD / stepper (same as the shop), outside the card's press area */}
      <Animated.View style={[styles.action, { transform: [{ translateY: panelY }] }]}>
        {soldOut ? (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        ) : qty > 0 ? (
          <PopIn key="stepper" style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                haptic.tap();
                if (cartItem) updateQuantity(cartItem.cartItemId, -1);
              }}
              accessibilityLabel={`One less ${shortName(product.name)}`}
            >
              <AppIcon icon={MinusSignIcon} size={13} color="#FFFFFF" strokeWidth={2.8} />
            </TouchableOpacity>
            <Animated.Text style={[styles.stepQty, { transform: [{ scale: bump }] }]}>{qty}</Animated.Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => {
                haptic.tap();
                if (cartItem) updateQuantity(cartItem.cartItemId, 1);
              }}
              accessibilityLabel={`One more ${shortName(product.name)}`}
            >
              <AppIcon icon={PlusSignIcon} size={13} color="#FFFFFF" strokeWidth={2.8} />
            </TouchableOpacity>
          </PopIn>
        ) : (
          <PopIn key="add">
            <Pressable style={styles.addBtn} onPress={add} accessibilityLabel={`Add ${shortName(product.name)}`}>
              <Text style={styles.addText}>ADD</Text>
            </Pressable>
          </PopIn>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACE.xl,
  },
  head: {
    paddingHorizontal: GUTTER,
    marginBottom: SPACE.md,
  },
  title: {
    fontSize: TYPE.title,
    fontFamily: FONT.display,
    letterSpacing: -0.5,
    color: '#111111',
  },
  sub: {
    fontSize: TYPE.body,
    fontFamily: FONT.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  card: {
    borderRadius: RADIUS.lg + 4,
    overflow: 'hidden',
    backgroundColor: '#F4F4F6',
  },
  tag: {
    position: 'absolute',
    top: SPACE.md,
    left: SPACE.md,
    paddingHorizontal: SPACE.sm + 2,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  tagText: {
    fontSize: TYPE.micro,
    fontFamily: FONT.heavy,
    color: '#B91C1C',
    letterSpacing: 0.3,
  },
  panelShadow: {
    position: 'absolute',
    left: SPACE.sm,
    right: SPACE.sm,
    bottom: SPACE.sm,
    borderRadius: RADIUS.lg,
    shadowColor: '#1A0A06',
    shadowOffset: { width: 0, height: SPACE.sm },
    shadowOpacity: 0.18,
    shadowRadius: SPACE.lg,
    elevation: 6,
  },
  panel: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.md - 1,
    paddingBottom: SPACE.md - 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    // Fallback where blur isn't available (and on web with backdrop-filter).
    backgroundColor: 'rgba(255,255,255,0.18)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)' } as object)
      : {}),
  },
  // Light tint so dark text stays readable over any photo.
  glassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  // Soft light falling from the top edge.
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
  },
  // Bright specular rim along the top, like light catching glass.
  rim: {
    position: 'absolute',
    left: SPACE.md,
    right: SPACE.md,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  name: {
    fontSize: TYPE.lead + 2,
    fontFamily: FONT.display,
    letterSpacing: -0.4,
    color: '#111111',
  },
  line: {
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: FONT.medium,
    color: '#6B7280',
    marginTop: SPACE.xxs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.xs,
    marginTop: SPACE.sm,
    paddingRight: 76, // room for ADD
    minHeight: 30,
  },
  price: {
    fontSize: TYPE.lead,
    fontFamily: FONT.heavy,
    color: '#111111',
  },
  mrp: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  weight: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: '#6B7280',
  },
  veil: {
    backgroundColor: '#FFFFFF',
  },
  action: {
    position: 'absolute',
    right: SPACE.sm + SPACE.md,
    bottom: SPACE.sm + SPACE.md - 2,
  },
  addBtn: {
    minWidth: 64,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: RED,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: RED,
    fontSize: TYPE.body,
    fontFamily: FONT.heavy,
    letterSpacing: 0.3,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 9,
    backgroundColor: RED,
  },
  stepBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    minWidth: 14,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: TYPE.body,
    fontFamily: FONT.heavy,
  },
  soldOut: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: '#6B7280',
  },
  progressTrack: {
    alignSelf: 'center',
    width: 55,
    height: 4,
    borderRadius: 2,
    marginTop: SPACE.md,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressThumb: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111111',
  },
});
