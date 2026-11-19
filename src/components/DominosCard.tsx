import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Product } from '../types';
import { useStore, defaultCutFor } from '../store/useStore';
import { PressableScale, PopIn, useBump } from './motion';
import { haptic } from '../utils/haptics';
import { router } from 'expo-router';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { AppIcon, PlusSignIcon, MinusSignIcon } from './HugeIcon';

interface Props {
  product: Product;
  cardWidth?: number | string;
  isTop10?: boolean;
  rank?: number;
  variant?: 'compact' | 'feed';
  style?: any;
}

const DominosCardComponent: React.FC<Props> = ({ product, cardWidth = 172, style }) => {
  const cartItem = useStore((state) => state.cart.find((item) => item.product.id === product.id));
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = useStore((state) => {
    const inv = state.inventory[product.id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  });
  const addToCart = useStore((state) => state.addToCart);
  const updateQuantity = useStore((state) => state.updateQuantity);

  const handleCardPress = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id },
    });
  };

  const qtyBump = useBump(qtyInCart);

  const handleAdd = () => {
    haptic.tap();
    const defaultCut = defaultCutFor(product);
    addToCart(product, defaultCut, true, 1);
  };

  const handleIncrement = () => {
    if (cartItem) {
      haptic.tap();
      updateQuantity(cartItem.cartItemId, 1);
    } else {
      handleAdd();
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      haptic.tap();
      updateQuantity(cartItem.cartItemId, -1);
    }
  };

  const basePrice = product.basePrice;
  const originalPrice = product.originalPrice || Math.round(basePrice * 1.25);

  return (
    <PressableScale style={[styles.card, { width: cardWidth as any }, style]} scaleTo={0.97} onPress={handleCardPress}>
      {/* 1. Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: optimizeImageUrl(product.image, 360) }}
          style={[styles.image, isOutOfStock && styles.imageOutOfStock]}
          resizeMode="cover"
          fadeDuration={0}
        />

        {/* Out of Stock Overlay Pill */}
        {isOutOfStock && (
          <View style={styles.outOfStockPill}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* 2. Content Info */}
      <View style={styles.infoContainer}>
        {/* Product Title */}
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Weight & Price Row */}
        <View style={styles.metaRow}>
          <Text style={styles.weightText}>{product.netWeight}</Text>
          <View style={styles.priceGroup}>
            {originalPrice > basePrice && <Text style={styles.mrpText}>₹{originalPrice}</Text>}
            <Text style={styles.priceText}>₹{basePrice}</Text>
          </View>
        </View>

        {/* Action Button: Clean Outline Button, Stepper, or Notify Me */}
        {isOutOfStock ? (
          <View style={styles.notifyBtn}>
            <Text style={styles.notifyBtnText}>Out of Stock</Text>
          </View>
        ) : qtyInCart > 0 ? (
          <PopIn key="stepper" style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={handleDecrement}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <AppIcon icon={MinusSignIcon} size={14} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
            <Animated.Text style={[styles.stepQty, { transform: [{ scale: qtyBump }] }]}>{qtyInCart}</Animated.Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={handleIncrement}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <AppIcon icon={PlusSignIcon} size={14} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </PopIn>
        ) : (
          <PopIn key="add">
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </PopIn>
        )}
      </View>
    </PressableScale>
  );
};

export const DominosCard = React.memo(DominosCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
    marginRight: 12,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F7F7F7',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOutOfStock: {
    opacity: 0.5,
  },
  outOfStockPill: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    backgroundColor: 'rgba(23, 23, 23, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    zIndex: 5,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  notifyBtn: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#737373',
  },
  infoContainer: {
    padding: 10,
    justifyContent: 'space-between',
    flex: 1,
  },
  productTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#171717',
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weightText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mrpText: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
  },
  addBtn: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171717',
    letterSpacing: 0.2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E52329',
    paddingHorizontal: 10,
  },
  stepBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
});
