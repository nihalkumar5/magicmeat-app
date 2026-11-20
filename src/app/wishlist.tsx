import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { BRUSH } from '../constants/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useStore, defaultCutFor } from '../store/useStore';
import { PRODUCTS } from '../data/mockData';
import { ShopCard } from '../components/ShopCard';
import { FadeInUp, PressableScale } from '../components/motion';
import { goBack } from '../utils/navigation';
import { haptic } from '../utils/haptics';
import { notify } from '../utils/dialogs';
import { AppIcon, ArrowLeft01Icon } from '../components/HugeIcon';

const C = {
  bg: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  red: '#DC2626',
  heart: '#E11D48',
};

const GAP = 12;
const SIDE = 16;

// Saved items: everything the customer hearted, as the same cards as the
// shop (Add, heart to remove), newest first, with one tap to add the lot.
export default function WishlistScreen() {
  const { width } = useWindowDimensions();
  const wishlist = useStore((s) => s.wishlist);
  const inventory = useStore((s) => s.inventory);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);

  const items = [...wishlist]
    .reverse()
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is (typeof PRODUCTS)[number] => !!p);

  const isOut = (id: string) => {
    const inv = inventory[id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  };
  const addable = items.filter((p) => !isOut(p.id) && !cart.some((c) => c.product.id === p.id));
  const cardW = (Math.min(width, 768) - SIDE * 2 - GAP) / 2;

  const addAll = () => {
    if (addable.length === 0) return;
    haptic.success();
    for (const p of addable) addToCart(p, defaultCutFor(p), true, 1);
    notify('Added to basket', `${addable.length} item${addable.length === 1 ? '' : 's'} added.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.nav}>
        <TouchableOpacity style={styles.back} onPress={() => goBack('/profile-menu')} accessibilityLabel="Back">
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: addable.length ? 110 : 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>Saved items</Text>
          {items.length > 0 && (
            <Text style={styles.sub}>
              {items.length} item{items.length === 1 ? '' : 's'} · tap the heart to remove
            </Text>
          )}
        </View>

        {items.length === 0 ? (
          <FadeInUp style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Svg width={34} height={34} viewBox="0 0 24 24">
                <Path
                  d="M12 20.5c-.3 0-.6-.1-.8-.3C7.4 17 4 14 4 10.2 4 7.6 6 5.5 8.5 5.5c1.4 0 2.7.7 3.5 1.8.8-1.1 2.1-1.8 3.5-1.8C18 5.5 20 7.6 20 10.2c0 3.8-3.4 6.8-7.2 10-.2.2-.5.3-.8.3Z"
                  fill={C.heart}
                />
              </Svg>
            </View>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptySub}>Tap the heart on any product to keep it here for your next order.</Text>
            <PressableScale style={styles.browse} onPress={() => router.push('/(tabs)/explore')} haptics="tap">
              <Text style={styles.browseText}>Browse products</Text>
            </PressableScale>
          </FadeInUp>
        ) : (
          <View style={styles.grid}>
            {items.map((p, i) => (
              <FadeInUp key={p.id} delay={i * 40} distance={10}>
                <ShopCard product={p} width={cardW} />
              </FadeInUp>
            ))}
          </View>
        )}
      </ScrollView>

      {addable.length > 0 && (
        <View style={styles.footer}>
          <PressableScale style={styles.addAll} onPress={addAll} scaleTo={0.98}>
            <Text style={styles.addAllText}>
              Add {addable.length === items.length ? 'all' : addable.length} to basket
            </Text>
          </PressableScale>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  nav: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    paddingHorizontal: SIDE,
    paddingTop: 4,
    paddingBottom: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: SIDE,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: BRUSH,
    fontSize: 30,
    lineHeight: 34,
    color: C.text,
  },
  emptySub: {
    fontSize: 15,
    lineHeight: 21,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 6,
  },
  browse: {
    marginTop: 22,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 25,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  addAll: {
    height: 54,
    borderRadius: 27,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAllText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
