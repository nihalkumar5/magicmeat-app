import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { goBack } from '../utils/navigation';
import { PRODUCTS } from '../data/mockData';
import { MeatCategory, Product } from '../types';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { StatusBar } from 'expo-status-bar';
import {
  AppIcon,
  Search01Icon,
  Cancel01Icon,
  Clock01Icon,
  PlusSignIcon,
  MinusSignIcon,
  ArrowUpRight01Icon,
} from '../components/HugeIcon';

const TRENDING_KEYWORDS = [
  'Chicken Curry Cut',
  'Chicken Breast',
  'Mutton Curry Cut',
  'Biryani Cut',
  'Rohu Fish',
  'Peri-Peri Wings',
  'Eggs',
  'Boneless',
];

// Category tiles use a real product photo from that category.
const SEARCH_CATEGORIES: { id: MeatCategory; name: string; image: string }[] = (
  [
    { id: 'chicken', name: 'Chicken' },
    { id: 'mutton', name: 'Mutton' },
    { id: 'fish', name: 'Fish' },
    { id: 'eggs', name: 'Eggs' },
    { id: 'vegetables', name: 'Vegetables' },
    { id: 'fruits', name: 'Fruits' },
  ] as { id: MeatCategory; name: string }[]
).map((c) => ({ ...c, image: PRODUCTS.find((p) => p.category === c.id)?.image || '' }));

const RED_ICON = '#DC2626';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111111',
  secondary: '#6B7280',
  placeholder: '#8E8E93',
  hairline: 'rgba(60, 60, 67, 0.14)',
  red: '#DC2626',
  green: '#15803D',
  fill: 'rgba(118, 118, 128, 0.12)',
};

const SYNONYM_MAP: Record<string, string[]> = {
  chicken: ['murga', 'murgi', 'poultry', 'desi', 'tangdi', 'leg piece', 'wings', 'breast', 'chiken', 'chikn'],
  mutton: ['gosht', 'bakra', 'goat', 'lamb', 'boti', 'chaap', 'nalli', 'keema', 'matan', 'muton'],
  fish: ['machli', 'macchi', 'prawns', 'jhinga', 'seafood', 'shrimp', 'rohu', 'katla', 'surmai'],
  eggs: ['anda', 'ande', 'desi anda', 'brown eggs', 'egg', 'poultry eggs', 'tray'],
  'ready-to-cook': ['rtc', 'marinated', 'wings', 'peri peri', 'peri-peri', 'tikka', 'kebab', 'fry'],
  vegetables: ['aloo', 'pyaz', 'tamatar', 'onion', 'potato', 'tomato', 'adrak', 'lehsun', 'garlic', 'ginger', 'dhaniya', 'veggies', 'veg', 'sabzi', 'vegetable'],
  fruits: ['kela', 'banana', 'seb', 'apple', 'orange', 'santra', 'amrood', 'guava', 'angur', 'grapes', 'fruit', 'phal'],
  biryani: ['dum', 'biriyani', 'biryani cut', 'pulao', 'dum biryani'],
  keema: ['mince', 'kheema', 'qeema', 'ground meat', 'fine keema'],
  curry: ['gravy', 'salan', 'curry cut', 'bone-in', 'korma', 'curry cut medium'],
  boneless: ['cubes', 'breast', 'fillet', 'tikka', 'lean', 'no bone', 'boneless breast'],
};

const CATEGORY_KEYS = new Set(['chicken', 'mutton', 'fish', 'eggs', 'ready-to-cook', 'vegetables', 'fruits']);

