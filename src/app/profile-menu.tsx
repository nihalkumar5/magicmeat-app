import { useEffect, useState } from 'react';
import {
  Image,
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
import { reorderToCart, savedOn } from '../utils/reorder';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../constants/support';
import { confirmAction, notify } from '../utils/dialogs';
import { pickProfilePhoto } from '../utils/profilePhoto';
import { cleanPhone, isValidPhone } from '../utils/validation';
import { fetchProfile, logOut, saveProfile as saveRemoteProfile } from '../services/backend';
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
  Camera01Icon,
  FavouriteIcon,
} from '../components/HugeIcon';

const C = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  soft: '#F6F6F8',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#9CA3AF',
  hairline: 'rgba(60, 60, 67, 0.12)',
  red: '#DC2626',
  green: '#15803D',
};

const LIVE_STATUS: Record<string, string> = {
  placed: 'Order placed',
  butcher_prepping: 'Being prepared',
  cold_packed: 'Packed',
  rider_assigned: 'Rider assigned',
  out_for_delivery: 'On the way',
};

// Plain list row in the Uber style: line icon, title, optional detail, chevron.
function Row({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.55} accessibilityRole="button">
        <AppIcon icon={icon} size={21} color={C.text} strokeWidth={1.7} />
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
      {!last && <View style={[styles.divider, { marginLeft: 37 }]} />}
    </>
  );
}

