import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../../store/useStore';
import { slotInfo } from '../../data/slots';
import { DELIVERY_FEE, EXPRESS_FEE, FREE_DELIVERY_ABOVE, feesFor, mrpFor } from '../../data/pricing';
import { formatGrams } from '../../utils/format';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { PRODUCTS } from '../../data/mockData';
import { DominosCard } from '../../components/DominosCard';
import { useTabBarInset } from '../../components/FloatingTabBar';
import { FadeInUp, PopIn, PressableScale } from '../../components/motion';
import { haptic } from '../../utils/haptics';
import { CouponSheet } from '../../components/CouponSheet';
import type { DeliveryMode } from '../../types';
import {
  AppIcon,
  FlashIcon,
  Clock01Icon,
  Delete02Icon,
  PlusSignIcon,
  MinusSignIcon,
  ShieldCheckIcon,
  ArrowRight01Icon,
  DeliveryTruck01Icon,
  DiscountTag01Icon,
  Tick02Icon,
} from '../../components/HugeIcon';

const ADD_ON_IDS = ['v2', 'v3', 'v5', 'v4', 'v6', 'v1', 'e1'];

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#15803D',
  greenBg: '#F0FDF4',
};

export default function CartScreen() {
  const tabInset = useTabBarInset();
  const {
    cart,
    updateQuantity,
    deliveryMode,
    orderFulfillment,
    setDeliveryMode,
    getCartSubtotal,
    getCartTotal,
    getCartNetWeightGrams,
    inventory,
  } = useStore();

  const subtotal = getCartSubtotal();
  const netGrams = getCartNetWeightGrams();
  const grandTotal = getCartTotal();
  const { coupon, discount: couponOff, short: couponShort } = useStore((s) => s.getCouponState)();
  const [couponOpen, setCouponOpen] = useState(false);
  const { deliveryFee } = feesFor(subtotal, orderFulfillment, deliveryMode);
  const itemCount = cart.reduce((n, item) => n + item.quantity, 0);
  const mrpTotal = cart.reduce((sum, item) => sum + mrpFor(item.product, item.selectedCut) * item.quantity, 0);
  const itemSavings = Math.max(0, mrpTotal - subtotal);
  const isDelivery = orderFulfillment === 'delivery';
  const isExpress = deliveryMode === 'instant';
  // Only Normal delivery has a free threshold; Express is always paid.
  const showFreeNudge = isDelivery && !isExpress;
  const deliverySaved = showFreeNudge && deliveryFee === 0 ? DELIVERY_FEE : 0;
  const totalSavings = itemSavings + deliverySaved + couponOff;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);
  const inCart = new Set(cart.map((item) => item.product.id));
  const hasMeat = cart.some((item) => ['chicken', 'mutton', 'fish'].includes(item.product.category));
  const isSoldOut = (id: string) => {
    const inv = inventory[id];
    return inv ? !inv.inStock || inv.stockKg <= 0 : false;
  };
  // Curry basics (onion, tomato, ginger, garlic, coriander, potato) that go
  // with the meat in the basket, then eggs; never items already added.
  const addOns = [...ADD_ON_IDS.map((id) => PRODUCTS.find((p) => p.id === id))]
    .filter((p): p is (typeof PRODUCTS)[number] => !!p && !inCart.has(p.id) && !isSoldOut(p.id))
    .slice(0, 6);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_ABOVE) * 100));

  const normalFee = subtotal >= FREE_DELIVERY_ABOVE ? 'Free' : `₹${DELIVERY_FEE}`;
  const slots: { mode: DeliveryMode; icon: any; title: string; time: string; fee: string }[] = [
    { mode: 'slot', icon: Clock01Icon, title: slotInfo('slot').title, time: slotInfo('slot').time, fee: normalFee },
    { mode: 'instant', icon: FlashIcon, title: 'Express', time: slotInfo('instant').time, fee: `₹${EXPRESS_FEE}` },
  ];

  /* ------------------------------------------------------------ empty */
  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.largeTitle}>Basket</Text>
        </View>

        <ScrollView contentContainerStyle={styles.emptyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyCard}>
            <Image
              source={require('../../../assets/illustrations/empty_cart.png')}
              style={styles.emptyIllustration}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Your basket is empty</Text>
            <Text style={styles.emptySubtitle}>
              Fresh, hand-cut chicken, mutton and fish, cleaned and packed cold, at your door in as little as 15
              minutes.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Start shopping</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>Popular right now</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shelf}
            data={PRODUCTS.slice(0, 6)}
            keyExtractor={(p) => `empty-rec-${p.id}`}
            renderItem={({ item }) => <DominosCard product={item} cardWidth={160} />}
            initialNumToRender={3}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ----------------------------------------------------------- filled */
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Basket</Text>
        <Text style={styles.headerSub}>
          {itemCount} item{itemCount > 1 ? 's' : ''}
          {netGrams > 0 ? ` · ${formatGrams(netGrams)} ready to cook` : ''}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Free delivery progress (Normal delivery only) */}
        {showFreeNudge && (
          <View style={[styles.card, styles.freeCard]}>
            <View style={styles.freeRow}>
              <AppIcon icon={DeliveryTruck01Icon} size={20} color={C.green} strokeWidth={2} />
              <Text style={styles.freeText}>
                {amountToFreeDelivery > 0 ? (
                  <>
                    Add <Text style={styles.freeStrong}>₹{amountToFreeDelivery}</Text> more for free delivery
                  </>
                ) : (
                  <>
                    <Text style={styles.freeStrong}>Free delivery</Text> unlocked
                  </>
                )}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${freeDeliveryProgress}%` }]} />
            </View>
          </View>
        )}

        {/* Items */}
        <View style={styles.card}>
          {cart.map((item, idx) => {
            const lineMrp = mrpFor(item.product, item.selectedCut) * item.quantity;
            const linePrice = item.unitPrice * item.quantity;
            return (
              <FadeInUp key={item.cartItemId} delay={idx * 50} distance={10}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.product.id } })}
                    activeOpacity={0.8}
                    accessibilityLabel={`Open ${item.product.name}`}
                  >
                    <Image
                      source={{ uri: optimizeImageUrl(item.product.image, 160) }}
                      style={styles.thumb}
                      fadeDuration={0}
                    />
                  </TouchableOpacity>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {item.selectedCut.name}
                      {item.selectedCut.allowsSkinOption ? ` · ${item.isSkinless ? 'Skinless' : 'With skin'}` : ''}
                    </Text>
                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPrice}>₹{linePrice}</Text>
                      {lineMrp > linePrice && <Text style={styles.itemMrp}>₹{lineMrp}</Text>}
                    </View>
                  </View>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        if (item.quantity === 1) haptic.warn();
                        else haptic.tap();
                        updateQuantity(item.cartItemId, -1);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      accessibilityLabel={
                        item.quantity === 1 ? `Remove ${item.product.name}` : `One less ${item.product.name}`
                      }
                    >
                      <AppIcon
                        icon={item.quantity === 1 ? Delete02Icon : MinusSignIcon}
                        size={15}
                        color={item.quantity === 1 ? C.red : C.text}
                        strokeWidth={2.2}
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepQty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => {
                        haptic.tap();
                        updateQuantity(item.cartItemId, 1);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      accessibilityLabel={`One more ${item.product.name}`}
                    >
                      <AppIcon icon={PlusSignIcon} size={15} color={C.text} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeInUp>
            );
          })}

          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.addMoreRow}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.6}
            accessibilityRole="button"
          >
            <AppIcon icon={PlusSignIcon} size={16} color={C.red} strokeWidth={2.4} />
            <Text style={styles.addMoreText}>Add more items</Text>
          </TouchableOpacity>
        </View>

        {/* Complete your order */}
        {addOns.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{hasMeat ? 'ADD FOR YOUR CURRY' : 'YOU MIGHT ALSO NEED'}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={addOns}
              keyExtractor={(p) => `addon-${p.id}`}
              renderItem={({ item }) => <DominosCard product={item} cardWidth={132} style={{ borderWidth: 0 }} />}
              contentContainerStyle={{ paddingBottom: 12 }}
              style={{ marginHorizontal: -16, paddingLeft: 16 }}
            />
          </>
        )}

        {/* Delivery time */}
        <Text style={styles.sectionLabel}>{isDelivery ? 'DELIVERY TIME' : 'PICKUP TIME'}</Text>
        <View style={styles.slotRow}>
          {slots.map((slot) => {
            const active = deliveryMode === slot.mode;
            const express = slot.mode === 'instant';
            const free = slot.fee === 'Free';
            return (
              <PressableScale
                key={slot.mode}
                containerStyle={{ flex: 1 }}
                style={[styles.slot, active && styles.slotActive]}
                scaleTo={0.97}
                onPress={() => {
                  if (!active) haptic.select();
                  setDeliveryMode(slot.mode);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  isDelivery ? `${slot.title}, ${slot.time}, ${slot.fee}` : `${slot.title}, ${slot.time}`
                }
              >
                <View style={styles.slotTop}>
                  <View style={[styles.slotIcon, active && styles.slotIconActive]}>
                    <AppIcon
                      icon={slot.icon}
                      size={17}
                      color={active ? '#FFFFFF' : express ? '#B45309' : C.text}
                      strokeWidth={2.2}
                    />
                  </View>
                  {active ? (
                    <PopIn key="on" style={styles.slotCheck}>
                      <AppIcon icon={Tick02Icon} size={11} color="#FFFFFF" strokeWidth={3.2} />
                    </PopIn>
                  ) : (
                    <View style={styles.slotRadio} />
                  )}
                </View>
                <View style={styles.slotTitleRow}>
                  <Text style={styles.slotTitle}>{slot.title}</Text>
                  {express && (
                    <View style={styles.fastTag}>
                      <Text style={styles.fastTagText}>FASTEST</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.slotTime}>{slot.time}</Text>
                {isDelivery && (
                  <View style={[styles.feePill, free && styles.feePillFree]}>
                    <Text style={[styles.feeText, free && styles.feeTextFree]}>{slot.fee}</Text>
                  </View>
                )}
              </PressableScale>
            );
          })}
        </View>

        {/* Coupon */}
        <TouchableOpacity
          style={[styles.card, styles.couponRow]}
          onPress={() => setCouponOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <AppIcon icon={DiscountTag01Icon} size={18} color={C.red} strokeWidth={2} />
          <Text style={styles.couponText} numberOfLines={1}>
            {coupon && couponOff > 0
              ? `${coupon.code} applied · you save ₹${couponOff}`
              : coupon && couponShort > 0
                ? `Add ₹${couponShort} more to use ${coupon.code}`
                : 'Apply coupon'}
          </Text>
          <AppIcon icon={ArrowRight01Icon} size={16} color="#C7C7CC" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Bill */}
        <Text style={styles.sectionLabel}>BILL DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item total</Text>
            <View style={styles.billValueRow}>
              {itemSavings > 0 && <Text style={styles.billStrike}>₹{mrpTotal}</Text>}
              <Text style={styles.billValue}>₹{subtotal}</Text>
            </View>
          </View>
          {isDelivery && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{isExpress ? 'Express delivery' : 'Delivery fee'}</Text>
              {deliveryFee === 0 ? (
                <View style={styles.billValueRow}>
                  <Text style={styles.billStrike}>₹{DELIVERY_FEE}</Text>
                  <Text style={[styles.billValue, { color: C.green }]}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.billValue}>₹{deliveryFee}</Text>
              )}
            </View>
          )}
          {couponOff > 0 && coupon && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Coupon ({coupon.code})</Text>
              <Text style={[styles.billValue, { color: C.green }]}>−₹{couponOff}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={[styles.billRow, { paddingTop: 12 }]}>
            <Text style={styles.totalLabel}>To pay</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>
          {totalSavings > 0 && (
            <View style={styles.savingsBanner}>
              <Text style={styles.savingsText}>You’re saving ₹{totalSavings} on this order</Text>
            </View>
          )}
        </View>

        <View style={styles.assurance}>
          <AppIcon icon={ShieldCheckIcon} size={14} color={C.secondary} strokeWidth={2} />
          <Text style={styles.assuranceText}>Fresh, or your money back · Pay cash or UPI on delivery</Text>
        </View>

        <View style={{ height: 130 + tabInset }} />
      </ScrollView>

      {/* Checkout bar */}
      <View style={[styles.checkoutBar, { bottom: tabInset }]}>
        {(totalSavings > 0 || (showFreeNudge && amountToFreeDelivery > 0)) && (
          <Text style={styles.checkoutHint}>
            {showFreeNudge && amountToFreeDelivery > 0
              ? `Add ₹${amountToFreeDelivery} more for free delivery`
              : `You’re saving ₹${totalSavings} on this order`}
          </Text>
        )}
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push('/checkout')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Checkout, ₹${grandTotal}`}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>₹{grandTotal}</Text>
            <AppIcon icon={ArrowRight01Icon} size={14} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </TouchableOpacity>
      </View>
      <CouponSheet visible={couponOpen} onClose={() => setCouponOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  headerSub: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 8,
    marginLeft: 6,
  },

  /* free delivery */
  freeCard: {
    paddingVertical: 14,
    gap: 10,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  freeText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  freeStrong: {
    fontWeight: '800',
    color: C.green,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  trackFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },

  /* items */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  itemMrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 18,
    height: 36,
  },
  stepBtn: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  addMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
  },

  /* yield */

  /* slots */
  slotRow: {
    flexDirection: 'row',
    gap: 13,
    marginBottom: 13,
  },
  slot: {
    borderRadius: 21,
    padding: 13,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 13,
    elevation: 1,
  },
  slotActive: {
    borderColor: C.red,
    backgroundColor: '#FFF7F7',
    shadowColor: C.red,
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  slotTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  slotIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIconActive: {
    backgroundColor: C.red,
  },
  slotCheck: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotRadio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
  },
  slotTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: C.text,
  },
  fastTag: {
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    backgroundColor: '#FFF4D6',
  },
  fastTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#B45309',
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '500',
    color: C.secondary,
    marginTop: 2,
  },
  feePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: '#F4F4F6',
  },
  feePillFree: {
    backgroundColor: '#E8F7EE',
  },
  feeText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text,
  },
  feeTextFree: {
    color: C.green,
  },

  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    marginBottom: 12,
  },
  couponText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },

  /* bill */
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  billLabel: {
    fontSize: 14,
    color: C.secondary,
  },
  billValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  billStrike: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  savingsBanner: {
    backgroundColor: C.greenBg,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.green,
  },
  assurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  assuranceText: {
    fontSize: 12,
    color: C.secondary,
  },

  /* checkout bar */
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.red,
    height: 54,
    paddingLeft: 22,
    paddingRight: 8,
    borderRadius: 27,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  checkoutHint: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: C.green,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* empty */
  emptyContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyIllustration: {
    width: 180,
    height: 150,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: C.red,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  shelf: {
    gap: 12,
    paddingRight: 16,
  },
});
