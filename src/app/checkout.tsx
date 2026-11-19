import { useRef, useState } from 'react';
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
import type { DeliveryMode } from '../types';
import { DELIVERY_FEE, EXPRESS_FEE, FREE_DELIVERY_ABOVE, feesFor, mrpFor } from '../data/pricing';
import { formatGrams } from '../utils/format';
import { notify } from '../utils/dialogs';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { saveProfile } from '../services/backend';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AppIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Location01Icon,
  Store01Icon,
  Cash01Icon,
  ShieldCheckIcon,
  FlashIcon,
  Clock01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  Note01Icon,
  Tick02Icon,
} from '../components/HugeIcon';

// Firestore rules accept at most 6 lines per order (see firestore.rules).
const MAX_CART_LINES = 6;

function showError(message: string) {
  notify('Order not placed', message);
}

const C = {
  bg: '#FFFFFF',
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
    getCartNetWeightGrams,
    placeOrder,
    setDeliveryMode,
  } = useStore();

  const paymentMethod = 'Cash on Delivery' as const;
  const [deliveryNote, setDeliveryNote] = useState('');
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  // Saved contact shows as a summary with "Change"; new customers type it in.
  const [editingContact, setEditingContact] = useState(() => !(profile.name.trim() && isValidPhone(profile.phone)));
  const contactValid = !!name.trim() && isValidPhone(phone);
  const isUnserviceable = orderFulfillment === 'delivery' && currentLocation.isServiceable === false;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Typed loosely: RN 0.88's ScrollView ref type isn't the component type.
  const scrollRef = useRef<{
    scrollToEnd: (options?: { animated?: boolean }) => void;
  } | null>(null);

  const grandTotal = getCartTotal();
  const subtotal = getCartSubtotal();
  const { deliveryFee } = feesFor(subtotal, orderFulfillment, deliveryMode);
  const netGrams = getCartNetWeightGrams();
  const isDelivery = orderFulfillment === 'delivery';
  const mrpTotal = cart.reduce((sum, item) => sum + mrpFor(item.product, item.selectedCut) * item.quantity, 0);
  const isExpress = deliveryMode === 'instant';
  // Only Normal delivery is free above the threshold; Express is always paid.
  const deliverySaved = isDelivery && !isExpress && deliveryFee === 0 ? DELIVERY_FEE : 0;
  const totalSavings = Math.max(0, mrpTotal - subtotal) + deliverySaved;

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
        `${soldOut.map((i) => i.product.name).join(', ')} ${soldOut.length > 1 ? 'are' : 'is'} out of stock. Please remove ${soldOut.length > 1 ? 'them' : 'it'} from your basket.`,
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

    const nextProfile = {
      name: name.trim(),
      phone: cleanPhone(phone),
      email: profile.email,
    };
    if (nextProfile.name !== profile.name || nextProfile.phone !== profile.phone) {
      setProfile(nextProfile);
      saveProfile({
        ...nextProfile,
        email: nextProfile.email || undefined,
      }).catch((e) => console.warn('[checkout] profile sync', e?.code || e));
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
          : 'Could not place the order. Check your internet connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalFree = subtotal >= FREE_DELIVERY_ABOVE;
  const slots: {
    mode: DeliveryMode;
    icon: any;
    title: string;
    sub: string;
    fee: string;
  }[] = [
    {
      mode: 'slot',
      icon: Clock01Icon,
      title: 'Normal',
      sub: normalFree ? 'In 45–60 minutes' : `In 45–60 minutes · free above ₹${FREE_DELIVERY_ABOVE}`,
      fee: normalFree ? 'Free' : `₹${DELIVERY_FEE}`,
    },
    {
      mode: 'instant',
      icon: FlashIcon,
      title: 'Express',
      sub: 'In 15–20 minutes',
      fee: `₹${EXPRESS_FEE}`,
    },
  ];
  const showBreakdown = () => scrollRef.current?.scrollToEnd({ animated: true });

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
          <AppIcon icon={ArrowLeft01Icon} size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef as never}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.largeTitle}>Checkout</Text>

          {/* Address */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/location-select')}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Change address"
          >
            <AppIcon icon={isDelivery ? Location01Icon : Store01Icon} size={22} color={C.text} strokeWidth={1.8} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {currentLocation.shortAddress || (isDelivery ? 'Add delivery address' : 'Choose a store')}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {isDelivery ? '' : 'Pick up from · '}
                {selectedAddress}
              </Text>
              {isUnserviceable && (
                <Text style={styles.error}>We don&apos;t deliver here yet. Tap to pick another address.</Text>
              )}
            </View>
            <AppIcon icon={ArrowRight01Icon} size={16} color="#C7C7CC" strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Instructions (Shipt-style dashed box) */}
          {noteOpen || deliveryNote ? (
            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                value={deliveryNote}
                onChangeText={setDeliveryNote}
                placeholder={isDelivery ? 'e.g. Ring the bell, leave with the guard' : 'Anything the store should know'}
                placeholderTextColor={C.placeholder}
                maxLength={300}
                multiline
                autoFocus={!deliveryNote}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.addNote} onPress={() => setNoteOpen(true)} activeOpacity={0.7}>
              <AppIcon icon={Note01Icon} size={18} color={C.red} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addNoteTitle}>Add {isDelivery ? 'delivery' : 'pickup'} instructions</Text>
                <Text style={styles.addNoteSub}>Helps the rider find you faster</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* Delivery time (Instacart-style options) */}
          <Text style={styles.sectionTitle}>{isDelivery ? 'Delivery time' : 'Pickup time'}</Text>
          {slots.map((option) => {
            const on = deliveryMode === option.mode;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[styles.option, on && styles.optionOn]}
                onPress={() => setDeliveryMode(option.mode)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <AppIcon icon={option.icon} size={20} color={on ? C.red : C.text} strokeWidth={1.9} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSub}>{isDelivery ? option.sub : option.sub.split(' · ')[0]}</Text>
                </View>
                {isDelivery && (
                  <Text style={[styles.optionFee, option.fee === 'Free' && { color: C.green }]}>{option.fee}</Text>
                )}
                {on && <AppIcon icon={CheckmarkCircle02Icon} size={22} color={C.red} strokeWidth={2} />}
              </TouchableOpacity>
            );
          })}

          <View style={styles.divider} />

          {/* Contact: saved summary with Change, or editable fields */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Contact</Text>
            {!editingContact ? (
              <TouchableOpacity
                onPress={() => setEditingContact(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Change contact details"
              >
                <Text style={styles.headAction}>Change</Text>
              </TouchableOpacity>
            ) : (
              contactValid && (
                <TouchableOpacity
                  onPress={() => setEditingContact(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Done editing contact details"
                >
                  <Text style={styles.headAction}>Done</Text>
                </TouchableOpacity>
              )
            )}
          </View>
          {!editingContact ? (
            <TouchableOpacity
              style={styles.contactSaved}
              onPress={() => setEditingContact(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${name}, +91 ${cleanPhone(phone)}. Change`}
            >
              <View style={styles.contactAvatar}>
                <AppIcon icon={UserIcon} size={18} color={C.text} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {name.trim()}
                </Text>
                <Text style={styles.contactPhone}>+91 {cleanPhone(phone)}</Text>
              </View>
              <AppIcon icon={ArrowRight01Icon} size={16} color="#C7C7CC" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : (
            <View style={styles.contactBox}>
              <View style={styles.contactRow}>
                <AppIcon icon={UserIcon} size={18} color={C.secondary} strokeWidth={1.9} />
                <TextInput
                  style={styles.contactInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={C.placeholder}
                  maxLength={80}
                  autoComplete="name"
                  textContentType="name"
                />
              </View>
              <View style={[styles.hair, { marginLeft: 44 }]} />
              <View style={styles.contactRow}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  style={styles.contactInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={C.placeholder}
                  keyboardType="phone-pad"
                  maxLength={14}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                />
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={[styles.option, styles.optionOn]}>
            <AppIcon icon={Cash01Icon} size={20} color={C.green} strokeWidth={1.9} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Pay on delivery</Text>
              <Text style={styles.optionSub}>Cash or UPI when your order arrives</Text>
            </View>
            <AppIcon icon={CheckmarkCircle02Icon} size={22} color={C.green} strokeWidth={2} />
          </View>

          <View style={styles.divider} />

          {/* Summary */}
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>
              {cart.reduce((n, i) => n + i.quantity, 0)} items
              {netGrams > 0 ? ` · ${formatGrams(netGrams)}` : ''}
            </Text>
            <View style={styles.sumValueRow}>
              {mrpTotal > subtotal && <Text style={styles.strike}>₹{mrpTotal}</Text>}
              <Text style={styles.sumValue}>₹{subtotal}</Text>
            </View>
          </View>
          {isDelivery && (
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>{isExpress ? 'Express delivery' : 'Delivery fee'}</Text>
              {deliveryFee === 0 ? (
                <View style={styles.sumValueRow}>
                  <Text style={styles.strike}>₹{DELIVERY_FEE}</Text>
                  <Text style={[styles.sumValue, { color: C.green }]}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.sumValue}>₹{deliveryFee}</Text>
              )}
            </View>
          )}
          <View style={[styles.sumRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>To pay</Text>
            <Text style={styles.totalValue}>₹{grandTotal}</Text>
          </View>

          {totalSavings > 0 && (
            <View style={styles.savings}>
              <AppIcon icon={Tick02Icon} size={16} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.savingsText}>You’re saving ₹{totalSavings} on this order</Text>
            </View>
          )}

          <View style={styles.assurance}>
            <AppIcon icon={ShieldCheckIcon} size={14} color={C.secondary} strokeWidth={2} />
            <Text style={styles.assuranceText}>No advance payment · Fresh, or your money back</Text>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar (Grab style) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={showBreakdown} activeOpacity={0.6} accessibilityLabel="See bill breakdown">
          <Text style={styles.bottomTotal}>₹{grandTotal}</Text>
          <Text style={styles.bottomLink}>See breakdown</Text>
        </TouchableOpacity>
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
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.placeText}>Placing…</Text>
            </>
          ) : (
            <Text style={styles.placeText}>Place order</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  divider: {
    height: 8,
    marginHorizontal: -20,
    marginVertical: 18,
    backgroundColor: '#F4F4F6',
  },
  hair: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 2,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: C.red,
  },
  addNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  addNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
  },
  addNoteSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },
  noteBox: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#F4F4F6',
    paddingHorizontal: 14,
  },
  noteInput: {
    minHeight: 64,
    fontSize: 15,
    color: C.text,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  optionOn: {
    borderColor: C.text,
    borderWidth: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  optionSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 1,
  },
  optionFee: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleInline: {
    flex: 1,
    marginBottom: 0,
  },
  headAction: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
  },
  contactSaved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  contactPhone: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 2,
  },
  contactBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  prefix: {
    minWidth: 18,
    fontSize: 13,
    fontWeight: '700',
    color: C.secondary,
  },
  contactInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: C.text,
    paddingVertical: 12,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  sumLabel: {
    fontSize: 15,
    color: C.secondary,
  },
  sumValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strike: {
    fontSize: 13,
    color: C.placeholder,
    textDecorationLine: 'line-through',
  },
  sumValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  totalRow: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.text,
  },
  savings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.green,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  assurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  assuranceText: {
    fontSize: 12,
    color: C.secondary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  bottomTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
  },
  bottomLink: {
    fontSize: 13,
    fontWeight: '700',
    color: C.red,
    marginTop: 1,
  },
  placeBtn: {
    flex: 1,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.red,
  },
  placeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
