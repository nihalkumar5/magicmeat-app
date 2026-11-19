import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { PRODUCTS } from '../../data/mockData';
import { DominosCard } from '../../components/DominosCard';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useStore } from '../../store/useStore';
import type { MeatCategory } from '../../types';
import { AppIcon, Search01Icon, Sorting01Icon } from '../../components/HugeIcon';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  red: '#DC2626',
};

const CATEGORIES: { id: MeatCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'mutton', label: 'Mutton' },
  { id: 'fish', label: 'Fish' },
  { id: 'curry-cuts', label: 'Curry cuts' },
  { id: 'ready-to-cook', label: 'Ready to cook' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fresh-produce', label: 'Veggies & fruits' },
];

type SortOption = 'popular' | 'low' | 'high';
const SORT_LABEL: Record<SortOption, string> = {
  popular: 'Popular',
  low: 'Price: low to high',
  high: 'Price: high to low',
};
const NEXT_SORT: Record<SortOption, SortOption> = { popular: 'low', low: 'high', high: 'popular' };

const GUTTER = 16;
const GAP = 12;

export default function ShopScreen() {
  const selectedCategory = useStore((state) => state.selectedCategory);
  const setSelectedCategory = useStore((state) => state.setSelectedCategory);
  const [sort, setSort] = useState<SortOption>('popular');
  const { width } = useWindowDimensions();

  // Two columns on phones, more on wide web screens.
  const columns = Platform.OS === 'web' && width >= 768 ? Math.min(4, Math.floor((width - GUTTER * 2) / 220)) : 2;
  const contentWidth = Platform.OS === 'web' && width >= 768 ? Math.min(width, 980) : width;
  const cardWidth = Math.floor((contentWidth - GUTTER * 2 - GAP * (columns - 1)) / columns);

  let products = PRODUCTS.filter((p) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'curry-cuts') return p.availableCuts.some((c) => c.name.toLowerCase().includes('curry'));
    return p.category === selectedCategory;
  });
  if (sort === 'low') products = [...products].sort((a, b) => a.basePrice - b.basePrice);
  if (sort === 'high') products = [...products].sort((a, b) => b.basePrice - a.basePrice);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.largeTitle}>Shop</Text>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push('/search')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Search products"
        >
          <AppIcon icon={Search01Icon} size={19} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {products.length} item{products.length === 1 ? '' : 's'}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSort(NEXT_SORT[sort])}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${SORT_LABEL[sort]}. Tap to change`}
        >
          <AppIcon icon={Sorting01Icon} size={14} color={sort === 'popular' ? C.text : C.red} strokeWidth={2.2} />
          <Text style={[styles.sortText, sort !== 'popular' && { color: C.red }]}>{SORT_LABEL[sort]}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={`grid-${columns}`}
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: GAP } : undefined}
        contentContainerStyle={[styles.grid, { width: contentWidth, alignSelf: 'center' }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DominosCard product={item} cardWidth={cardWidth} style={styles.gridCard} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Try another category.</Text>
            <TouchableOpacity onPress={() => setSelectedCategory('all')}>
              <Text style={styles.link}>Show everything</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={<View style={{ height: 110 }} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

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
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: 8,
    paddingBottom: 4,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    gap: 8,
    paddingHorizontal: GUTTER,
    paddingVertical: 10,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: C.text,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
  },
  count: {
    fontSize: 13,
    color: C.secondary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  grid: {
    paddingHorizontal: GUTTER,
    paddingTop: 4,
  },
  gridCard: {
    marginRight: 0,
    marginBottom: GAP,
    borderWidth: 0,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: C.red,
    marginTop: 8,
  },
});
