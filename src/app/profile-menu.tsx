import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { reorderToCart, savedOn } from '../utils/reorder';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../store/useStore';
import { goBack } from '../utils/navigation';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../constants/support';
import { notify } from '../utils/dialogs';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { fetchProfile, saveProfile as saveRemoteProfile } from '../services/backend';
import {
  AppIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Call02Icon,
  Cash01Icon,
  DeliveryBox01Icon,
  Invoice01Icon,
  Location01Icon,
  Mail01Icon,
  ShieldCheckIcon,
  Store01Icon,
  UserIcon,
  RotateLeft01Icon,
} from '../components/HugeIcon';

const MAROON = '#7F1D1D';
const GOLD = '#E8C27A';
const GREEN = '#15803D';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#16A34A',
};

const LIVE_STATUS: Record<string, string> = {
  placed: 'Order placed',
  butcher_prepping: 'Being prepared',
  cold_packed: 'Packed',
  rider_assigned: 'Rider assigned',
  out_for_delivery: 'On the way',
};

function Row({
  icon,
  tint,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: any;
  tint: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6} accessibilityRole="button">
        <View style={[styles.rowIcon, { backgroundColor: tint }]}>
          <AppIcon icon={icon} size={17} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {!!subtitle && (
            <Text style={styles.rowSub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <AppIcon icon={ArrowRight01Icon} size={16} color="#C7C7CC" strokeWidth={2.2} />
      </TouchableOpacity>
      {!last && <View style={[styles.divider, { marginLeft: 58 }]} />}
    </>
  );
}

export default function ProfileMenuScreen() {
  const { activeOrder, orders, profile, setProfile, savedAddresses } = useStore();
  const userName = profile.name;
  const userPhone = profile.phone;
  const userEmail = profile.email;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const uid = useStore((s) => s.uid);

  // Load the profile saved under this guest account, once signed in.
  useEffect(() => {
    if (!uid) return;

    let mounted = true;
    fetchProfile().then((remote) => {
      if (!mounted || !remote) return;
      const current = useStore.getState().profile;
      setProfile({
        name: remote.name || current.name,
        phone: remote.phone || current.phone,
        email: remote.email || current.email,
      });
    });

    return () => {
      mounted = false;
    };
  }, [uid, setProfile]);

  const openEditProfile = () => {
    setEditName(userName);
    setEditPhone(userPhone);
    setEditEmail(userEmail);
    setIsEditOpen(true);
  };

  const saveProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      notify('Required fields', 'Please enter your name and mobile number.');
      return;
    }
    if (!isValidPhone(editPhone)) {
      notify('Invalid mobile number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const profile = {
      name: editName.trim(),
      phone: cleanPhone(editPhone),
      email: editEmail.trim() || undefined,
    };
    setProfile({ name: profile.name, phone: profile.phone, email: profile.email || '' });
    try {
      await saveRemoteProfile(profile);
      setIsEditOpen(false);
    } catch {
      setIsEditOpen(false);
      notify('Saved on this phone', 'Could not reach the server. Your profile will sync next time.');
    }
  };

  const insets = useSafeAreaInsets();
  const initial = userName.trim() ? userName.trim()[0].toUpperCase() : '';
  const hasDetails = !!userName.trim() && !!userPhone;
  const version = Constants.expoConfig?.version || '1.0.0';

  // Real numbers from this customer's orders.
  const completed = orders.filter((o) => o.status === 'delivered');
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const totalSaved = nonCancelled.reduce((sum, o) => sum + savedOn(o), 0);
  const kgOrdered =
    Math.round(
      nonCancelled.reduce(
        (sum, o) =>
          sum + o.items.reduce((g, item) => g + (parseInt(item.selectedCut.netWeight, 10) || 0) * item.quantity, 0),
        0
      ) / 100
    ) / 10;
  const firstOrderMs = orders.reduce((min, o) => Math.min(min, o.createdAtMs || Infinity), Infinity);
  const memberSince = Number.isFinite(firstOrderMs)
    ? new Date(firstOrderMs).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';
  const lastOrder = orders.find((o) => o.status === 'delivered') || orders.find((o) => o.status === 'cancelled');
  const lastSummary = lastOrder
    ? `${lastOrder.items[0]?.quantity ?? 1}× ${(lastOrder.items[0]?.product.name || 'Order').replace(/\s*\(.*?\)\s*/g, ' ').trim()}${
        lastOrder.items.length > 1 ? ` + ${lastOrder.items.length - 1} more` : ''
      }`
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Royal header */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroNav}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <AppIcon icon={ArrowLeft01Icon} size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            {hasDetails && (
              <TouchableOpacity onPress={openEditProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.heroLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroIdentity}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {initial ? (
                  <Text style={styles.avatarText}>{initial}</Text>
                ) : (
                  <AppIcon icon={UserIcon} size={32} color={GOLD} strokeWidth={1.8} />
                )}
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {userName.trim() || 'Welcome'}
              </Text>
              {hasDetails ? (
                <Text style={styles.heroMeta} numberOfLines={1}>
                  +91 {userPhone}
                  {userEmail ? `  ·  ${userEmail}` : ''}
                </Text>
              ) : (
                <Text style={styles.heroMeta}>Add your details for faster checkout</Text>
              )}
              {!!memberSince && (
                <View style={styles.sincePill}>
                  <Text style={styles.sinceText}>Customer since {memberSince}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: GREEN }]}>₹{totalSaved}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{kgOrdered} kg</Text>
              <Text style={styles.statLabel}>Fresh meat</Text>
            </View>
          </View>

          {!hasDetails && (
            <TouchableOpacity style={styles.addDetails} onPress={openEditProfile} activeOpacity={0.85}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addTitle}>Add your name & number</Text>
                <Text style={styles.addSub}>So checkout takes one tap and the rider can reach you.</Text>
              </View>
              <Text style={styles.addCta}>Add</Text>
            </TouchableOpacity>
          )}

          {/* Live order */}
          {activeOrder && (
            <TouchableOpacity
              style={styles.liveCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/order-tracking/[id]', params: { id: activeOrder.id } })}
              accessibilityRole="button"
            >
              <View style={styles.liveDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.liveTitle}>{LIVE_STATUS[activeOrder.status] || 'Order in progress'}</Text>
                <Text style={styles.liveSub} numberOfLines={1}>
                  #{activeOrder.id.replace('MM-', '')} · ₹{activeOrder.total}
                </Text>
              </View>
              <Text style={styles.liveAction}>Track</Text>
            </TouchableOpacity>
          )}

          {/* Order again */}
          {!!lastOrder && (
            <View style={styles.againCard}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.againEyebrow}>ORDER AGAIN</Text>
                <Text style={styles.againTitle} numberOfLines={1}>
                  {lastSummary}
                </Text>
                <Text style={styles.againSub}>Your last order · one tap to the basket</Text>
              </View>
              <TouchableOpacity
                style={styles.againBtn}
                onPress={() => reorderToCart(lastOrder)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Order ${lastSummary} again`}
              >
                <AppIcon icon={RotateLeft01Icon} size={16} color={MAROON} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}

        <View style={styles.group}>
          <Row
            icon={DeliveryBox01Icon}
            tint="#DC2626"
            title="Your orders"
            subtitle={orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : 'No orders yet'}
            onPress={() => router.push('/(tabs)/orders')}
          />
          <Row
            icon={Location01Icon}
            tint="#2563EB"
            title="Saved addresses"
            subtitle={`${savedAddresses.length} saved`}
            onPress={() => router.push('/location-select')}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>HELP</Text>
        <View style={styles.group}>
          {!!SUPPORT_PHONE && (
            <Row
              icon={Call02Icon}
              tint="#16A34A"
              title="Call us"
              subtitle="Talk to our support team"
              onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)}
            />
          )}
          <Row
            icon={Mail01Icon}
            tint="#0EA5E9"
            title="Email us"
            subtitle={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <Row
            icon={ShieldCheckIcon}
            tint="#16A34A"
            title="Our freshness promise"
            subtitle="How we keep it fresh"
            onPress={() =>
              notify(
                'Our freshness promise',
                'Every order is cut fresh and packed cold. If anything isn’t right, email us with your order number and we’ll replace it or refund you.'
              )
            }
          />
          <Row
            icon={Invoice01Icon}
            tint="#F59E0B"
            title="Refunds & replacements"
            subtitle="If something isn’t right"
            onPress={() =>
              notify(
                'Refunds & replacements',
                'Email us with your order number and a photo if something is wrong. Our team reviews every request.'
              )
            }
            last
          />
        </View>

        <View style={styles.group}>
          <Row
            icon={Store01Icon}
            tint="#6B7280"
            title="Store admin"
            subtitle="For MagicMeat staff"
            onPress={() => router.push('/admin')}
            last
          />
        </View>

          <View style={styles.footer}>
            <AppIcon icon={Cash01Icon} size={15} color={C.secondary} strokeWidth={2} />
            <Text style={styles.footerText}>Pay with cash or UPI when your order arrives.</Text>
          </View>
          <Text style={styles.brand}>MAGICMEAT</Text>
          <Text style={styles.version}>100% Halal · v{version}</Text>
        </View>
      </ScrollView>

      {/* Edit sheet */}
      <Modal visible={isEditOpen} transparent animationType="slide" onRequestClose={() => setIsEditOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setIsEditOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setIsEditOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.link, { fontWeight: '500' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{hasDetails ? 'Edit profile' : 'Your details'}</Text>
              <TouchableOpacity onPress={saveProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.link, { fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={C.placeholder}
                  style={styles.formInput}
                  autoComplete="name"
                  maxLength={80}
                  autoFocus={!hasDetails}
                />
              </View>
              <View style={[styles.divider, { marginLeft: 14 }]} />
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Mobile</Text>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="10-digit number"
                  placeholderTextColor={C.placeholder}
                  keyboardType="phone-pad"
                  style={styles.formInput}
                  autoComplete="tel"
                  maxLength={14}
                />
              </View>
              <View style={[styles.divider, { marginLeft: 14 }]} />
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Optional"
                  placeholderTextColor={C.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.formInput}
                  maxLength={120}
                />
              </View>
            </View>
            <Text style={styles.formNote}>We use your number only to reach you about your orders.</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* royal header */
  hero: {
    backgroundColor: MAROON,
    paddingHorizontal: 16,
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLink: {
    fontSize: 16,
    fontWeight: '600',
    color: GOLD,
  },
  heroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#5B1414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: GOLD,
    fontSize: 30,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
  },
  sincePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(232,194,122,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(232,194,122,0.4)',
  },
  sinceText: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 16,
  },

  /* stats */
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: -36,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  statLabel: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: C.hairline,
  },
  addDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  addSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  addCta: {
    fontSize: 15,
    fontWeight: '700',
    color: C.red,
  },
  againCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1C1917',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232,194,122,0.35)',
  },
  againEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 1,
  },
  againTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  againSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  againBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
    color: MAROON,
  },
  version: {
    fontSize: 11,
    color: C.placeholder,
    textAlign: 'center',
    marginTop: 4,
  },
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: C.red,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },

  /* identity */

  /* live order */
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.text,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  liveTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  liveSub: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 2,
  },
  liveAction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* groups */
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 6,
  },
  group: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    paddingVertical: 8,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    color: C.text,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: C.secondary,
  },

  /* sheet */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
    marginTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  form: {
    backgroundColor: C.card,
    borderRadius: 14,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 8,
  },
  formLabel: {
    width: 64,
    fontSize: 16,
    color: C.text,
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
  formNote: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 8,
    marginLeft: 6,
  },
});