// Hindi names that point at one specific product.
const WORD_ALIASES: Record<string, string> = {
  pyaz: 'onion',
  pyaaz: 'onion',
  tamatar: 'tomato',
  adrak: 'ginger',
  lehsun: 'garlic',
  lahsun: 'garlic',
  kela: 'banana',
  seb: 'apple',
  santra: 'orange',
  amrood: 'guava',
  angur: 'grapes',
  potato: 'aloo',
  coriander: 'dhaniya',
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'under300' | 'highprotein'>('all');

  const { cart, addToCart, updateQuantity, setCustomizerProduct, setSelectedCategory } = useStore();
  const inputRef = useRef<any>(null);
  const [focused, setFocused] = useState(false);


  // Auto focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectKeyword = (kw: string) => {
    setSearchQuery(kw);
    // Add to recent searches
    setRecentSearches((prev) => [kw, ...prev.filter((item) => item !== kw)].slice(0, 6));
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  // Search matching algorithm
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    // Split words
    const queryWords = q
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => WORD_ALIASES[word] || word);

    // Word-start match, so "anda" doesn't hit "standard".
    const has = (text: string, word: string) =>
      new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text);

    const matchesWord = (product: Product, text: string, word: string) => {
      if (has(text, word)) return true;
      // A category word ("mutton", "gosht", "machli") matches only that
      // category, so chicken keema doesn't show up for "mutton". Other
      // keywords ("biryani", "keema") match the product text.
      for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
        if (word !== key && !synonyms.includes(word)) continue;
        if (CATEGORY_KEYS.has(key)) {
          if (product.category === key) return true;
        } else if (has(text, key) || synonyms.some((syn) => has(text, syn))) {
          return true;
        }
      }
      return false;
    };

    const matches = PRODUCTS.filter((product) => {
      if (activeFilter === 'under300' && product.basePrice > 300) return false;
      if (activeFilter === 'highprotein' && (product.macros?.proteinGrams || 0) < 20) return false;
      const text = [
        product.name,
        product.hindiTitle || '',
        product.description,
        product.category,
        ...product.availableCuts.map((c) => `${c.name} ${c.description} ${c.bestFor}`),
      ]
        .join(' ')
        .toLowerCase();
      return queryWords.every((word) => matchesWord(product, text, word));
    });

    // If some products have every word in their name, show only those
    // ("rohu" shows Rohu, not every fish); otherwise show the broader matches.
    const byName = matches.filter((product) =>
      queryWords.every((word) => has(product.name.toLowerCase(), word))
    );
    return byName.length > 0 ? byName : matches;
  }, [searchQuery, activeFilter]);

  const handleAddProduct = (product: Product) => {
    if (product.availableCuts.length > 1) {
      setCustomizerProduct(product);
    } else {
      addToCart(product, product.availableCuts[0], true, 1);
    }
  };

  const getProductCartItem = (productId: string) => {
    return cart.find((item) => item.product.id === productId);
  };

  const openCategory = (category: MeatCategory) => {
    setSelectedCategory(category);
    router.push('/(tabs)/explore');
  };

  const query = searchQuery.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Search bar */}
      <View style={styles.header}>
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <AppIcon icon={Search01Icon} size={19} color={RED_ICON} strokeWidth={2.2} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Chicken, mutton, fish…"
            placeholderTextColor={C.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={() => query && handleSelectKeyword(query)}
            accessibilityLabel="Search products"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
            >
              <View style={styles.clearCircle}>
                <AppIcon icon={Cancel01Icon} size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, cart.length > 0 && { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        removeClippedSubviews={Platform.OS === 'android'}
      >
        {query.length === 0 ? (
          <>
            {/* Recent */}
            {recentSearches.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  <TouchableOpacity onPress={handleClearRecent} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.link}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.card}>
                  {recentSearches.map((item, idx) => (
                    <View key={`recent-${item}`}>
                      {idx > 0 && <View style={[styles.divider, { marginLeft: 44 }]} />}
                      <TouchableOpacity style={styles.listRow} onPress={() => handleSelectKeyword(item)} activeOpacity={0.6}>
                        <AppIcon icon={Clock01Icon} size={17} color={C.placeholder} strokeWidth={2} />
                        <Text style={styles.listText}>{item}</Text>
                        <AppIcon icon={ArrowUpRight01Icon} size={16} color={C.placeholder} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Popular */}
            <Text style={[styles.sectionTitle, styles.sectionGap]}>Popular searches</Text>
            <View style={styles.chips}>
              {TRENDING_KEYWORDS.map((item) => (
                <TouchableOpacity
                  key={`trend-${item}`}
                  style={styles.chip}
                  onPress={() => handleSelectKeyword(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Categories */}
            <Text style={[styles.sectionTitle, styles.sectionGap]}>Shop by category</Text>
            <View style={styles.categoryGrid}>
              {SEARCH_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => openCategory(cat.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                >
                  <View style={styles.categoryTile}>
                    {!!cat.image && (
                      <Image source={{ uri: optimizeImageUrl(cat.image, 240) }} style={styles.categoryImg} resizeMode="cover" />
                    )}
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Count + filters */}
            <Text style={styles.countText}>
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`
                : `No results for “${query}”`}
            </Text>
            {(searchResults.length > 0 || activeFilter !== 'all') && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'under300', label: 'Under ₹300' },
                    { key: 'highprotein', label: 'High protein' },
                  ] as const
                ).map((f) => {
                  const active = activeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filter, active && styles.filterActive]}
                      onPress={() => setActiveFilter(active && f.key !== 'all' ? 'all' : f.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {searchResults.length > 0 ? (
              <View style={styles.card}>
                {searchResults.map((product, idx) => {
                  const cartItem = getProductCartItem(product.id);
                  const qtyInCart = cartItem ? cartItem.quantity : 0;
                  const off = product.originalPrice
                    ? Math.round(((product.originalPrice - product.basePrice) / product.originalPrice) * 100)
                    : 0;
                  return (
                    <View key={product.id}>
                      {idx > 0 && <View style={[styles.divider, { marginLeft: 98 }]} />}
                      <TouchableOpacity
                        style={styles.resultRow}
                        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${product.name}, ₹${product.basePrice}`}
                      >
                        <Image
                          source={{ uri: optimizeImageUrl(product.image, 200) }}
                          style={styles.thumb}
                          resizeMode="cover"
                          fadeDuration={0}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.resultName} numberOfLines={2}>
                            {product.name}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {product.netWeight}
                            {product.pieces ? ` · ${product.pieces}` : ''}
                          </Text>
                          <View style={styles.priceRow}>
                            <Text style={styles.price}>₹{product.basePrice}</Text>
                            {!!product.originalPrice && product.originalPrice > product.basePrice && (
                              <Text style={styles.mrp}>₹{product.originalPrice}</Text>
                            )}
                            {off > 0 && <Text style={styles.off}>{off}% off</Text>}
                          </View>
                        </View>

                        {qtyInCart === 0 ? (
                          <TouchableOpacity
                            style={styles.addBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddProduct(product);
                            }}
                            activeOpacity={0.8}
                            accessibilityLabel={`Add ${product.name}`}
                          >
                            <Text style={styles.addText}>Add</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                if (cartItem) updateQuantity(cartItem.cartItemId, -1);
                              }}
                              accessibilityLabel={`One less ${product.name}`}
                            >
                              <AppIcon icon={MinusSignIcon} size={14} color="#FFFFFF" strokeWidth={2.6} />
                            </TouchableOpacity>
                            <Text style={styles.stepQty}>{qtyInCart}</Text>
                            <TouchableOpacity
                              style={styles.stepBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                if (cartItem) updateQuantity(cartItem.cartItemId, 1);
                              }}
                              accessibilityLabel={`One more ${product.name}`}
                            >
                              <AppIcon icon={PlusSignIcon} size={14} color="#FFFFFF" strokeWidth={2.6} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.empty}>
                <Image
                  source={require('../../assets/illustrations/search_not_found.png')}
                  style={styles.emptyArt}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySub}>
                  {activeFilter !== 'all'
                    ? 'Try removing the filter, or search for something else.'
                    : 'Check the spelling or try one of these:'}
                </Text>
                <View style={[styles.chips, { justifyContent: 'center' }]}>
                  {['Chicken Curry Cut', 'Mutton Curry Cut', 'Chicken Breast', 'Eggs', 'Rohu Fish'].map((item) => (
                    <TouchableOpacity key={`sugg-${item}`} style={styles.chip} onPress={() => handleSelectKeyword(item)}>
                      <Text style={styles.chipText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

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
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8ED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  fieldFocused: {
    borderColor: '#111111',
    borderWidth: 1.5,
  },
  input: {
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
  cancel: {
    fontSize: 16,
    color: C.red,
    fontWeight: '500',
  },
  link: {
    fontSize: 15,
    color: C.red,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 32,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  sectionGap: {
    marginTop: 24,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: C.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: C.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryItem: {
    width: '33.333%',
    paddingHorizontal: 6,
    marginBottom: 14,
    alignItems: 'center',
  },
  categoryTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },

  /* results */
  countText: {
    fontSize: 13,
    color: C.secondary,
    marginLeft: 4,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 10,
  },
  filter: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: C.card,
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: C.text,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  thumb: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  resultMeta: {
    fontSize: 13,
    color: C.secondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 5,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  mrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  off: {
    fontSize: 12,
    fontWeight: '700',
    color: C.green,
  },
  addBtn: {
    height: 34,
    minWidth: 68,
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.red,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    backgroundColor: C.red,
  },
  stepBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 24,
  },
  emptyArt: {
    width: 180,
    height: 150,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: C.secondary,
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
});
