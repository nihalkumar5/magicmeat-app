import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { goBack } from '../utils/navigation';
import { slotInfo } from '../data/slots';
import { DELIVERY_FEE, feesFor, mrpFor } from '../data/pricing';
import { formatGrams } from '../utils/format';
import { notify } from '../utils/dialogs';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { saveProfile } from '../services/backend';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AppIcon,
  ArrowLeft01Icon,
  Location01Icon,
  Cash01Icon,
  ShieldCheckIcon,
  FlashIcon,
  Calendar01Icon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  Store01Icon,
} from '../components/HugeIcon';

// Firestore rules accept at most 6 lines per order (see firestore.rules).
const MAX_CART_LINES = 6;

function showError(message: string) {
  notify('Order not placed', message);
}

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#15803D',
  greenBg: '#F0FDF4',
};

export default function CheckoutScreen() {
  const {
    cart,
    deliveryMode,
    orderFulfillment,
    selectedAddress,
    currentLocation,
    profile,
    setProfile,
    getCartTotal,
    getCartSubtotal,
    coldPackagingEnabled,
    getCartNetWeightGrams,
    placeOrder,
  } = useStore();

  const paymentMethod = 'Cash on Delivery' as const;
  const [deliveryNote, setDeliveryNote] = useState('');
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const isUnserviceable = orderFulfillment === 'delivery' && currentLocation.isServiceable === false;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grandTotal = getCartTotal();
  const subtotal = getCartSubtotal();
  const { deliveryFee, packagingFee } = feesFor(subtotal, orderFulfillment, coldPackagingEnabled);
  const netGrams = getCartNetWeightGrams();
  const isDelivery = orderFulfillment === 'delivery';
  const mrpTotal = cart.reduce((sum, item) => sum + mrpFor(item.product, item.selectedCut) * item.quantity, 0);
  const deliverySaved = isDelivery && deliveryFee === 0 ? DELIVERY_FEE : 0;
  const totalSavings = Math.max(0, mrpTotal - subtotal) + deliverySaved;
  const slot = slotInfo(deliveryMode);

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    if (cart.length === 0) {
      router.replace('/(tabs)/cart');
      return;
    }
    if (cart.length > MAX_CART_LINES) {
      showError(`Please keep it to ${MAX_CART_LINES} different items per order.`);
      return;
    }
    const { inventory } = useStore.getState();
    const soldOut = cart.filter((item) => {
      const inv = inventory[item.product.id];
      return inv ? !inv.inStock || inv.stockKg <= 0 : false;
    });
    if (soldOut.length > 0) {
      showError(
        `${soldOut.map((i) => i.product.name).join(', ')} ${soldOut.length > 1 ? 'are' : 'is'} out of stock. Please remove ${soldOut.length > 1 ? 'them' : 'it'} from your basket.`
      );
      return;
    }
    if (isUnserviceable) {
      showError(`We don't deliver to ${currentLocation.city || 'this address'} yet. Please pick another address.`);
      return;
    }
    if (!name.trim()) {
      showError('Please enter your name.');
      return;
    }
    if (!isValidPhone(phone)) {
      showError('Please enter a valid 10-digit mobile number so we can reach you.');
      return;
    }

    const nextProfile = { name: name.trim(), phone: cleanPhone(phone), email: profile.email };
    if (nextProfile.name !== profile.name || nextProfile.phone !== profile.phone) {
      setProfile(nextProfile);
      saveProfile({ ...nextProfile, email: nextProfile.email || undefined }).catch((e) =>
        console.warn('[checkout] profile sync', e?.code || e)
      );
    }

    setIsSubmitting(true);
    try {
      const order = await placeOrder(paymentMethod, deliveryNote);
      router.replace({
        pathname: '/order-tracking/[id]',
        params: { id: order.id, placed: '1' },
      });
    } catch (e: any) {
      const code = e?.code || '';
      showError(
        code === 'permission-denied'
          ? 'Some prices or stock changed. Please refresh your basket and try again.'
          : 'Could not place the order. Check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const SlotIcon = deliveryMode === 'instant' ? FlashIcon : deliveryMode === 'sunday_morning' ? Calendar01Icon : Clock01Icon;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => goBack('/(tabs)/cart')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to basket"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Address */}
          <Text style={styles.sectionLabel}>{isDelivery ? 'DELIVER TO' : 'PICK UP FROM'}</Text>
          <View style={[styles.card, styles.addressCard]}>
            <View style={styles.iconTile}>
              <AppIcon icon={isDelivery ? Location01Icon : Store01Icon} size={18} color={C.red} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.addressTitle} numberOfLines={1}>
                {currentLocation.shortAddress || (isDelivery ? 'Delivery address' : 'Store')}
              </Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress}
              </Text>
              {isUnserviceable && (
                <Text style={styles.errorText}>We don&apos;t deliver here yet. Please pick another address.</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/location-select')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Change address"
            >
              <Text style={styles.link}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Contact */}
          <Text style={styles.sectionLabel}>CONTACT</Text>
          <View style={styles.card}>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={C.placeholder}
                maxLength={80}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Mobile</Text>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.formInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit number"
                placeholderTextColor={C.placeholder}
                keyboardType="phone-pad"
                maxLength={14}
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            </View>
            <View style={styles.divider} />
            <View style={[styles.formRow, { alignItems: 'flex-start' }]}>
              <Text style={[styles.formLabel, { paddingTop: 2 }]}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.noteInput]}
                value={deliveryNote}
                onChangeText={setDeliveryNote}
                placeholder={isDelivery ? 'For the rider (optional), e.g. ring the bell' : 'For the store (optional)'}
                placeholderTextColor={C.placeholder}
                maxLength={300}
                multiline
              />
            </View>
          </View>

          {/* Delivery time */}
          <Text style={styles.sectionLabel}>{isDelivery ? 'DELIVERY TIME' : 'PICKUP TIME'}</Text>
          <View style={[styles.card, styles.rowCard]}>
            <View style={styles.iconTile}>
              <AppIcon icon={SlotIcon} size={18} color={C.red} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {deliveryMode === 'instant' ? 'Express · about 30 mins' : slot.eta}
              </Text>
              <Text style={styles.rowSub}>
                {coldPackagingEnabled ? 'Packed cold with gel packs' : 'Packed fresh and sealed'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => goBack('/(tabs)/cart')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Change delivery time"
            >
              <Text style={styles.link}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Payment */}
          <Text style={styles.sectionLabel}>PAYMENT</Text>
          <View style={[styles.card, styles.rowCard]}>
            <View style={[styles.iconTile, { backgroundColor: C.greenBg }]}>
              <AppIcon icon={Cash01Icon} size={18} color={C.green} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Pay on delivery</Text>
              <Text style={styles.rowSub}>Cash or UPI when your order arrives</Text>
            </View>
            <AppIcon icon={CheckmarkCircle02Icon} size={22} color={C.green} strokeWidth={2} />
          </View>

          {/* Summary */}
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={[styles.card, { paddingVertical: 6 }]}>
            {cart.map((item) => (
              <View key={item.cartItemId} style={styles.billRow}>
                <Text style={styles.itemLine} numberOfLines={1}>
                  <Text style={styles.qty}>{item.quantity}×  </Text>
                  {item.product.name}
                </Text>
                <Text style={styles.billValue}>₹{item.unitPrice * item.quantity}</Text>
              </View>
            ))}
            <View style={[styles.divider, { marginVertical: 6 }]} />
            {isDelivery && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery fee</Text>
                {deliveryFee === 0 ? (
                  <View style={styles.valueRow}>
                    <Text style={styles.strike}>₹{DELIVERY_FEE}</Text>
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
            <View style={[styles.divider, { marginVertical: 6 }]} />
            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>To pay</Text>
              <Text style={styles.totalValue}>₹{grandTotal}</Text>
            </View>
            {netGrams > 0 && (
              <Text style={styles.yieldNote}>{formatGrams(netGrams)} of clean meat, ready to cook</Text>
            )}
            {totalSavings > 0 && (
              <View style={styles.savingsBanner}>
                <Text style={styles.savingsText}>You’re saving ₹{totalSavings} on this order</Text>
              </View>
            )}
          </View>

          <View style={styles.assurance}>
            <AppIcon icon={ShieldCheckIcon} size={14} color={C.secondary} strokeWidth={2} />
            <Text style={styles.assuranceText}>No advance payment · Fresh, or your money back</Text>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomHint}>
          {totalSavings > 0 ? `You’re saving ₹${totalSavings} · ` : ''}Pay cash or UPI on delivery
        </Text>
        <TouchableOpacity
          style={[styles.placeBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Place order, ₹${grandTotal}`}
          accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <View style={styles.placing}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.placeText}>Placing order…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.placeText}>Place order</Text>
              <View style={styles.pricePill}>
                <Text style={styles.pricePillText}>₹{grandTotal}</Text>
              </View>
            </>
          )}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  content: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 6,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.red,
    marginTop: 6,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    gap: 8,
  },
  formLabel: {
    width: 64,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  prefix: {
    fontSize: 16,
    color: C.secondary,
  },
  formInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: C.text,
    paddingVertical: 12,
  },
  noteInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  rowSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 12,
  },
  itemLine: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  qty: {
    fontWeight: '700',
    color: C.secondary,
  },
  billLabel: {
    fontSize: 14,
    color: C.secondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strike: {
    fontSize: 13,
    color: C.placeholder,
    textDecorationLine: 'line-through',
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
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
  yieldNote: {
    fontSize: 12,
    color: C.secondary,
    marginBottom: 6,
  },
  savingsBanner: {
    backgroundColor: C.greenBg,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
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
    marginTop: 14,
  },
  assuranceText: {
    fontSize: 12,
    color: C.secondary,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  bottomHint: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: C.green,
  },
  placing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pricePill: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.red,
    height: 56,
    paddingLeft: 22,
    paddingRight: 8,
    borderRadius: 28,
  },
  placeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