export default function ProfileMenuScreen() {
  const { activeOrder, orders, profile, setProfile, savedAddresses, profilePhoto, setProfilePhoto } = useStore();
  const wishlistCount = useStore((s) => s.wishlist.length);

  const changePhoto = async () => {
    try {
      const photo = await pickProfilePhoto();
      if (photo) setProfilePhoto(photo);
    } catch {
      notify('Photo not added', 'Please try a different photo.');
    }
  };
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
    setProfile({
      name: profile.name,
      phone: profile.phone,
      email: profile.email || '',
    });
    try {
      await saveRemoteProfile(profile);
      setIsEditOpen(false);
    } catch {
      setIsEditOpen(false);
      notify('Saved on this phone', 'Could not reach the server. Your profile will sync next time.');
    }
  };

  const initial = userName.trim() ? userName.trim()[0].toUpperCase() : '';
  const hasDetails = !!userName.trim() && !!userPhone;
  const version = Constants.expoConfig?.version || '1.0.0';

  // Real numbers from this customer's own orders.
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const totalSaved = nonCancelled.reduce((sum, o) => sum + savedOn(o), 0);
  const firstOrderMs = orders.reduce((min, o) => Math.min(min, o.createdAtMs || Infinity), Infinity);
  const memberSince = Number.isFinite(firstOrderMs)
    ? new Date(firstOrderMs).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : '';
  const lastOrder = orders.find((o) => o.status === 'delivered') || orders.find((o) => o.status === 'cancelled');
  const lastItem = lastOrder?.items[0];
  const lastSummary = lastItem
    ? `${lastItem.quantity}× ${lastItem.product.name.replace(/\s*\(.*?\)\s*/g, ' ').trim()}${
        lastOrder && lastOrder.items.length > 1 ? ` + ${lastOrder.items.length - 1} more` : ''
      }`
    : '';

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
          <AppIcon icon={ArrowLeft01Icon} size={20} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={{ width: 40, alignItems: 'flex-end' }}>
          {hasDetails && (
            <TouchableOpacity onPress={openEditProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.link}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Member card: the home header's crimson, glow and bird, so the
            brand reads the same across the app */}
        <View style={styles.member}>
          <View pointerEvents="none" style={styles.memberGlow} />
          <Image
            pointerEvents="none"
            source={require('../../assets/brand/bird.png')}
            style={styles.memberBird}
            resizeMode="contain"
          />

          <View style={styles.memberTop}>
            <TouchableOpacity
              style={styles.memberAvatar}
              onPress={changePhoto}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={profilePhoto ? 'Change profile photo' : 'Add profile photo'}
            >
              <View style={styles.memberAvatarInner}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.memberAvatarImg} />
                ) : initial ? (
                  <Text style={styles.memberInitial}>{initial}</Text>
                ) : (
                  <AppIcon icon={UserIcon} size={30} color="#B91C1C" strokeWidth={1.9} />
                )}
              </View>
              <View style={styles.memberCamera}>
                <AppIcon icon={Camera01Icon} size={12} color="#B91C1C" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, minWidth: 0 }}
              onPress={openEditProfile}
              activeOpacity={0.75}
              accessibilityLabel="Edit profile"
            >
              <Text style={styles.memberName} numberOfLines={2}>
                {userName.trim() || 'Add your name'}
              </Text>
              <Text style={styles.memberPhone} numberOfLines={1}>
                {hasDetails ? `+91 ${userPhone}` : 'Tap to add your details'}
              </Text>
              <View style={styles.memberSince}>
                <Text style={styles.memberSinceText}>{memberSince ? `Member since ${memberSince}` : 'New member'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.memberStats}>
            {[
              { value: String(delivered), label: delivered === 1 ? 'Order\ndelivered' : 'Orders\ndelivered' },
              { value: `₹${totalSaved}`, label: 'Saved\non MRP' },
              { value: String(wishlistCount), label: 'Saved\nitems' },
            ].map((t) => (
              <View key={t.label} style={styles.memberTile}>
                <Text style={styles.memberTileValue} numberOfLines={1} adjustsFontSizeToFit>
                  {t.value}
                </Text>
                <Text style={styles.memberTileLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!hasDetails && (
          <TouchableOpacity style={styles.prompt} onPress={openEditProfile} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptTitle}>Add your name & number</Text>
              <Text style={styles.promptSub}>Checkout becomes one tap, and the rider can reach you.</Text>
            </View>
            <View style={styles.promptBtn}>
              <Text style={styles.promptBtnText}>Add</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Live order */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.liveCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/order-tracking/[id]',
                params: { id: activeOrder.id },
              })
            }
            accessibilityRole="button"
          >
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveTitle}>{LIVE_STATUS[activeOrder.status] || 'Order in progress'}</Text>
              <Text style={styles.liveSub} numberOfLines={1}>
                Arriving {activeOrder.deliveryMode === 'instant' ? 'in ' : ''}
                {activeOrder.eta} · ₹{activeOrder.total}
              </Text>
            </View>
            <Text style={styles.liveAction}>Track</Text>
          </TouchableOpacity>
        )}

        {/* Order again */}
        {!!lastOrder && !!lastItem && (
          <View style={styles.againCard}>
            <Image source={{ uri: optimizeImageUrl(lastItem.product.image, 140) }} style={styles.againImg} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.againEyebrow}>Order again</Text>
              <Text style={styles.againTitle} numberOfLines={1}>
                {lastSummary}
              </Text>
              <Text style={styles.againSub}>From your last order</Text>
            </View>
            <TouchableOpacity
              style={styles.againBtn}
              onPress={() => reorderToCart(lastOrder)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Order ${lastSummary} again`}
            >
              <Text style={styles.againBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lists */}
        <Text style={styles.sectionTitle}>Your account</Text>
        <Row
          icon={DeliveryBox01Icon}
          title="Your orders"
          subtitle={orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : 'No orders yet'}
          onPress={() => router.push('/(tabs)/orders')}
        />
        <Row
          icon={FavouriteIcon}
          title="Saved items"
          subtitle={wishlistCount ? `${wishlistCount} saved` : 'Tap the heart on a product to save it'}
          onPress={() => router.push('/wishlist')}
        />
        <Row
          icon={Location01Icon}
          title="Saved addresses"
          subtitle={`${savedAddresses.length} saved`}
          onPress={() => router.push('/location-select')}
        />
        <Row
          icon={UserIcon}
          title="Personal details"
          subtitle={hasDetails ? userEmail || 'Name and mobile number' : 'Add name and mobile number'}
          onPress={openEditProfile}
          last
        />

        <Text style={styles.sectionTitle}>Help</Text>
        {!!SUPPORT_PHONE && (
          <Row
            icon={Call02Icon}
            title="Call us"
            subtitle="Talk to our support team"
            onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)}
          />
        )}
        <Row
          icon={Mail01Icon}
          title="Email us"
          subtitle={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <Row
          icon={ShieldCheckIcon}
          title="Our freshness promise"
          onPress={() =>
            notify(
              'Our freshness promise',
              'Every order is cut fresh and packed cold. If anything isn’t right, email us with your order number and we’ll replace it or refund you.',
            )
          }
        />
        <Row
          icon={Invoice01Icon}
          title="Refunds & replacements"
          onPress={() =>
            notify(
              'Refunds & replacements',
              'Email us with your order number and a photo if something is wrong. Our team reviews every request.',
            )
          }
        />
        <Row
          icon={Store01Icon}
          title="Store admin"
          subtitle="For MagicMeat staff"
          onPress={() => router.push('/admin')}
          last
        />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            confirmAction('Log out?', "You'll need your mobile number and a code to log back in.", 'Log out', () => {
              setProfile({ name: '', phone: '', email: '' });
              setProfilePhoto('');
              useStore.setState({ wishlist: [], appliedCouponCode: null });
              logOut().catch(() => notify('Could not log out', 'Please try again.'));
            })
          }
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <AppIcon icon={Cash01Icon} size={15} color={C.secondary} strokeWidth={2} />
            <Text style={styles.footerText}>Pay with cash or UPI when your order arrives</Text>
          </View>
          <Text style={styles.brand}>
            MAGIC<Text style={{ color: C.red }}>MEAT</Text>
          </Text>
          <Text style={styles.version}>100% Jhatka · Version {version}</Text>
        </View>
      </ScrollView>

      {/* Edit sheet */}
      <Modal visible={isEditOpen} transparent animationType="slide" onRequestClose={() => setIsEditOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setIsEditOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={() => setIsEditOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.link, { fontWeight: '500' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{hasDetails ? 'Edit profile' : 'Your details'}</Text>
              <TouchableOpacity onPress={saveProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.link, { fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetPhoto}>
              <TouchableOpacity
                onPress={changePhoto}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={profilePhoto ? 'Change photo' : 'Add photo'}
              >
                <View style={styles.sheetAvatar}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                  ) : (
                    <AppIcon icon={Camera01Icon} size={26} color={C.secondary} strokeWidth={1.8} />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.sheetPhotoLinks}>
                <TouchableOpacity onPress={changePhoto} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.link, { fontWeight: '700' }]}>
                    {profilePhoto ? 'Change photo' : 'Add photo'}
                  </Text>
                </TouchableOpacity>
                {!!profilePhoto && (
                  <TouchableOpacity
                    onPress={() => setProfilePhoto('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeLink}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  member: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#BE1E2D',
    shadowColor: '#5A0A12',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  memberGlow: {
    position: 'absolute',
    top: -130,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,214,170,0.16)',
  },
  memberBird: {
    position: 'absolute',
    right: -24,
    top: 18,
    width: 160,
    height: 105,
    opacity: 0.08,
    tintColor: '#FFFFFF',
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberAvatar: {
    width: 76,
    height: 76,
  },
  memberAvatarInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#FDECEC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberInitial: {
    fontSize: 30,
    fontWeight: '800',
    color: '#B91C1C',
  },
  memberCamera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  memberName: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  memberPhone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  memberSince: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  memberSinceText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  memberTile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  memberTileValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  memberTileLabel: {
    fontSize: 11.5,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },
  logoutBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.red,
  },
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: C.red,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },

  /* identity card */
  idCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 6,
    marginBottom: 20,
  },
  idLeft: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '700',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.red,
    borderWidth: 3,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sheetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetPhotoLinks: {
    gap: 8,
  },
  removeLink: {
    fontSize: 15,
    fontWeight: '600',
    color: C.secondary,
  },
  verified: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.red,
    borderWidth: 3,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  idMeta: {
    marginTop: 3,
    fontSize: 13,
    color: C.secondary,
  },
  idRight: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  statRow: {
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },

  /* prompt */
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.soft,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  promptSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  promptBtn: {
    backgroundColor: C.text,
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
  },
  promptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* live order */
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.text,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
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

  /* order again */
  againCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.soft,
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
  },
  againImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  againEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
  },
  againTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginTop: 1,
  },
  againSub: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 1,
  },
  againBtn: {
    backgroundColor: C.red,
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
  },
  againBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* lists */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
    marginTop: 26,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 58,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 16,
    color: C.text,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },

  /* footer */
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: C.secondary,
  },
  brand: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    color: C.text,
  },
  version: {
    fontSize: 11,
    color: C.placeholder,
    marginTop: 4,
  },

  /* sheet */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: '#F2F2F7',
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
