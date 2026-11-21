import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LocationData } from '../types/location';
import { haptic } from '../utils/haptics';
import { cleanPhone, isValidPhone } from '../utils/validation';
import {
  AppIcon,
  Alert02Icon,
  ArrowRight02Icon,
  Building03Icon,
  Cancel01Icon,
  Clock01Icon,
  FlashIcon,
  Home01Icon,
  Location01Icon,
  Note01Icon,
  PlusSignIcon,
  ShieldCheckIcon,
  Store01Icon,
  UserIcon,
} from './HugeIcon';

// Last look before the order is placed: where it goes, who the rider calls,
// when it arrives and what to pay. Address, name and phone can all be
// changed right here.
//
// Patterns from Mobbin: Blinkit's "Delivering your order to … Change" card,
// foodpanda's saved-address radio list, Uber Eats' delivery-details rows.
// Visual rules: one accent (brand red) for actions and the pin only;
// everything else neutral. Sentence-case section labels, 8-pt spacing,
// details grouped in one inset block with icon tiles (iOS Settings).

const C = {
  ink: '#0B0B0C',
  body: '#3F3F46',
  secondary: '#6B7280',
  muted: '#9CA3AF',
  line: '#ECECEF',
  inset: '#F6F6F8',
  surface: '#FFFFFF',
  accent: '#DC2626',
  accentSoft: '#FEF2F2',
  accentLine: '#FECACA',
  ok: '#15803D',
};

const tagIcon = (tag?: LocationData['tag']) =>
  tag === 'Home' ? Home01Icon : tag === 'Work' ? Building03Icon : Location01Icon;

const tagText = (tag?: LocationData['tag']) => (tag && tag !== 'Current' ? tag : '');

const same = (a: LocationData, b: LocationData) =>
  a.fullAddress === b.fullAddress && a.shortAddress === b.shortAddress;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export interface ConfirmOrderSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onAddAddress: () => void;
  onSelectAddress: (a: LocationData) => void;
  onChangeContact: (name: string, phone: string) => void;
  submitting: boolean;
  isDelivery: boolean;
  address: LocationData;
  savedAddresses: LocationData[];
  name: string;
  phone: string;
  isExpress: boolean;
  timeText: string;
  note: string;
  itemCount: number;
  weightText: string;
  total: number;
}

/* ------------------------------------------------------------- pieces */

