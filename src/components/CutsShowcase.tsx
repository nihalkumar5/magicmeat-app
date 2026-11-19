import { useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, useWindowDimensions, Pressable } from 'react-native';
import { router } from 'expo-router';
import { PRODUCTS } from '../data/mockData';
import { useStore, defaultCutFor } from '../store/useStore';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { haptic } from '../utils/haptics';
import { PressableScale, useBump } from './motion';
import { AppIcon, PlusSignIcon } from './HugeIcon';
import type { Product } from '../types';

// "The butcher's cuts": an editorial, image-led carousel between the
// promise card and the shelves.
//  · Large portrait cards with a peek of the next one, snapping per card.
//  · The centred card is full size; its neighbours sit back (scale, dim).
//  · Photos move slower than their cards (parallax), so the row has depth.
//  · A thin progress line under the row tracks the scroll.
// Tap a card for the product; the round + adds the usual cut to the basket.

const PICKS: { id: string; eyebrow: string; line: string }[] = [
  { id: 'c3', eyebrow: 'Chicken', line: 'Juicy and bone-in. Made for tandoori and roasts.' },
  { id: 'm5', eyebrow: 'Mutton', line: 'Tender boneless pieces for korma and kebabs.' },
  { id: 'f2', eyebrow: 'Fish', line: 'Katla, cleaned and cut into curry steaks.' },
  { id: 'c7', eyebrow: 'Chicken', line: 'Lean cubes for tikka, stir-fry and biryani.' },
  { id: 'm2', eyebrow: 'Mutton', line: 'Bone-in and cut big, the way biryani needs it.' },
];

const GAP = 12;
const SIDE = 16;
const RED = '#DC2626';

const shortName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

export function CutsShowcase() {
  const { width: screenW } = useWindowDimensions();
  const viewW = Math.min(screenW, 768);
  const cardW = Math.round(viewW * 0.7);
  const cardH = Math.round(cardW * 1.28);
  const step = cardW + GAP;
  const [scrollX] = useState(() => new Animated.Value(0));

  const items = PICKS.map((p) => ({ ...p, product: PRODUCTS.find((x) => x.id === p.id) })).filter(
    (p): p is (typeof PICKS)[number] & { product: Product } => !!p.product,
  );
  if (items.length === 0) return null;

  const TRACK = 72;
  const thumbW = TRACK / items.length;
  const thumbX = scrollX.interpolate({
    inputRange: [0, Math.max(1, (items.length - 1) * step)],
    outputRange: [0, TRACK - thumbW],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>HAND-CUT TO ORDER</Text>
          <Text style={styles.title}>The butcher’s cuts</Text>
        </View>
      </View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
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
  item: { id: string; eyebrow: string; line: string; product: Product };
  index: number;
  step: number;
  w: number;
  h: number;
  scrollX: Animated.Value;
}) {
  const { product } = item;
  const qty = useStore((s) => s.cart.filter((c) => c.product.id === product.id).reduce((n, c) => n + c.quantity, 0));
  const soldOut = useStore((s) => {
    const inv = s.inventory[product.id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  });
  const addToCart = useStore((s) => s.addToCart);
  const bump = useBump(qty, 1.25);

  const input = [(index - 1) * step, index * step, (index + 1) * step];
  const scale = scrollX.interpolate({ inputRange: input, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
  const lift = scrollX.interpolate({ inputRange: input, outputRange: [10, 0, 10], extrapolate: 'clamp' });
  const dim = scrollX.interpolate({ inputRange: input, outputRange: [0.35, 0, 0.35], extrapolate: 'clamp' });
  const parallax = scrollX.interpolate({
    inputRange: input,
    outputRange: [-w * 0.14, 0, w * 0.14],
    extrapolate: 'clamp',
  });
  const copyY = scrollX.interpolate({ inputRange: input, outputRange: [14, 0, 14], extrapolate: 'clamp' });
  const copyOpacity = scrollX.interpolate({ inputRange: input, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });

  const add = () => {
    if (soldOut) return;
    haptic.tap();
    addToCart(product, defaultCutFor(product), true, 1);
  };

  return (
    <Animated.View style={{ width: w, height: h, transform: [{ translateY: lift }, { scale }] }}>
      <PressableScale
        style={[styles.card, { width: w, height: h }]}
        scaleTo={0.97}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        accessibilityRole="button"
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

        {/* Bottom scrim, built from stacked bands so it needs no gradient lib */}
        <View pointerEvents="none" style={styles.scrim}>
          {[0.0, 0.12, 0.28, 0.44, 0.58, 0.7, 0.8].map((o, k) => (
            <View key={k} style={{ flex: 1, backgroundColor: `rgba(12,6,4,${o})` }} />
          ))}
        </View>

        {/* Neighbours sit back */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, { opacity: dim }]} />

        <View style={styles.chip}>
          <Text style={styles.chipText}>{item.eyebrow.toUpperCase()}</Text>
        </View>

        <Animated.View style={[styles.copy, { opacity: copyOpacity, transform: [{ translateY: copyY }] }]}>
          <Text style={styles.name} numberOfLines={2}>
            {shortName(product.name)}
          </Text>
          <Text style={styles.line} numberOfLines={2}>
            {item.line}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.price}>
              ₹{product.basePrice}
              <Text style={styles.weight}> · {product.netWeight}</Text>
            </Text>
            {/* the real + button sits above the card (no button inside a button) */}
            <View style={styles.addSpace} />
          </View>
        </Animated.View>
      </PressableScale>

      <Animated.View style={[styles.addSlot, { opacity: copyOpacity, transform: [{ translateY: copyY }] }]}>
        <Pressable
          onPress={add}
          disabled={soldOut}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={soldOut ? `${shortName(product.name)} is sold out` : `Add ${shortName(product.name)}`}
        >
          <Animated.View style={[styles.addBtn, soldOut && styles.addOff, { transform: [{ scale: bump }] }]}>
            {soldOut ? (
              <Text style={styles.soldOut}>Sold out</Text>
            ) : qty > 0 ? (
              <Text style={styles.qty}>{qty}</Text>
            ) : (
              <AppIcon icon={PlusSignIcon} size={18} color={RED} strokeWidth={2.6} />
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 26,
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SIDE,
    marginBottom: 14,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: RED,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#111111',
    marginTop: 3,
  },
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '64%',
  },
  dim: {
    backgroundColor: '#FFFFFF',
  },
  chip: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#111111',
  },
  copy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 27,
    color: '#FFFFFF',
  },
  line: {
    fontSize: 13.5,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  weight: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  addSpace: {
    width: 42,
    height: 42,
  },
  addSlot: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  addBtn: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOff: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  qty: {
    fontSize: 16,
    fontWeight: '800',
    color: RED,
  },
  soldOut: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  progressTrack: {
    alignSelf: 'center',
    width: 72,
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressThumb: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111111',
  },
});
