import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../store/useStore';
import { adminDeleteCoupon, adminSaveCoupon, normalizeCouponCode } from '../services/backend';
import { couponHeadline, couponTerms } from '../data/pricing';
import { confirmAction, notify } from '../utils/dialogs';
import { haptic } from '../utils/haptics';
import { AppIcon, Cancel01Icon, DiscountTag01Icon, PlusSignIcon } from './HugeIcon';
import type { Coupon } from '../types';

const C = {
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
  hairline: '#E8E8ED',
  fill: '#F2F2F7',
  red: '#DC2626',
  green: '#16A34A',
};

type Draft = {
  code: string;
  title: string;
  description: string;
  type: 'flat' | 'percent';
  value: string;
  minOrder: string;
  maxDiscount: string;
  active: boolean;
};

const EMPTY: Draft = {
  code: '',
  title: '',
  description: '',
  type: 'flat',
  value: '',
  minOrder: '',
  maxDiscount: '',
  active: true,
};

const toDraft = (c: Coupon): Draft => ({
  code: c.code,
  title: c.title,
  description: c.description || '',
  type: c.type,
  value: String(c.value),
  minOrder: String(c.minOrder),
  maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
  active: c.active,
});

const int = (s: string) => {
  const n = parseInt(s.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

// Admin: create, edit, switch on/off and delete coupons. Customers see live
// ones on the home strip and at checkout; firestore.rules checks every
// order's discount against the coupon saved here.
export function AdminOffers() {
  const coupons = useStore((s) => s.coupons);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // existing code, or null for new
  const [saving, setSaving] = useState(false);

  const open = (c?: Coupon) => {
    setEditing(c ? c.code : null);
    setDraft(c ? toDraft(c) : { ...EMPTY });
  };

  const toggle = async (c: Coupon) => {
    haptic.select();
    try {
      await adminSaveCoupon({ ...c, active: !c.active });
    } catch {
      notify('Not saved', 'Could not update this offer. Check your connection.');
    }
  };

  const remove = (c: Coupon) =>
    confirmAction(
      `Delete ${c.code}?`,
      'Customers will no longer be able to use this code. This cannot be undone.',
      'Delete',
      () => {
        adminDeleteCoupon(c.code).catch(() => notify('Not deleted', 'Check your connection and try again.'));
        setDraft(null);
      },
    );

  const save = async () => {
    if (!draft) return;
    const code = normalizeCouponCode(draft.code);
    const value = int(draft.value);
    if (code.length < 3) return notify('Check the code', 'Use 3–16 letters or numbers, like MEAT100.');
    if (!editing && coupons.some((c) => c.code === code))
      return notify('Code already exists', `${code} is already an offer. Edit it instead.`);
    if (!draft.title.trim()) return notify('Add a title', 'For example “Flat ₹100 off on your first order”.');
    if (value <= 0)
      return notify('Add the discount', draft.type === 'flat' ? 'Enter the ₹ amount off.' : 'Enter the % off.');
    if (draft.type === 'percent' && value > 90) return notify('Too high', 'Percent offers can be at most 90%.');
    setSaving(true);
    try {
      await adminSaveCoupon({
        code,
        title: draft.title,
        description: draft.description || undefined,
        type: draft.type,
        value,
        minOrder: int(draft.minOrder),
        maxDiscount: draft.type === 'percent' ? int(draft.maxDiscount) : 0,
        active: draft.active,
      });
      haptic.success();
      setDraft(null);
    } catch {
      notify('Not saved', 'Could not save this offer. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <View style={{ marginTop: 12 }}>
      <TouchableOpacity style={styles.newBtn} onPress={() => open()} activeOpacity={0.85} accessibilityRole="button">
        <AppIcon icon={PlusSignIcon} size={16} color="#FFFFFF" strokeWidth={2.6} />
        <Text style={styles.newText}>New offer</Text>
      </TouchableOpacity>

      {coupons.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No offers yet</Text>
          <Text style={styles.emptySub}>Create a coupon and it shows up on the home screen and at checkout.</Text>
        </View>
      ) : (
        <View style={styles.group}>
          {coupons.map((c, i) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.row, i > 0 && styles.rowBorder]}
              onPress={() => open(c)}
              activeOpacity={0.6}
            >
              <View style={[styles.badge, !c.active && { backgroundColor: C.fill }]}>
                <AppIcon icon={DiscountTag01Icon} size={16} color={c.active ? C.red : C.tertiary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.headline, !c.active && { color: C.tertiary }]}>
                  {couponHeadline(c)} · <Text style={styles.code}>{c.code}</Text>
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={styles.terms}>{couponTerms(c)}</Text>
              </View>
              <Switch
                value={c.active}
                onValueChange={() => toggle(c)}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
                accessibilityLabel={`${c.code} live`}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.footnote}>
        Live offers show on the home screen and at checkout. Switch one off to pause it.
      </Text>

      {/* ------------------------------------------------ edit sheet */}
      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setDraft(null)} accessibilityLabel="Close" />
          {draft && (
            <View style={styles.sheet}>
              <View style={styles.grabber} />
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{editing ? `Edit ${editing}` : 'New offer'}</Text>
                <TouchableOpacity style={styles.close} onPress={() => setDraft(null)} accessibilityLabel="Close">
                  <AppIcon icon={Cancel01Icon} size={18} color={C.text} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.label}>Code</Text>
                <TextInput
                  style={[styles.field, !!editing && { color: C.tertiary }]}
                  value={draft.code}
                  onChangeText={(t) => set({ code: t.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                  placeholder="MEAT100"
                  placeholderTextColor={C.tertiary}
                  autoCapitalize="characters"
                  maxLength={16}
                  editable={!editing}
                />

                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.field}
                  value={draft.title}
                  onChangeText={(title) => set({ title })}
                  placeholder="Flat ₹100 off on orders above ₹699"
                  placeholderTextColor={C.tertiary}
                  maxLength={60}
                />

                <Text style={styles.label}>Discount</Text>
                <View style={styles.segmented}>
                  {(
                    [
                      { key: 'flat', label: '₹ off' },
                      { key: 'percent', label: '% off' },
                    ] as const
                  ).map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.segment, draft.type === t.key && styles.segmentOn]}
                      onPress={() => set({ type: t.key })}
                    >
                      <Text style={[styles.segmentText, draft.type === t.key && styles.segmentTextOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.pair}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{draft.type === 'flat' ? 'Amount off (₹)' : 'Percent off (%)'}</Text>
                    <TextInput
                      style={styles.field}
                      value={draft.value}
                      onChangeText={(value) => set({ value: value.replace(/\D/g, '') })}
                      keyboardType="number-pad"
                      placeholder={draft.type === 'flat' ? '100' : '20'}
                      placeholderTextColor={C.tertiary}
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Minimum order (₹)</Text>
                    <TextInput
                      style={styles.field}
                      value={draft.minOrder}
                      onChangeText={(minOrder) => set({ minOrder: minOrder.replace(/\D/g, '') })}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={C.tertiary}
                      maxLength={6}
                    />
                  </View>
                </View>

                {draft.type === 'percent' && (
                  <>
                    <Text style={styles.label}>Max discount (₹, blank = no cap)</Text>
                    <TextInput
                      style={styles.field}
                      value={draft.maxDiscount}
                      onChangeText={(maxDiscount) => set({ maxDiscount: maxDiscount.replace(/\D/g, '') })}
                      keyboardType="number-pad"
                      placeholder="150"
                      placeholderTextColor={C.tertiary}
                      maxLength={6}
                    />
                  </>
                )}

                <Text style={styles.label}>Details (optional)</Text>
                <TextInput
                  style={[styles.field, { height: 70, paddingTop: 12, textAlignVertical: 'top' }]}
                  value={draft.description}
                  onChangeText={(description) => set({ description })}
                  placeholder="Valid on chicken and mutton. One use per order."
                  placeholderTextColor={C.tertiary}
                  multiline
                  maxLength={200}
                />

                <View style={styles.liveRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.liveTitle}>Live</Text>
                    <Text style={styles.liveSub}>Show it to customers now</Text>
                  </View>
                  <Switch
                    value={draft.active}
                    onValueChange={(active) => set({ active })}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {editing && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      const c = coupons.find((x) => x.code === editing);
                      if (c) remove(c);
                    }}
                  >
                    <Text style={styles.deleteText}>Delete offer</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save offer</Text>}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.text,
    marginBottom: 12,
  },
  newText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  group: {
    borderRadius: 16,
    backgroundColor: C.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  code: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  meta: {
    fontSize: 13,
    color: C.text,
    marginTop: 2,
  },
  terms: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  footnote: {
    fontSize: 12,
    color: C.tertiary,
    textAlign: 'center',
    marginTop: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginTop: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginTop: 14,
    marginBottom: 6,
  },
  field: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.text,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 11,
    backgroundColor: '#E4E4EA',
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
  },
  segmentTextOn: {
    color: C.text,
    fontWeight: '700',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  liveSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },
  deleteBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
