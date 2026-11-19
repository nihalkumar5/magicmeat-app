import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { PRODUCTS } from '../../data/mockData';
import { useStore } from '../../store/useStore';
import { packVariantsFor, cutForPack } from '../../data/pricing';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { StatusBar } from 'expo-status-bar';
import { goBack } from '../../utils/navigation';
import { formatGrams } from '../../utils/format';
import {
  AppIcon,
  ArrowLeft01Icon,
  ShoppingCart01Icon,
  StarIcon,
  PlusSignIcon,
  MinusSignIcon,
  DeliveryTruck01Icon,
  FavouriteIcon,
  WeightScaleIcon,
  ShieldCheckIcon,
  SnowflakeIcon,
  Cash01Icon,
} from '../../components/HugeIcon';

// "₹280/kg" for loose meat packs, so bigger packs show their value.
function perKgLabel(price: number, netWeight: string): string {
  const grams = /^\d+g$/.test(netWeight) ? parseInt(netWeight, 10) : 0;
  if (!grams) return '';
  return `₹${Math.round((price * 1000) / grams)}/kg`;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    addToCart,
    getCartItemsCount,
    wishlist,
    toggleWishlist,
    cart,
    updateQuantity,
    inventory,
  } = useStore();
  const foundProduct = useMemo(() => PRODUCTS.find((p) => p.id === id), [id]);
  const product = foundProduct || PRODUCTS[0];

  const invItem = inventory[product.id];
  const isOutOfStock = invItem ? !invItem.inStock || invItem.stockKg <= 0 : false;

  // Pack sizes and their prices come from data/pricing.ts, the same table
  // Firestore checks orders against.
  const packVariants = useMemo(
    () =>
      packVariantsFor(product).map((pack) => ({
        ...pack,
        pieceSize: product.category === 'chicken' || product.category === 'mutton' ? 'Approx. 40 g' : '—',
        includes: product.availableCuts?.[0]?.description || product.description || '',
        inStock: !isOutOfStock,
      })),
    [product, isOutOfStock]
  );

  const [selectedPackId, setSelectedPackId] = useState<string>(packVariants[0].id);
  const selectedPack = packVariants.find((p) => p.id === selectedPackId) || packVariants[0];

  const packCut = useMemo(
    () =>
      cutForPack(product, product.availableCuts[0], selectedPack, selectedPack.id === packVariants[0].id),
    [product, selectedPack, packVariants]
  );

  const cartItem = cart.find((item) => item.product.id === product.id && item.selectedCut.id === packCut.id);
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const cartCount = getCartItemsCount();
  const isLiked = wishlist.includes(product.id);

  const unitPrice = selectedPack.price;
  const originalPrice = selectedPack.originalPrice;
  const savings = originalPrice - unitPrice;
  const netGrams = parseInt(packCut.netWeight, 10) || 0;
  const grossGrams = parseInt(packCut.grossWeight, 10) || 0;

  const handleGoBack = () => goBack('/(tabs)');

  const handleAddToCart = () => {
    addToCart(product, packCut, true, 1);
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateQuantity(cartItem.cartItemId, 1);
    } else {
      handleAddToCart();
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      updateQuantity(cartItem.cartItemId, -1);
    }
  };

  if (!foundProduct) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Product not found</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          This item may have been removed or the link is wrong.
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={{ color: '#DC2626', fontWeight: '700' }}>Back to shop</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.screenContainer}>
        {/* Floating Top Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circularBtn}
            onPress={handleGoBack}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color="#171717" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={[styles.circularBtn, isLiked && styles.circularBtnLiked]}
              onPress={() => toggleWishlist(product.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Wishlist"
            >
              <AppIcon
                icon={FavouriteIcon}
                size={18}
                color={isLiked ? '#E52329' : '#171717'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circularBtn}
              onPress={() => router.push('/(tabs)/cart')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cart"
            >
              <AppIcon icon={ShoppingCart01Icon} size={18} color="#171717" strokeWidth={2} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* 1. Hero Image Container with Non-Veg Badge */}
          <View style={styles.heroWrapper}>
            <Image
              source={{ uri: optimizeImageUrl(product.image, 720) }}
              style={styles.heroImage}
              resizeMode="cover"
              fadeDuration={0}
            />
            {/* Non-Veg Badge on bottom-left */}
            <View style={styles.nonVegBadge}>
              <View style={styles.nonVegBox}>
                <View style={styles.nonVegDot} />
              </View>
            </View>
          </View>

          {/* 2. Content Body */}
          <View style={styles.contentBody}>
            {/* Delivery Time & Best Seller Badge Row */}
            <View style={styles.badgeRow}>
              <View style={styles.deliveryBadge}>
                <AppIcon icon={DeliveryTruck01Icon} size={15} color="#15803D" strokeWidth={2.2} />
                <Text style={styles.deliveryBadgeText}>Delivery in 30 mins</Text>
              </View>

              {!!product.badge && (
                <View style={styles.bestsellerPill}>
                  <AppIcon icon={StarIcon} size={12} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.bestsellerPillText}>{product.badge}</Text>
                </View>
              )}
            </View>

            {/* Product Title */}
            <Text style={styles.productTitle}>{product.name}</Text>
            {product.hindiTitle && (
              <Text style={styles.hindiTitle}>{product.hindiTitle}</Text>
            )}

            {/* Pack Size / Weight Selector Cards (Lazizia 3-Card Layout) */}
            <View style={styles.packSelectorRow}>
              {packVariants.map((pack) => {
                const isSelected = pack.id === selectedPack.id;
                return (
                  <TouchableOpacity
                    key={pack.id}
                    style={[
                      styles.packCard,
                      isSelected && styles.packCardSelected,
                    ]}
                    onPress={() => setSelectedPackId(pack.id)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${pack.label}, ₹${pack.price}`}
                  >
                    <Text
                      style={[
                        styles.packCardLabel,
                        isSelected && styles.packCardLabelSelected,
                      ]}
                    >
                      {pack.label}
                    </Text>
                    <View style={styles.packPriceRow}>
                      <Text style={styles.packPrice}>₹{pack.price}</Text>
                      {pack.originalPrice > pack.price && (
                        <Text style={styles.packMrp}>₹{pack.originalPrice}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.packStockText,
                        !pack.inStock && styles.packStockTextOutOfStock,
                        isSelected && pack.inStock && styles.packStockTextSelected,
                      ]}
                    >
                      {!pack.inStock ? 'Out of stock' : perKgLabel(pack.price, pack.netWeight) || pack.serves}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Key facts */}
            <View style={styles.factGrid}>
              {[
                { label: 'Net weight', value: selectedPack.netWeight },
                { label: 'Pieces', value: selectedPack.pieces || '—' },
                { label: 'Serves', value: selectedPack.serves || '—' },
                { label: 'Cut', value: product.availableCuts?.[0]?.name || '—' },
              ].map((fact) => (
                <View key={fact.label} style={styles.factCell}>
                  <Text style={styles.factLabel}>{fact.label}</Text>
                  <Text style={styles.factValue} numberOfLines={2}>{fact.value}</Text>
                </View>
              ))}
            </View>

            {/* Clean-meat weight */}
            {grossGrams > netGrams && netGrams > 0 && (
              <View style={styles.yieldCard}>
                <AppIcon icon={WeightScaleIcon} size={18} color="#15803D" strokeWidth={2} />
                <Text style={styles.yieldText}>
                  You pay only for clean meat: about {formatGrams(grossGrams)} before cleaning,{' '}
                  <Text style={styles.yieldStrong}>{formatGrams(netGrams)} you get</Text>.
                </Text>
              </View>
            )}

            {/* About */}
            <Text style={styles.sectionLabel}>About this cut</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
            {!!selectedPack.includes && selectedPack.includes !== product.description && (
              <Text style={[styles.descriptionText, { marginTop: 8 }]}>{selectedPack.includes}</Text>
            )}

            {/* Promises */}
            <View style={styles.promiseList}>
              {[
                { icon: ShieldCheckIcon, text: '100% halal, zabiha cut' },
                { icon: SnowflakeIcon, text: 'Cut fresh and packed cold' },
                { icon: Cash01Icon, text: 'Pay cash or UPI on delivery' },
              ].map((item) => (
                <View key={item.text} style={styles.promiseRow}>
                  <AppIcon icon={item.icon} size={18} color="#111111" strokeWidth={1.8} />
                  <Text style={styles.promiseText}>{item.text}</Text>
                </View>
              ))}
              <Text style={styles.storageText}>
                Cook the same day, or keep refrigerated at 0–4°C and use within a day.
              </Text>
            </View>

            {/* Extra spacing for sticky bar */}
            <View style={{ height: 110 }} />
          </View>
        </ScrollView>

        {/* 4. Sticky Bottom Action Bar (Lazizia Style) */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomPriceCol}>
            <View style={styles.bottomPriceRow}>
              <Text style={styles.bottomPriceText}>₹{unitPrice}</Text>
              {originalPrice > unitPrice && (
                <Text style={styles.bottomMrpText}>₹{originalPrice}</Text>
              )}
            </View>
            {savings > 0 && (
              <Text style={styles.bottomSaveText}>
                You save ₹{savings} · incl. of all taxes
              </Text>
            )}
          </View>

          {/* Add to Cart or Stepper or Notify Me Button (Lazizia Style) */}
          {isOutOfStock || !selectedPack.inStock ? (
            <View style={styles.bottomNotifyBtn} accessibilityState={{ disabled: true }}>
              <Text style={styles.bottomNotifyText}>Out of Stock</Text>
            </View>
          ) : qtyInCart > 0 ? (
            <View style={styles.bottomStepper}>
              <TouchableOpacity
                style={styles.bottomStepBtn}
                onPress={handleDecrement}
                activeOpacity={0.7}
                accessibilityLabel="Remove one"
              >
                <AppIcon icon={MinusSignIcon} size={16} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
              <Text style={styles.bottomStepQty}>{qtyInCart}</Text>
              <TouchableOpacity
                style={styles.bottomStepBtn}
                onPress={handleIncrement}
                activeOpacity={0.7}
                accessibilityLabel="Add one more"
              >
                <AppIcon icon={PlusSignIcon} size={16} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.bottomAddBtn}
              onPress={handleAddToCart}
              activeOpacity={0.88}
              accessibilityRole="button"
            >
              <Text style={styles.bottomAddText}>Add to basket</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    paddingVertical: 6,
  },
  factCell: {
    width: '50%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  factLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  factValue: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '700',
    marginTop: 2,
  },
  yieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
  },
  yieldText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#166534',
  },
  yieldStrong: {
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
    marginTop: 24,
    marginBottom: 6,
  },
  promiseList: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseText: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '500',
  },
  storageText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 4,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 10,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  circularBtnLiked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E52329',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroWrapper: {
    width: '100%',
    height: 320,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  nonVegBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 3.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  nonVegBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nonVegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deliveryBadgeText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  bestsellerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E52329',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestsellerPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  productTitle: {
    color: '#171717',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  hindiTitle: {
    color: '#737373',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
  },
  packSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  packCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E5E5E5',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  packCardSelected: {
    borderColor: '#E52329',
    backgroundColor: '#FEF2F2',
  },
  packCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#525252',
    marginBottom: 4,
  },
  packCardLabelSelected: {
    color: '#E52329',
    fontWeight: '800',
  },
  packPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  packPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#171717',
  },
  packMrp: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  packStockText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  packStockTextSelected: {
    color: '#E52329',
    fontWeight: '700',
  },
  packStockTextOutOfStock: {
    color: '#EF4444',
    fontWeight: '600',
  },
  /* 6-Column Specification Table */
  specTableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  specTable: {
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableValueRow: {
    flexDirection: 'row',
  },
  tableCol: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  colHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'left',
  },
  colValueText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#171717',
    lineHeight: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 14 : 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bottomPriceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: -0.4,
  },
  bottomMrpText: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  bottomSaveText: {
    fontSize: 11.5,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  bottomAddBtn: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: '#E52329',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E52329',
    paddingHorizontal: 12,
    minWidth: 120,
  },
  bottomStepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStepQty: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 26,
    textAlign: 'center',
  },
  bottomNotifyBtn: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNotifyBtnDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  bottomNotifyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  bottomNotifyTextDone: {
    color: '#16A34A',
  },
});
