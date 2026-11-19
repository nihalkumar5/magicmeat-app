import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../../store/useStore';
import { slotInfo } from '../../data/slots';
import { COLD_PACK_FEE, DELIVERY_FEE, FREE_DELIVERY_ABOVE, feesFor, mrpFor } from '../../data/pricing';
import { formatGrams } from '../../utils/format';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { PRODUCTS } from '../../data/mockData';
import { DominosCard } from '../../components/DominosCard';
import type { DeliveryMode } from '../../types';
import {
  AppIcon,
  FlashIcon,
  Calendar01Icon,
  Clock01Icon,
  Delete02Icon,
  PlusSignIcon,
  MinusSignIcon,
  ShieldCheckIcon,
  ArrowRight01Icon,
  SnowflakeIcon,
  WeightScaleIcon,
  DeliveryTruck01Icon,
} from '../../components/HugeIcon';

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
  const {
    cart,
    updateQuantity,
    deliveryMode,
    orderFulfillment,
    setDeliveryMode,
    getCartSubtotal,
    getCartTotal,
    getCartNetWeightGrams,
    getCartGrossWeightGrams,
    coldPackagingEnabled,
    setColdPackagingEnabled,
  } = useStore();

  const subtotal = getCartSubtotal();
  const netGrams = getCartNetWeightGrams();
  const grossGrams = getCartGrossWeightGrams();
  const grandTotal = getCartTotal();
  const { deliveryFee, packagingFee } = feesFor(subtotal, orderFulfillment, coldPackagingEnabled);
  const itemCount = cart.reduce((n, item) => n + item.quantity, 0);
  const mrpTotal = cart.reduce((sum, item) => sum + mrpFor(item.product, item.selectedCut) * item.quantity, 0);
  const itemSavings = Math.max(0, mrpTotal - subtotal);
  const isDelivery = orderFulfillment === 'delivery';
  const deliverySaved = isDelivery && deliveryFee === 0 ? DELIVERY_FEE : 0;
  const totalSavings = itemSavings + deliverySaved;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_ABOVE) * 100));

  const slots: { mode: DeliveryMode; icon: any; title: string; time: string }[] = [
    { mode: 'instant', icon: FlashIcon, title: 'Express', time: '30 mins' },
    { mode: 'slot', icon: Clock01Icon, title: slotInfo('slot').title, time: '5–7 PM' },
    { mode: 'sunday_morning', icon: Calendar01Icon, title: slotInfo('sunday_morning').title, time: '7–9 AM' },
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
              Fresh, hand-cut chicken, mutton and fish, cleaned and packed cold, at your door in about 30 minutes.
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
        {/* Free delivery progress */}
        {isDelivery && (
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
              <View key={item.cartItemId}>
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
                      onPress={() => updateQuantity(item.cartItemId, -1)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      accessibilityLabel={item.quantity === 1 ? `Remove ${item.product.name}` : `One less ${item.product.name}`}
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
                      onPress={() => updateQuantity(item.cartItemId, 1)}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      accessibilityLabel={`One more ${item.product.name}`}
                    >
                      <AppIcon icon={PlusSignIcon} size={15} color={C.text} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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

        {/* Clean meat */}
        {netGrams > 0 && grossGrams > netGrams && (
          <View style={[styles.card, styles.yieldCard]}>
            <AppIcon icon={WeightScaleIcon} size={20} color={C.green} strokeWidth={2} />
            <Text style={styles.yieldText}>
              You pay only for clean meat: about {formatGrams(grossGrams)} before cleaning,{' '}
              <Text style={{ fontWeight: '800' }}>{formatGrams(netGrams)} you get</Text>.
            </Text>
          </View>
        )}

        {/* Delivery time */}
        <Text style={styles.sectionLabel}>{isDelivery ? 'DELIVERY TIME' : 'PICKUP TIME'}</Text>
        <View style={styles.slotRow}>
          {slots.map((slot) => {
            const active = deliveryMode === slot.mode;
            return (
              <TouchableOpacity
                key={slot.mode}
                style={[styles.slot, active && styles.slotActive]}
                onPress={() => setDeliveryMode(slot.mode)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${slot.title}, ${slot.time}`}
              >
                <AppIcon icon={slot.icon} size={16} color={active ? '#FFFFFF' : C.text} strokeWidth={2} />
                <Text style={[styles.slotTitle, active && styles.slotTextActive]}>{slot.title}</Text>
                <Text style={[styles.slotTime, active && styles.slotTimeActive]}>{slot.time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cold pack */}
        <View style={[styles.card, styles.toggleRow]}>
          <View style={styles.toggleIcon}>
            <AppIcon icon={SnowflakeIcon} size={18} color="#0284C7" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Cold-pack delivery · ₹{COLD_PACK_FEE}</Text>
            <Text style={styles.toggleSub}>Insulated pouch with gel packs keeps it cold for hours.</Text>
          </View>
          <Switch
            value={coldPackagingEnabled}
            onValueChange={setColdPackagingEnabled}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Cold-pack delivery"
          />
        </View>

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
              <Text style={styles.billLabel}>Delivery fee</Text>
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
          {packagingFee > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Cold pack</Text>
              <Text style={styles.billValue}>₹{packagingFee}</Text>
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

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Checkout bar */}
      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutTotal}>₹{grandTotal}</Text>
          <Text style={styles.checkoutSub}>
            {totalSavings > 0 ? `Saving ₹${totalSavings}` : 'Incl. all fees'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push('/checkout')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Checkout, ₹${grandTotal}`}
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
          <AppIcon icon={ArrowRight01Icon} size={16} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
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
  yieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: C.greenBg,
  },
  yieldText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#166534',
  },

  /* slots */
  slotRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  slot: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 3,
  },
  slotActive: {
    backgroundColor: C.text,
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginTop: 2,
  },
  slotTextActive: {
    color: '#FFFFFF',
  },
  slotTime: {
    fontSize: 12,
    color: C.secondary,
  },
  slotTimeActive: {
    color: '#D1D5DB',
  },

  /* cold pack */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  toggleSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
    lineHeight: 17,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  checkoutTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  checkoutSub: {
    fontSize: 12,
    fontWeight: '600',
    color: C.green,
    marginTop: 1,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.red,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 25,
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
