import { useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useStore } from '../store/useStore';
import { couponDiscount, couponHeadline, couponTerms } from '../data/pricing';
import { normalizeCouponCode } from '../services/backend';
import { haptic } from '../utils/haptics';
import { AppIcon, Cancel01Icon, DiscountTag01Icon, Tick02Icon } from './HugeIcon';
import type { Coupon } from '../types';

const RED = '#DC2626';
const TEXT = '#111111';
const SECONDARY = '#6B7280';

// Bottom sheet to type a code or pick one of the live coupons (Swiggy /
// Zomato "Apply coupon" pattern): each coupon says what you'd save on this
// basket, or how much more to add to unlock it.
export function CouponSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const coupons = useStore((s) => s.coupons);
  const applied = useStore((s) => s.appliedCouponCode);
  const setApplied = useStore((s) => s.setAppliedCoupon);
  const subtotal = useStore((s) => s.cart.reduce((n, i) => n + i.unitPrice * i.quantity, 0));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const live = coupons.filter((c) => c.active);

  const apply = (c: Coupon) => {
    haptic.success();
    setApplied(c.code);
    setCode('');
    setError('');
    onClose();
  };

  const applyTyped = () => {
    const want = normalizeCouponCode(code);
    if (!want) return;
    const c = coupons.find((x) => x.code === want);
    if (!c || !c.active) {
      haptic.warn();
      setError('This code isn’t valid. Check the spelling or pick an offer below.');
      return;
    }
    if (couponDiscount(c, subtotal) < 0) {
      haptic.warn();
      setError(`Add ₹${c.minOrder - subtotal} more to use ${c.code}.`);
      return;
    }
    apply(c);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>Apply coupon</Text>
            <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Close">
              <AppIcon icon={Cancel01Icon} size={18} color={TEXT} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View style={[styles.field, !!error && { borderColor: RED }]}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase());
                if (error) setError('');
              }}
              placeholder="Enter coupon code"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              returnKeyType="done"
              onSubmitEditing={applyTyped}
            />
            <TouchableOpacity
              onPress={applyTyped}
              disabled={!code.trim()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.applyText, !code.trim() && { color: '#D1D5DB' }]}>APPLY</Text>
            </TouchableOpacity>
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 28 }}>
            <Text style={styles.section}>{live.length ? 'Available offers' : 'No offers right now'}</Text>
            {live.map((c) => {
              const d = couponDiscount(c, subtotal);
              const ok = d >= 0;
              const on = applied === c.code;
              return (
                <View key={c.code} style={[styles.card, on && styles.cardOn]}>
                  <View style={styles.badge}>
                    <AppIcon icon={DiscountTag01Icon} size={16} color={RED} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.headline}>{couponHeadline(c)}</Text>
                    <Text style={styles.cTitle} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={styles.terms}>{couponTerms(c)}</Text>
                    <View style={styles.codeChip}>
                      <Text style={styles.codeText}>{c.code}</Text>
                    </View>
                    <Text style={[styles.note, ok && { color: '#15803D' }]}>
                      {ok ? `You save ₹${d} on this order` : `Add ₹${c.minOrder - subtotal} more to unlock`}
                    </Text>
                  </View>
                  {on ? (
                    <View style={styles.appliedPill}>
                      <AppIcon icon={Tick02Icon} size={12} color="#FFFFFF" strokeWidth={3} />
                      <Text style={styles.appliedText}>Applied</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.applyBtn, !ok && styles.applyBtnOff]}
                      onPress={() => ok && apply(c)}
                      disabled={!ok}
                      accessibilityRole="button"
                      accessibilityLabel={`Apply ${c.code}`}
                    >
                      <Text style={[styles.applyBtnText, !ok && { color: '#9CA3AF' }]}>Apply</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginTop: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: TEXT,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  applyText: {
    fontSize: 14,
    fontWeight: '800',
    color: RED,
    letterSpacing: 0.5,
  },
  error: {
    fontSize: 13,
    color: RED,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: SECONDARY,
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 10,
  },
  cardOn: {
    borderColor: RED,
    backgroundColor: '#FFF7F7',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
  },
  cTitle: {
    fontSize: 13,
    color: TEXT,
    marginTop: 2,
  },
  terms: {
    fontSize: 12,
    color: SECONDARY,
    marginTop: 2,
  },
  codeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: TEXT,
  },
  note: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
    marginTop: 8,
  },
  applyBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: RED,
    justifyContent: 'center',
  },
  applyBtnOff: {
    backgroundColor: '#F3F4F6',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  appliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#15803D',
  },
  appliedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
