import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import type { Product } from '../types';
import { useStore, defaultCutFor } from '../store/useStore';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { AppIcon, PlusSignIcon, MinusSignIcon, Clock01Icon } from './HugeIcon';
import { PressableScale, PopIn, useBump } from './motion';
import { HeartButton } from './HeartButton';
import { haptic } from '../utils/haptics';

const RED = '#DC2626';

// Grid card for the Shop page, modelled on quick-commerce listings: the Add
// button sits on the photo, then weight, price and delivery time.
function ShopCardComponent({ product, width }: { product: Product; width: number }) {
  const cartItem = useStore((s) => s.cart.find((item) => item.product.id === product.id));
  const stock = useStore((s) => s.inventory[product.id]);
  const addToCart = useStore((s) => s.addToCart);
  const updateQuantity = useStore((s) => s.updateQuantity);

  const qty = cartItem?.quantity ?? 0;
  const soldOut = stock ? !stock.inStock || stock.stockKg <= 0 : false;
  // Real stock from the admin panel, not invented urgency.
  const lowStock = !soldOut && stock && stock.stockKg > 0 && stock.stockKg <= 5 ? stock.stockKg : 0;
  const mrp = product.originalPrice && product.originalPrice > product.basePrice ? product.originalPrice : 0;
  const off = mrp ? Math.round(((mrp - product.basePrice) / mrp) * 100) : 0;

  const add = () => {
    haptic.tap();
    addToCart(product, defaultCutFor(product), true, 1);
  };
  const qtyBump = useBump(qty);

  return (
    <PressableScale
      style={[styles.card, { width }]}
      scaleTo={0.97}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
      // On web a 'button' role renders <button>, and the card holds its own
      // Add and heart buttons; buttons can't nest, so the card stays a plain
      // pressable there.
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={`${product.name}, ₹${product.basePrice}`}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: optimizeImageUrl(product.image, 320) }}
          style={[styles.image, soldOut && { opacity: 0.45 }]}
          resizeMode="cover"
          fadeDuration={0}
        />
        <HeartButton productId={product.id} size={16} style={styles.heart} label={product.name} />
        {off > 0 && !soldOut && (
          <View style={styles.offTag}>
            <Text style={styles.offText}>{off}% OFF</Text>
          </View>
        )}

        <View style={styles.actionSlot}>
          {soldOut ? (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Sold out</Text>
            </View>
          ) : qty > 0 ? (
            <PopIn key="stepper" style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  haptic.tap();
                  if (cartItem) updateQuantity(cartItem.cartItemId, -1);
                }}
                accessibilityLabel={`One less ${product.name}`}
              >
                <AppIcon icon={MinusSignIcon} size={13} color="#FFFFFF" strokeWidth={2.8} />
              </TouchableOpacity>
              <Animated.Text style={[styles.stepQty, { transform: [{ scale: qtyBump }] }]}>{qty}</Animated.Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  haptic.tap();
                  if (cartItem) updateQuantity(cartItem.cartItemId, 1);
                }}
                accessibilityLabel={`One more ${product.name}`}
              >
                <AppIcon icon={PlusSignIcon} size={13} color="#FFFFFF" strokeWidth={2.8} />
              </TouchableOpacity>
            </PopIn>
          ) : (
            <PopIn key="add">
              <TouchableOpacity
                style={styles.addBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  add();
                }}
                activeOpacity={0.8}
                accessibilityLabel={`Add ${product.name}`}
              >
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </PopIn>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.weightPill}>
          <Text style={styles.weightText}>{product.netWeight}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.basePrice}</Text>
          {!!mrp && <Text style={styles.mrp}>₹{mrp}</Text>}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <AppIcon icon={Clock01Icon} size={11} color="#6B7280" strokeWidth={2} />
          <Text style={styles.meta}>15–20 mins</Text>
          {!!lowStock && <Text style={styles.low}>· Only {lowStock} kg left</Text>}
        </View>
      </View>
    </PressableScale>
  );
}

export const ShopCard = React.memo(ShopCardComponent);

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  card: {
    marginBottom: 16,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  offTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 8,
  },
  offText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  actionSlot: {
    position: 'absolute',
    right: 6,
    bottom: -14,
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  addText: {
    color: RED,
    fontSize: 13,
    fontWeight: '800',
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
    fontSize: 13,
    fontWeight: '800',
  },
  soldOut: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  soldOutText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    paddingTop: 20,
  },
  weightPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  weightText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111111',
  },
  mrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  meta: {
    fontSize: 11,
    color: '#6B7280',
  },
  low: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
});
