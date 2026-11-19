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
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from '../components/HugeIcon';

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
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'synced'>('idle');
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
      setFirebaseStatus('synced');
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
      setFirebaseStatus('synced');
      setIsEditOpen(false);
    } catch {
      setIsEditOpen(false);
      notify('Saved on this phone', 'Could not reach the server. Your profile will sync next time.');
    }
  };

  const initial = userName.trim() ? userName.trim()[0].toUpperCase() : '';
  const hasDetails = !!userName.trim() && !!userPhone;
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.4} />
        </TouchableOpacity>
        {hasDetails && (
          <TouchableOpacity onPress={openEditProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.link}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {initial ? (
              <Text style={styles.avatarText}>{initial}</Text>
            ) : (
              <AppIcon icon={UserIcon} size={36} color="#FFFFFF" strokeWidth={1.8} />
            )}
          </View>
          <Text style={styles.name}>{userName.trim() || 'Welcome'}</Text>
          {hasDetails ? (
            <>
              <Text style={styles.meta}>+91 {userPhone}</Text>
              {!!userEmail && <Text style={styles.meta}>{userEmail}</Text>}
              {firebaseStatus === 'synced' && <Text style={styles.synced}>Saved to your account</Text>}
            </>
          ) : (
            <>
              <Text style={[styles.meta, { textAlign: 'center' }]}>
                Add your name and number once for faster checkout.
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={openEditProfile} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>Add your details</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

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
        <Text style={styles.version}>MagicMeat {version}</Text>
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
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: C.red,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },

  /* identity */
  identity: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    marginTop: 12,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  meta: {
    fontSize: 15,
    color: C.secondary,
    marginTop: 3,
  },
  synced: {
    fontSize: 12,
    fontWeight: '600',
    color: C.green,
    marginTop: 6,
  },
  addBtn: {
    marginTop: 14,
    backgroundColor: C.red,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

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
  version: {
    fontSize: 12,
    color: C.placeholder,
    textAlign: 'center',
    marginTop: 6,
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
