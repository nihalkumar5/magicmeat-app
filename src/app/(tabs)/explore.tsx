import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { PRODUCTS } from '../../data/mockData';
import { FREE_DELIVERY_ABOVE } from '../../data/pricing';
import { ShopCard } from '../../components/ShopCard';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useTabBarInset } from '../../components/FloatingTabBar';
import { useStore } from '../../store/useStore';
import type { MeatCategory, Product } from '../../types';
import { AppIcon, Search01Icon, Sorting01Icon, DeliveryTruck01Icon, GridViewIcon } from '../../components/HugeIcon';
import { CATEGORY_IMAGES, CATEGORY_IMG_3D, CATEGORY_TILE_3D } from '../../data/categoryImages';

const C = {
  bg: '#FFFFFF',
  rail: '#F7F7F8',
  text: '#111111',
  secondary: '#6B7280',
  hairline: 'rgba(60, 60, 67, 0.12)',
  red: '#DC2626',
  redBg: '#FEF2F2',
};

const inCategory = (p: Product, id: MeatCategory) =>
  id === 'all'
    ? true
    : id === 'curry-cuts'
      ? p.availableCuts.some((c) => c.name.toLowerCase().includes('curry'))
      : p.category === id;

// Left-rail categories with the MagicMeat category cut-outs; All gets a grid icon.
const CATEGORIES: { id: MeatCategory; label: string; title: string }[] = (
  [
    { id: 'all', label: 'All', title: 'All products' },
    { id: 'chicken', label: 'Chicken', title: 'Chicken' },
    { id: 'mutton', label: 'Mutton', title: 'Mutton' },
    { id: 'fish', label: 'Fish', title: 'Fresh fish' },
    { id: 'curry-cuts', label: 'Curry cuts', title: 'Curry cuts' },
    { id: 'eggs', label: 'Eggs', title: 'Eggs' },
    { id: 'fresh-produce', label: 'Veggies & fruits', title: 'Veggies & fruits' },
  ] as { id: MeatCategory; label: string; title: string }[]
).filter((c) => PRODUCTS.some((p) => inCategory(p, c.id)));

type SortOption = 'popular' | 'low' | 'high';
const SORT_LABEL: Record<SortOption, string> = { popular: 'Popular', low: 'Price: low', high: 'Price: high' };
const NEXT_SORT: Record<SortOption, SortOption> = { popular: 'low', low: 'high', high: 'popular' };

const RAIL = 84;
const PAD = 12;
const GAP = 12;

export default function ShopScreen() {
  const tabInset = useTabBarInset();
  const selected = useStore((s) => s.selectedCategory);
  const setSelected = useStore((s) => s.setSelectedCategory);
  const location = useStore((s) => s.currentLocation);
  const isPickup = useStore((s) => s.orderFulfillment === 'takeaway');
  const cartEmpty = useStore((s) => s.cart.length === 0);
  const [sort, setSort] = useState<SortOption>('popular');
  const { width } = useWindowDimensions();

  const active = CATEGORIES.find((c) => c.id === selected) || CATEGORIES[0];
  const gridWidth = Math.min(width, 900) - RAIL;
  const columns = gridWidth > 560 ? 3 : 2;
  const cardWidth = Math.floor((gridWidth - PAD * 2 - GAP * (columns - 1)) / columns);

  let products = PRODUCTS.filter((p) => inCategory(p, active.id));
  if (sort === 'low') products = [...products].sort((a, b) => a.basePrice - b.basePrice);
  if (sort === 'high') products = [...products].sort((a, b) => b.basePrice - a.basePrice);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {active.title}
          </Text>
          <TouchableOpacity onPress={() => router.push('/location-select')} activeOpacity={0.6}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {isPickup ? 'Pickup from ' : 'Delivering to '}
              <Text style={{ color: C.text, fontWeight: '600' }}>{location.shortAddress}</Text>
              {isPickup ? ' · ready in 10 mins' : ' · 15–20 mins'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/search')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Search products"
        >
          <AppIcon icon={Search01Icon} size={19} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Category rail */}
        <ScrollView
          style={styles.rail}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 + tabInset }}
        >
          {CATEGORIES.map((cat) => {
            const on = cat.id === active.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.railItem, on && styles.railItemOn]}
                onPress={() => setSelected(cat.id)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={cat.label}
              >
                {on && <View style={styles.railBar} />}
                <View style={[styles.railImgWrap, on && styles.railImgWrapOn]}>
                  {CATEGORY_IMAGES[cat.id] ? (
                    <Image source={CATEGORY_IMAGES[cat.id]} style={styles.railImg} resizeMode="contain" />
                  ) : (
                    <AppIcon icon={GridViewIcon} size={22} color={on ? C.red : '#6B7280'} strokeWidth={1.9} />
                  )}
                </View>
                <Text style={[styles.railLabel, on && styles.railLabelOn]} numberOfLines={2}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Products */}
        <View style={{ flex: 1 }}>
          <View style={styles.toolbar}>
            <Text style={styles.count}>
              {products.length} item{products.length === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity
              style={[styles.sortChip, sort !== 'popular' && styles.sortChipOn]}
              onPress={() => setSort(NEXT_SORT[sort])}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Sort: ${SORT_LABEL[sort]}. Tap to change`}
            >
              <AppIcon icon={Sorting01Icon} size={13} color={sort === 'popular' ? C.text : C.red} strokeWidth={2.2} />
              <Text style={[styles.sortText, sort !== 'popular' && { color: C.red }]}>{SORT_LABEL[sort]}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            key={`grid-${columns}`}
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <ShopCard product={item} width={cardWidth} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <TouchableOpacity onPress={() => setSelected('all')}>
                  <Text style={styles.link}>Show everything</Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={<View style={{ height: 90 + tabInset }} />}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        </View>
      </View>

      {cartEmpty && !isPickup && (
        <View style={[styles.freeStrip, { bottom: tabInset + 4 }]}>
          <AppIcon icon={DeliveryTruck01Icon} size={15} color="#166534" strokeWidth={2} />
          <Text style={styles.freeText}>
            FREE DELIVERY on orders above <Text style={{ fontWeight: '800' }}>₹{FREE_DELIVERY_ABOVE}</Text>
          </Text>
        </View>
      )}

      <FloatingCartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.rail,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },

  /* rail */
  rail: {
    width: RAIL,
    flexGrow: 0,
    backgroundColor: C.rail,
  },
  railItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  railItemOn: {
    backgroundColor: C.bg,
  },
  railBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: C.red,
  },
  railImgWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    ...CATEGORY_TILE_3D,
  },
  railImgWrapOn: {
    borderWidth: 2,
    borderColor: C.red,
  },
  railImg: {
    width: '90%',
    height: '90%',
    marginTop: -2,
    ...CATEGORY_IMG_3D,
  },
  railLabel: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: C.secondary,
    fontWeight: '500',
  },
  railLabelOn: {
    color: C.text,
    fontWeight: '700',
  },

  /* grid */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingVertical: 10,
  },
  count: {
    fontSize: 13,
    color: C.secondary,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipOn: {
    borderColor: C.red,
    backgroundColor: C.redBg,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  grid: {
    paddingHorizontal: PAD,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
  },
  freeStrip: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#ECFDF3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BBF7D0',
  },
  freeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    letterSpacing: 0.2,
  },
});
