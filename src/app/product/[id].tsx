import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PRODUCTS } from '../../data/mockData';
import { useStore } from '../../store/useStore';
import { packVariantsFor, cutForPack } from '../../data/pricing';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { goBack } from '../../utils/navigation';
import {
  AppIcon,
  ArrowLeft01Icon,
  ShoppingBag01Icon,
  PlusSignIcon,
  MinusSignIcon,
  FavouriteIcon,
  ShieldCheckIcon,
  SnowflakeIcon,
  Cash01Icon,
  Clock01Icon,
} from '../../components/HugeIcon';

const C = {
  bg: '#FFFFFF',
  soft: '#F6F6F8',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.12)',
  red: '#DC2626',
  green: '#15803D',
  greenBg: '#ECFDF3',
};

const CATEGORY_LABEL: Record<string, string> = {
  chicken: 'Chicken',
  mutton: 'Mutton',
  fish: 'Fish',
  eggs: 'Eggs',
  'ready-to-cook': 'Ready to cook',
  'fresh-produce': 'Veggies & fruits',
};

// Price per kg for loose meat packs, so bigger packs show their value.
function perKg(price: number, netWeight: string): number {
  const grams = /^\d+g$/.test(netWeight) ? parseInt(netWeight, 10) : 0;
  return grams ? Math.round((price * 1000) / grams) : 0;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, wishlist, toggleWishlist, cart, updateQuantity, inventory } = useStore();
  const { width } = useWindowDimensions();
  const foundProduct = useMemo(() => PRODUCTS.find((p) => p.id === id), [id]);
  const product = foundProduct || PRODUCTS[0];

  const invItem = inventory[product.id];
  const isOutOfStock = invItem ? !invItem.inStock || invItem.stockKg <= 0 : false;

  // Pack sizes and prices come from data/pricing.ts, the same table Firestore
  // checks orders against.
  const packs = useMemo(() => packVariantsFor(product), [product]);
  const [packId, setPackId] = useState<string>(packs[0].id);
  const pack = packs.find((p) => p.id === packId) || packs[0];
  const packCut = useMemo(
    () => cutForPack(product, product.availableCuts[0], pack, pack.id === packs[0].id),
    [product, pack, packs]
  );

  // The pack with the lowest price per kg gets "Best value" (only when sizes differ).
  const bestValueId = useMemo(() => {
    if (packs.length < 2) return '';
    let best = packs[0];
    for (const p of packs) if (perKg(p.price, p.netWeight) < perKg(best.price, best.netWeight)) best = p;
    return best.id;
  }, [packs]);

  const cartItem = cart.find((item) => item.product.id === product.id && item.selectedCut.id === packCut.id);
  const inBasket = cartItem?.quantity ?? 0;
  const basketCount = cart.reduce((n, item) => n + item.quantity, 0);
  const basketTotal = cart.reduce((n, item) => n + item.unitPrice * item.quantity, 0);
  const [qty, setQty] = useState(1);
  const [showMore, setShowMore] = useState(false);

  const isLiked = wishlist.includes(product.id);
  const price = pack.price;
  const mrp = pack.originalPrice > price ? pack.originalPrice : 0;
  const off = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const macros = product.availableCuts?.[0]?.macros || product.macros;

  if (!foundProduct) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.emptyTitle}>Product not found</Text>
        <Text style={styles.emptySub}>This item may have been removed or the link is wrong.</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.link}>Back to shop</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const add = () => {
    addToCart(product, packCut, true, qty);
    setQty(1);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Floating controls */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.roundBtn} onPress={() => goBack('/(tabs)')} accessibilityLabel="Back">
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => toggleWishlist(product.id)}
            accessibilityLabel={isLiked ? 'Remove from saved' : 'Save'}
          >
            <AppIcon icon={FavouriteIcon} size={19} color={isLiked ? C.red : C.text} strokeWidth={2.1} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => router.push('/(tabs)/cart')}
            accessibilityLabel={`Basket, ${basketCount} items`}
          >
            <AppIcon icon={ShoppingBag01Icon} size={19} color={C.text} strokeWidth={2} />
            {basketCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{basketCount > 9 ? '9+' : basketCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Photo */}
        <View style={[styles.photoWrap, { height: Math.min(width, 520) * 0.86 }]}>
          <Image
            source={{ uri: optimizeImageUrl(product.image, 900) }}
            style={[styles.photo, isOutOfStock && { opacity: 0.5 }]}
            resizeMode="cover"
            fadeDuration={0}
          />
          {!!off && !isOutOfStock && (
            <View style={styles.offTag}>
              <Text style={styles.offTagText}>{off}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.eyebrow}>
            {CATEGORY_LABEL[product.category] || 'Fresh'}
            {product.badge ? ` · ${product.badge}` : ''}
          </Text>
          <Text style={styles.title}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price}</Text>
            {!!mrp && <Text style={styles.mrp}>₹{mrp}</Text>}
            {!!off && (
              <View style={styles.offPill}>
                <Text style={styles.offPillText}>{off}% off</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <AppIcon icon={Clock01Icon} size={13} color={C.secondary} strokeWidth={2} />
            <Text style={styles.meta}>Express delivery in 15–20 mins · Incl. of all taxes</Text>
          </View>
          {isOutOfStock && <Text style={styles.soldOut}>Sold out right now. Check back soon.</Text>}

          {/* Sizes */}
          <Text style={styles.sectionTitle}>Choose size</Text>
          <View style={styles.sizes}>
            {packs.map((p) => {
              const on = p.id === pack.id;
              const kg = perKg(p.price, p.netWeight);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.size, on && styles.sizeOn]}
                  onPress={() => {
                    setPackId(p.id);
                    setQty(1);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.label}, ₹${p.price}`}
                >
                  {p.id === bestValueId && (
                    <View style={styles.bestTag}>
                      <Text style={styles.bestTagText}>Best value</Text>
                    </View>
                  )}
                  <Text style={styles.sizeLabel}>{p.label}</Text>
                  <View style={styles.sizePriceRow}>
                    <Text style={[styles.sizePrice, on && { color: C.red }]}>₹{p.price}</Text>
                    {p.originalPrice > p.price && <Text style={styles.sizeMrp}>₹{p.originalPrice}</Text>}
                  </View>
                  <Text style={styles.sizeSub}>{kg ? `₹${kg}/kg` : p.serves}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Details */}
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.table}>
            {[
              ['Net weight', pack.netWeight],
              ['Pieces', pack.pieces || '—'],
              ['Serves', pack.serves || '—'],
              ['Cut', product.availableCuts?.[0]?.name || '—'],
            ].map(([label, value], i) => (
              <View key={label} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
                <Text style={styles.tableLabel}>{label}</Text>
                <Text style={styles.tableValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Nutrition */}
          {!!macros && macros.calories > 0 && (
            <>
              <Text style={styles.sectionTitle}>Nutrition per 100g</Text>
              <View style={styles.nutrition}>
                {[
                  ['Protein', `${macros.proteinGrams}g`],
                  ['Calories', `${macros.calories}`],
                  ['Fat', `${macros.fatGrams}g`],
                ].map(([label, value]) => (
                  <View key={label} style={styles.nutriCell}>
                    <Text style={styles.nutriValue}>{value}</Text>
                    <Text style={styles.nutriLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.about} numberOfLines={showMore ? undefined : 3}>
            {product.description}
            {product.availableCuts?.[0]?.description ? ` ${product.availableCuts[0].description}.` : ''}
          </Text>
          <TouchableOpacity onPress={() => setShowMore(!showMore)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.link}>{showMore ? 'Show less' : 'Read more'}</Text>
          </TouchableOpacity>

          {/* Promises */}
          <View style={styles.promises}>
            {[
              { icon: ShieldCheckIcon, text: '100% jhatka meat' },
              { icon: SnowflakeIcon, text: 'Cut fresh and packed cold' },
              { icon: Cash01Icon, text: 'Pay cash or UPI on delivery' },
            ].map((item) => (
              <View key={item.text} style={styles.promise}>
                <AppIcon icon={item.icon} size={18} color={C.text} strokeWidth={1.8} />
                <Text style={styles.promiseText}>{item.text}</Text>
              </View>
            ))}
            <Text style={styles.storage}>Cook the same day, or keep refrigerated at 0–4°C and use within a day.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Buy bar */}
      <View style={styles.buyBar}>
        {isOutOfStock ? (
          <View style={[styles.buyBtn, styles.buyBtnOff]}>
            <Text style={[styles.buyText, { color: C.secondary }]}>Sold out</Text>
          </View>
        ) : inBasket > 0 ? (
          <>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => cartItem && updateQuantity(cartItem.cartItemId, -1)}
                accessibilityLabel="One less"
              >
                <AppIcon icon={MinusSignIcon} size={16} color={C.text} strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.stepQty}>{inBasket}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => cartItem && updateQuantity(cartItem.cartItemId, 1)}
                accessibilityLabel="One more"
              >
                <AppIcon icon={PlusSignIcon} size={16} color={C.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.buyBtn, { backgroundColor: C.text }]}
              onPress={() => router.push('/(tabs)/cart')}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.buyText}>View basket · ₹{basketTotal}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                accessibilityLabel="Fewer"
              >
                <AppIcon icon={MinusSignIcon} size={16} color={qty <= 1 ? C.placeholder : C.text} strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.stepQty}>{qty}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQty(Math.min(20, qty + 1))}
                accessibilityLabel="More"
              >
                <AppIcon icon={PlusSignIcon} size={16} color={C.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.buyBtn} onPress={add} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.buyText}>
                Add {qty > 1 ? `${qty} ` : ''}· ₹{price * qty}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    textAlign: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: C.red,
    marginTop: 6,
  },

  /* top */
  topBar: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 0,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.red,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  /* photo */
  photoWrap: {
    width: '100%',
    backgroundColor: C.soft,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  offTag: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* body */
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: C.red,
  },
  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  price: {
    fontSize: 26,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
  },
  mrp: {
    fontSize: 16,
    color: C.placeholder,
    textDecorationLine: 'line-through',
  },
  offPill: {
    backgroundColor: C.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  offPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.green,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  meta: {
    fontSize: 13,
    color: C.secondary,
  },
  soldOut: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: C.red,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    marginTop: 26,
    marginBottom: 10,
  },

  /* sizes */
  sizes: {
    flexDirection: 'row',
    gap: 10,
  },
  size: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sizeOn: {
    borderColor: C.text,
    borderWidth: 2,
  },
  bestTag: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: C.red,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bestTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sizeLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  sizePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  sizePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  sizeMrp: {
    fontSize: 11,
    color: C.placeholder,
    textDecorationLine: 'line-through',
  },
  sizeSub: {
    marginTop: 3,
    fontSize: 11,
    color: C.secondary,
  },

  /* yield */

  /* details */
  table: {
    borderRadius: 14,
    backgroundColor: C.soft,
    paddingHorizontal: 14,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  tableRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  tableLabel: {
    fontSize: 14,
    color: C.secondary,
  },
  tableValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },

  /* nutrition */
  nutrition: {
    flexDirection: 'row',
    gap: 10,
  },
  nutriCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.soft,
  },
  nutriValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  nutriLabel: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },

  /* about + promises */
  about: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3C3C43',
  },
  promises: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    gap: 12,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  storage: {
    fontSize: 12,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 4,
  },

  /* buy bar */
  buyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 27,
    backgroundColor: C.soft,
  },
  stepBtn: {
    width: 44,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  buyBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnOff: {
    backgroundColor: C.soft,
  },
  buyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
