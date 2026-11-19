import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../store/useStore';
import { notify, confirmAction } from '../utils/dialogs';
import { goBack } from '../utils/navigation';
import { LocationData, MAGICMEAT_HUBS, DarkStoreHub } from '../types/location';
import {
  detectDeviceLocation,
  POPULAR_LOCATIONS,
} from '../services/locationService';
import {
  AppIcon,
  ArrowLeft01Icon,
  Store01Icon,
  Location01Icon,
  Clock01Icon,
  Search01Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
  Home01Icon,
  Briefcase01Icon,
  Navigation03Icon,
  Tick02Icon,
} from '../components/HugeIcon';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#8E8E93',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  redBg: '#FEF2F2',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  fill: 'rgba(118, 118, 128, 0.12)',
};

const TAG_ICON: Record<string, any> = { Home: Home01Icon, Work: Briefcase01Icon };

export default function LocationSelectScreen() {
  const {
    currentLocation,
    setCurrentLocation,
    savedAddresses,
    addSavedAddress,
    removeSavedAddress,
    orderFulfillment,
    setOrderFulfillment,
  } = useStore();

  const [activeMode, setActiveMode] = useState<'delivery' | 'takeaway'>(
    orderFulfillment || 'delivery'
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New Address Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Raipur');
  const [newTag, setNewTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Store Pickup Search
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  const handleSelectDeliveryLocation = (loc: LocationData) => {
    setCurrentLocation(loc);
    setOrderFulfillment('delivery');
    goBack();
  };

  const handleSelectPickupStore = (hub: DarkStoreHub) => {
    const hubLocation: LocationData = {
      shortAddress: hub.name,
      fullAddress: hub.address || `${hub.name}, ${hub.city}`,
      city: hub.city,
      state: '',
      coords: hub.coords,
      isServiceable: true,
      nearestHubName: hub.name,
      distanceKm: hub.distanceKm || 0.5,
      deliveryEta: 'Pickup in 10 Mins',
      tag: 'Work',
    };
    setCurrentLocation(hubLocation);
    setOrderFulfillment('takeaway');
    goBack();
  };

  const handleUseCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectDeviceLocation();
      setCurrentLocation(detected);
      if ((detected.accuracyM ?? 0) > 75) {
        notify(
          'Please check your address',
          `Your location is accurate to about ${detected.accuracyM} m. Make sure the address is right before you order.`
        );
      }
      setOrderFulfillment('delivery');
      setIsDetecting(false);
      goBack();
    } catch (err: any) {
      setIsDetecting(false);
      notify(
        'Couldn’t find your location',
        err.message || 'Please allow location access, or pick a saved address.'
      );
    }
  };

  const handleSaveNewAddress = () => {
    if (!newTitle.trim() || !newAddress.trim()) {
      notify('Add the address', 'Please enter a name (like Home) and the full address.');
      return;
    }

    const created: LocationData = {
      shortAddress: newTitle.trim(),
      fullAddress: [newAddress.trim(), newCity.trim()].filter(Boolean).join(', '),
      city: newCity.trim(),
      state: 'Chhattisgarh',
      coords: { latitude: 21.2514, longitude: 81.6296 },
      isServiceable: true,
      nearestHubName: 'Raipur Central Butchery Hub (Civil Lines)',
      distanceKm: 2.5,
      deliveryEta: '15–20 mins',
      tag: newTag,
    };

    addSavedAddress(created);
    setCurrentLocation(created);
    setOrderFulfillment('delivery');
    setIsAddingNew(false);
    setNewTitle('');
    setNewAddress('');
    goBack();
  };

  const filteredPlaces = POPULAR_LOCATIONS.filter(
    (p) =>
      searchQuery.trim() === '' ||
      p.shortAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHubs = MAGICMEAT_HUBS.filter(
    (h) =>
      storeSearchQuery.trim() === '' ||
      h.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
      (h.address && h.address.toLowerCase().includes(storeSearchQuery.toLowerCase()))
  );

  const q = searchQuery.trim().toLowerCase();
  const isDeliveryMode = activeMode === 'delivery';
  const isSavedSelected = (item: LocationData) =>
    orderFulfillment === 'delivery' &&
    (currentLocation.shortAddress === item.shortAddress || currentLocation.fullAddress === item.fullAddress);
  const isHubSelected = (hub: DarkStoreHub) =>
    orderFulfillment === 'takeaway' &&
    (currentLocation.shortAddress.includes(hub.name) || !!currentLocation.nearestHubName?.includes(hub.name));

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
        <Text style={styles.navTitle}>{isDeliveryMode ? 'Delivery address' : 'Pickup store'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmented}>
          {(
            [
              { key: 'delivery', label: 'Delivery' },
              { key: 'takeaway', label: 'Pickup' },
            ] as const
          ).map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.segment, activeMode === m.key && styles.segmentActive]}
              onPress={() => {
                setActiveMode(m.key);
                setSearchQuery('');
                setStoreSearchQuery('');
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeMode === m.key }}
            >
              <Text style={[styles.segmentText, activeMode === m.key && { fontWeight: '700' }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {isDeliveryMode ? (
          <>
            {/* Search */}
            <View style={styles.field}>
              <AppIcon icon={Search01Icon} size={17} color={C.placeholder} strokeWidth={2.2} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Search area, street or city"
                placeholderTextColor={C.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                accessibilityLabel="Search address"
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={styles.clearCircle}>
                    <AppIcon icon={Cancel01Icon} size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {q ? (
              <>
                <Text style={styles.sectionLabel}>RESULTS</Text>
                {filteredPlaces.length === 0 ? (
                  <View style={[styles.card, styles.emptyCard]}>
                    <Text style={styles.emptyTitle}>No matching area</Text>
                    <Text style={styles.emptySub}>Try a nearby locality, or add the address yourself.</Text>
                  </View>
                ) : (
                  <View style={styles.card}>
                    {filteredPlaces.map((place, idx) => (
                      <View key={`${place.shortAddress}-${idx}`}>
                        {idx > 0 && <View style={[styles.divider, { marginLeft: 58 }]} />}
                        <TouchableOpacity
                          style={styles.row}
                          onPress={() => handleSelectDeliveryLocation(place)}
                          activeOpacity={0.6}
                        >
                          <View style={[styles.tile, { backgroundColor: C.bg }]}>
                            <AppIcon icon={Location01Icon} size={17} color={C.secondary} strokeWidth={2} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.rowTitle} numberOfLines={1}>{place.shortAddress}</Text>
                            <Text style={styles.rowSub} numberOfLines={2}>{place.fullAddress}</Text>
                            {!place.isServiceable && <Text style={styles.notServed}>Not delivering here yet</Text>}
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Actions */}
                <View style={[styles.card, { marginTop: 16 }]}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleUseCurrentLocation}
                    disabled={isDetecting}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                  >
                    <View style={[styles.tile, { backgroundColor: C.blueBg }]}>
                      {isDetecting ? (
                        <ActivityIndicator size="small" color={C.blue} />
                      ) : (
                        <AppIcon icon={Navigation03Icon} size={17} color={C.blue} strokeWidth={2.2} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: C.blue }]}>
                        {isDetecting ? 'Finding your location…' : 'Use my current location'}
                      </Text>
                      <Text style={styles.rowSub}>For the most accurate delivery</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={[styles.divider, { marginLeft: 58 }]} />
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setIsAddingNew(!isAddingNew)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                  >
                    <View style={[styles.tile, { backgroundColor: C.redBg }]}>
                      <AppIcon icon={isAddingNew ? Cancel01Icon : Add01Icon} size={17} color={C.red} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.rowTitle, { color: C.red, flex: 1 }]}>
                      {isAddingNew ? 'Cancel new address' : 'Add a new address'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* New address form */}
                {isAddingNew && (
                  <>
                    <Text style={styles.sectionLabel}>NEW ADDRESS</Text>
                    <View style={styles.card}>
                      <View style={styles.tagRow}>
                        {(['Home', 'Work', 'Other'] as const).map((tag) => (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tagChip, newTag === tag && styles.tagChipActive]}
                            onPress={() => {
                              setNewTag(tag);
                              if (!newTitle.trim() || ['Home', 'Work', 'Other'].includes(newTitle.trim())) setNewTitle(tag);
                            }}
                          >
                            <Text style={[styles.tagChipText, newTag === tag && { color: '#FFFFFF' }]}>{tag}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.formRow}>
                        <Text style={styles.formLabel}>Name</Text>
                        <TextInput
                          style={styles.formInput}
                          value={newTitle}
                          onChangeText={setNewTitle}
                          placeholder="e.g. Home, Mom’s place"
                          placeholderTextColor={C.placeholder}
                          maxLength={40}
                        />
                      </View>
                      <View style={styles.divider} />
                      <View style={[styles.formRow, { alignItems: 'flex-start' }]}>
                        <Text style={[styles.formLabel, { paddingTop: 14 }]}>Address</Text>
                        <TextInput
                          style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                          value={newAddress}
                          onChangeText={setNewAddress}
                          placeholder="House / flat, street, landmark"
                          placeholderTextColor={C.placeholder}
                          multiline
                          maxLength={200}
                        />
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.formRow}>
                        <Text style={styles.formLabel}>City</Text>
                        <TextInput
                          style={styles.formInput}
                          value={newCity}
                          onChangeText={setNewCity}
                          placeholder="City"
                          placeholderTextColor={C.placeholder}
                          maxLength={40}
                        />
                      </View>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveNewAddress} activeOpacity={0.85}>
                      <Text style={styles.primaryBtnText}>Save & deliver here</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Saved */}
                {savedAddresses.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>
                    <View style={styles.card}>
                      {savedAddresses.map((item, idx) => {
                        const selected = isSavedSelected(item);
                        const TagIcon = TAG_ICON[item.tag || ''] || Location01Icon;
                        return (
                          <View key={`${item.shortAddress}-${idx}`}>
                            {idx > 0 && <View style={[styles.divider, { marginLeft: 58 }]} />}
                            <View style={styles.row}>
                              <TouchableOpacity
                                style={styles.rowMain}
                                onPress={() => handleSelectDeliveryLocation(item)}
                                activeOpacity={0.6}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                accessibilityLabel={`Deliver to ${item.shortAddress}`}
                              >
                                <View style={[styles.tile, { backgroundColor: selected ? C.red : C.bg }]}>
                                  <AppIcon icon={TagIcon} size={17} color={selected ? '#FFFFFF' : C.secondary} strokeWidth={2} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <View style={styles.titleLine}>
                                    <Text style={styles.rowTitle} numberOfLines={1}>{item.shortAddress}</Text>
                                    {!!item.tag && item.tag !== item.shortAddress && (
                                      <Text style={styles.tag}>{item.tag}</Text>
                                    )}
                                  </View>
                                  <Text style={styles.rowSub} numberOfLines={2}>{item.fullAddress}</Text>
                                  {item.isServiceable === false ? (
                                    <Text style={styles.notServed}>Not delivering here yet</Text>
                                  ) : (
                                    !!item.distanceKm && <Text style={styles.distance}>{item.distanceKm} km away</Text>
                                  )}
                                </View>
                                {selected && <AppIcon icon={Tick02Icon} size={20} color={C.red} strokeWidth={2.6} />}
                              </TouchableOpacity>
                              {savedAddresses.length > 1 && !selected && (
                                <TouchableOpacity
                                  onPress={() =>
                                    confirmAction(
                                      'Delete address?',
                                      `“${item.shortAddress}” will be removed from your saved addresses.`,
                                      'Delete',
                                      () => removeSavedAddress(item.shortAddress)
                                    )
                                  }
                                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                                  accessibilityLabel={`Delete ${item.shortAddress}`}
                                >
                                  <AppIcon icon={Delete02Icon} size={17} color="#C7C7CC" strokeWidth={2} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* Pickup */}
            <View style={styles.field}>
              <AppIcon icon={Search01Icon} size={17} color={C.placeholder} strokeWidth={2.2} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Search store or city"
                placeholderTextColor={C.placeholder}
                value={storeSearchQuery}
                onChangeText={setStoreSearchQuery}
                autoCorrect={false}
                accessibilityLabel="Search stores"
              />
              {!!storeSearchQuery && (
                <TouchableOpacity onPress={() => setStoreSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={styles.clearCircle}>
                    <AppIcon icon={Cancel01Icon} size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.helper}>Order now and pick it up in about 10 minutes. No delivery fee.</Text>

            <Text style={styles.sectionLabel}>STORES ({filteredHubs.length})</Text>
            {filteredHubs.length === 0 ? (
              <View style={[styles.card, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>No store found</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {filteredHubs.map((hub, idx) => {
                  const selected = isHubSelected(hub);
                  return (
                    <View key={hub.id}>
                      {idx > 0 && <View style={[styles.divider, { marginLeft: 58 }]} />}
                      <TouchableOpacity
                        style={styles.row}
                        onPress={() => handleSelectPickupStore(hub)}
                        activeOpacity={0.6}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Pick up from ${hub.name}`}
                      >
                        <View style={[styles.tile, { backgroundColor: selected ? C.red : C.redBg }]}>
                          <AppIcon icon={Store01Icon} size={17} color={selected ? '#FFFFFF' : C.red} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>{hub.name}</Text>
                          {!!hub.address && <Text style={styles.rowSub} numberOfLines={2}>{hub.address}</Text>}
                          <View style={styles.hubMeta}>
                            <AppIcon icon={Clock01Icon} size={12} color={C.secondary} strokeWidth={2} />
                            <Text style={styles.distance}>
                              {hub.timings || '7 AM – 10 PM'}
                              {hub.distanceKm ? ` · ${hub.distanceKm} km` : ''}
                            </Text>
                          </View>
                        </View>
                        {selected && <AppIcon icon={Tick02Icon} size={20} color={C.red} strokeWidth={2.6} />}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: C.fill,
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: C.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  content: {
    paddingHorizontal: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: C.fill,
  },
  fieldInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: C.text,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null),
  },
  clearCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#AEAEB2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 10,
    marginLeft: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.secondary,
    letterSpacing: 0.4,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 6,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    flexShrink: 1,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: C.secondary,
    marginTop: 2,
  },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary,
    backgroundColor: C.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  distance: {
    fontSize: 12,
    color: C.secondary,
    marginTop: 3,
  },
  notServed: {
    fontSize: 12,
    fontWeight: '600',
    color: C.red,
    marginTop: 3,
  },
  hubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  emptyCard: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  emptySub: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  tagChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: C.bg,
    justifyContent: 'center',
  },
  tagChipActive: {
    backgroundColor: C.text,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 8,
  },
  formLabel: {
    width: 70,
    fontSize: 16,
    color: C.text,
  },
  formInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: C.text,
    paddingVertical: 12,
  },
  primaryBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