function SectionHead({ title, action, onAction, disabled }: { title: string; action?: string; onAction?: () => void; disabled?: boolean }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {!!action && (
        <TouchableOpacity
          onPress={onAction}
          disabled={disabled}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
        >
          <Text style={s.link}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DetailRow({
  icon,
  title,
  sub,
  action,
  onAction,
  first,
  disabled,
  actionLabel,
}: {
  icon: any;
  title: string;
  sub: string;
  action?: string;
  onAction?: () => void;
  first?: boolean;
  disabled?: boolean;
  actionLabel?: string;
}) {
  return (
    <View style={[s.detail, !first && s.detailSep]}>
      <View style={s.tile}>
        <AppIcon icon={icon} size={18} color={C.ink} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.detailTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.detailSub} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      {!!action && (
        <TouchableOpacity
          onPress={onAction}
          disabled={disabled}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={s.link}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* -------------------------------------------------------------- sheet */

export function ConfirmOrderSheet(p: ConfirmOrderSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(p.visible);
  const [anim] = useState(() => new Animated.Value(0));
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(p.name);
  const [draftPhone, setDraftPhone] = useState(p.phone);
  const [contactError, setContactError] = useState('');
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Opening: mount it and start on the address card (state that follows a
  // prop, derived during render).
  const [wasVisible, setWasVisible] = useState(p.visible);
  if (p.visible !== wasVisible) {
    setWasVisible(p.visible);
    if (p.visible) {
      setMounted(true);
      setChoosing(false);
      setEditing(false);
      setContactError('');
    }
  }

  useEffect(() => {
    if (p.visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 340,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        () => setMounted(false),
      );
    }
  }, [p.visible, anim, mounted]);

  if (!mounted) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] });
  const servable = !p.isDelivery || p.address.isServiceable !== false;
  const others = p.savedAddresses.filter((a) => !same(a, p.address));
  const choices = [p.address, ...others].filter((a) => !!a.fullAddress?.trim());
  const busyEditing = choosing || editing;
  const canConfirm = servable && !p.submitting && !busyEditing;

  const startEdit = () => {
    haptic.select();
    setDraftName(p.name);
    setDraftPhone(p.phone);
    setContactError('');
    setChoosing(false);
    setEditing(true);
  };
  const saveContact = () => {
    const n = draftName.trim();
    const ph = cleanPhone(draftPhone);
    if (!n) return setContactError('Please enter your name.');
    if (!isValidPhone(ph)) return setContactError('Enter a valid 10-digit mobile number.');
    haptic.success();
    p.onChangeContact(n, ph);
    setEditing(false);
  };

  const ctaLabel = choosing
    ? 'Choose an address above'
    : editing
      ? 'Save your contact first'
      : !servable
        ? 'Pick a delivery address'
        : 'Confirm order';

  return (
    <Modal visible transparent animationType="none" onRequestClose={p.onClose} statusBarTranslucent>
      <Animated.View style={[s.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={p.submitting ? undefined : p.onClose} accessibilityLabel="Close" />
      </Animated.View>

      <KeyboardAvoidingView behavior="padding" style={s.kav} pointerEvents="box-none">
        <Animated.View
          style={[
            s.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 6, maxHeight: height * 0.94, transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal
        >
          <View style={s.grabber} />

          {/* Header */}
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.title} accessibilityRole="header">
                Review your order
              </Text>
              <Text style={s.sub}>
                {p.isDelivery
                  ? 'Please check where it’s going. We start cutting the moment you confirm.'
                  : 'Please check the details. We start cutting the moment you confirm.'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.close}
              onPress={p.onClose}
              disabled={p.submitting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <AppIcon icon={Cancel01Icon} size={16} color={C.ink} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* ---------------------------------------------- address */}
            <SectionHead
              title={choosing ? 'Choose an address' : p.isDelivery ? 'Delivering to' : 'Pick up from'}
              action={p.isDelivery ? (choosing ? 'Done' : 'Change') : undefined}
              onAction={() => {
                haptic.select();
                setEditing(false);
                setChoosing((v) => !v);
              }}
              disabled={p.submitting}
            />

            {!choosing ? (
              <View style={s.addrCard} accessibilityLabel={`Delivering to ${p.address.fullAddress}`}>
                <View style={s.addrBody}>
                  <View style={[s.pin, !servable && s.pinOff]}>
                    <AppIcon
                      icon={p.isDelivery ? tagIcon(p.address.tag) : Store01Icon}
                      size={20}
                      color={servable ? C.accent : C.muted}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {!!tagText(p.address.tag) && (
                      <View style={s.tag}>
                        <Text style={s.tagLabel}>{tagText(p.address.tag)}</Text>
                      </View>
                    )}
                    <Text style={s.addrTitle} numberOfLines={2}>
                      {p.address.shortAddress || 'Your address'}
                    </Text>
                    <Text style={s.addrFull} numberOfLines={4}>
                      {p.address.fullAddress}
                    </Text>
                  </View>
                </View>
                {!servable && (
                  <View style={s.warn}>
                    <AppIcon icon={Alert02Icon} size={15} color={C.accent} strokeWidth={2.2} />
                    <Text style={s.warnText}>We don’t deliver here yet. Tap Change to pick another address.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.listCard}>
                {choices.map((a, i) => {
                  const on = same(a, p.address);
                  const ok = a.isServiceable !== false;
                  return (
                    <TouchableOpacity
                      key={`${a.fullAddress}-${i}`}
                      style={[s.choice, i > 0 && s.detailSep, on && s.choiceOn, !ok && { opacity: 0.45 }]}
                      disabled={!ok}
                      activeOpacity={0.7}
                      onPress={() => {
                        haptic.select();
                        if (!on) p.onSelectAddress(a);
                        setChoosing(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: !ok }}
                    >
                      <View style={[s.tile, on && { backgroundColor: C.surface }]}>
                        <AppIcon icon={tagIcon(a.tag)} size={18} color={on ? C.accent : C.ink} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.detailTitle} numberOfLines={1}>
                          {tagText(a.tag) ? `${tagText(a.tag)} · ` : ''}
                          {a.shortAddress}
                        </Text>
                        <Text style={[s.detailSub, !ok && { color: C.accent }]} numberOfLines={2}>
                          {ok ? a.fullAddress : 'Not delivering here yet'}
                        </Text>
                      </View>
                      <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[s.choice, s.detailSep]} onPress={p.onAddAddress} activeOpacity={0.7} accessibilityRole="button">
                  <View style={[s.tile, { backgroundColor: C.accentSoft }]}>
                    <AppIcon icon={PlusSignIcon} size={18} color={C.accent} strokeWidth={2.2} />
                  </View>
                  <Text style={s.addText}>Add a new address</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ---------------------------------------------- details */}
            <SectionHead title="Order details" />
            <View style={s.group}>
              {editing ? (
                <View style={s.edit}>
                  <View style={s.editHead}>
                    <Text style={s.detailTitle}>Who should the rider call?</Text>
                    <TouchableOpacity
                      onPress={() => setEditing(false)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityRole="button"
                    >
                      <Text style={[s.link, { color: C.secondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.inputLabel}>Full name</Text>
                  <TextInput
                    style={s.input}
                    value={draftName}
                    onChangeText={(t) => {
                      setDraftName(t);
                      setContactError('');
                    }}
                    placeholder="Your name"
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    maxLength={60}
                    accessibilityLabel="Full name"
                  />
                  <Text style={[s.inputLabel, { marginTop: 12 }]}>Mobile number</Text>
                  <View style={s.phoneWrap}>
                    <Text style={s.prefix}>+91</Text>
                    <View style={s.prefixLine} />
                    <TextInput
                      ref={phoneRef}
                      style={s.phoneInput}
                      value={draftPhone}
                      onChangeText={(t) => {
                        setDraftPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                        setContactError('');
                      }}
                      placeholder="10-digit number"
                      placeholderTextColor={C.muted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      returnKeyType="done"
                      onSubmitEditing={saveContact}
                      maxLength={10}
                      accessibilityLabel="Mobile number"
                    />
                  </View>
                  {!!contactError && (
                    <View style={s.editErrorRow}>
                      <AppIcon icon={Alert02Icon} size={14} color={C.accent} strokeWidth={2.2} />
                      <Text style={s.editError}>{contactError}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={s.saveBtn} onPress={saveContact} activeOpacity={0.85} accessibilityRole="button">
                    <Text style={s.saveText}>Save contact</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <DetailRow
                  first
                  icon={UserIcon}
                  title={p.name}
                  sub={`+91 ${p.phone}`}
                  action="Edit"
                  onAction={startEdit}
                  disabled={p.submitting}
                  actionLabel="Edit name and mobile number"
                />
              )}
              <DetailRow
                icon={p.isExpress ? FlashIcon : Clock01Icon}
                title={p.isExpress ? 'Express delivery' : p.isDelivery ? 'Standard delivery' : 'Pickup'}
                sub={p.timeText}
              />
              {!!p.note.trim() && <DetailRow icon={Note01Icon} title="Instructions" sub={p.note.trim()} />}
            </View>

            {/* ---------------------------------------------- to pay */}
            <View style={s.pay}>
              <View style={{ flex: 1 }}>
                <Text style={s.payLabel}>To pay</Text>
                <Text style={s.paySub}>
                  {p.itemCount} item{p.itemCount === 1 ? '' : 's'}
                  {p.weightText ? ` · ${p.weightText}` : ''} · cash or UPI on delivery
                </Text>
              </View>
              <Text style={s.payTotal}>{rupees(p.total)}</Text>
            </View>
          </ScrollView>

          {/* CTA: label left, amount right */}
          <TouchableOpacity
            style={[s.cta, !canConfirm && !p.submitting && s.ctaOff]}
            onPress={p.onConfirm}
            disabled={!canConfirm}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm, busy: p.submitting }}
            accessibilityLabel={canConfirm ? `Confirm order, ${rupees(p.total)}` : ctaLabel}
          >
            {p.submitting ? (
              <View style={s.ctaCenter}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={s.ctaText}>Placing your order…</Text>
              </View>
            ) : canConfirm ? (
              <>
                <Text style={s.ctaText}>{ctaLabel}</Text>
                <View style={s.ctaRight}>
                  <Text style={s.ctaAmount}>{rupees(p.total)}</Text>
                  <AppIcon icon={ArrowRight02Icon} size={18} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </>
            ) : (
              <View style={s.ctaCenter}>
                <Text style={[s.ctaText, { color: C.secondary }]}>{ctaLabel}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.trust}>
            <AppIcon icon={ShieldCheckIcon} size={13} color={C.ok} strokeWidth={2} />
            <Text style={s.trustText}>Nothing to pay now. You pay when it arrives.</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const shadow = (y: number, blur: number, opacity: number) =>
  Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
    android: { elevation: Math.round(y / 2) },
    default: { boxShadow: `0 ${y}px ${blur * 2}px rgba(0,0,0,${opacity})` } as object,
  });

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,12,0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DADADF',
    marginTop: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.7,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.secondary,
    marginTop: 4,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.inset,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.1,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.accent,
  },

  addrCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    ...shadow(8, 12, 0.06),
  },
  addrBody: {
    flexDirection: 'row',
    gap: 14,
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOff: {
    backgroundColor: C.inset,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.inset,
    marginBottom: 4,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.3,
  },
  addrTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.2,
  },
  addrFull: {
    fontSize: 14,
    lineHeight: 20,
    color: C.body,
    marginTop: 2,
  },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
  },
  warnText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#B91C1C',
  },

  listCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
  },
  choiceOn: {
    backgroundColor: C.accentSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: C.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.accent,
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.accent,
  },

  group: {
    backgroundColor: C.inset,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 60,
  },
  detailSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCE0',
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
    letterSpacing: -0.1,
  },
  detailSub: {
    fontSize: 13,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 1,
  },

  edit: {
    paddingVertical: 14,
  },
  editHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.body,
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCDCE0',
    paddingHorizontal: 14,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.surface,
  },
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCDCE0',
    backgroundColor: C.surface,
    paddingLeft: 14,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
  },
  prefixLine: {
    width: 1,
    height: 22,
    backgroundColor: '#DCDCE0',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: C.ink,
    letterSpacing: 0.5,
  },
  editErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  editError: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCE0',
  },
  payLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
  },
  paySub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  payTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    borderRadius: 18,
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    marginTop: 16,
    ...shadow(10, 14, 0.18),
  },
  ctaOff: {
    backgroundColor: C.inset,
    ...shadow(0, 0, 0),
  },
  ctaCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ctaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.3)',
  },
  ctaAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  trustText: {
    fontSize: 12,
    color: C.secondary,
  },
});
