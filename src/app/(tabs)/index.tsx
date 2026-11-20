import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FONT } from '../../constants/fonts';
import { GUTTER, RADIUS, SPACE, TYPE } from '../../constants/layout';
import { PICKUP_ENABLED } from '../../constants/features';
import { notify } from '../../utils/dialogs';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Pressable,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DominosCard } from '../../components/DominosCard';
import { FloatingCartBar } from '../../components/FloatingCartBar';
import { useTabBarInset } from '../../components/FloatingTabBar';
import { ShopCard } from '../../components/ShopCard';
import { customerStage } from '../../utils/orderStage';
import { FREE_DELIVERY_ABOVE } from '../../data/pricing';
import { PRODUCTS } from '../../data/mockData';
import { useStore } from '../../store/useStore';
import { MeatCategory, Product } from '../../types';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { optimizeImageUrl } from '../../utils/imageOptimizer';
import { FadeInUp, PressableScale } from '../../components/motion';
import { OffersStrip } from '../../components/OffersStrip';
import { CutsShowcase } from '../../components/CutsShowcase';
import { CATEGORY_IMAGES, CATEGORY_IMG_3D, categoryTint } from '../../data/categoryImages';
import {
  AppIcon,
  Location01Icon,
  ChevronDownIcon,
  UserIcon,
  ShoppingCart01Icon,
  Search01Icon,
  SnowflakeIcon,
  CrownIcon,
  CheckmarkBadge01Icon,
  FireIcon,
  ChefHatIcon,
  ShieldCheckIcon,
  BeefIcon,
  DeliveryTruck01Icon,
  ShoppingBag01Icon,
  Restaurant01Icon,
  WeightScaleIcon,
  FlashIcon,
  ArrowRight01Icon,
  Knife01Icon,
  RefreshIcon,
  Tick02Icon,
  Scooter01Icon,
  Home01Icon,
  GridViewIcon,
} from '../../components/HugeIcon';

// Final 6 Essential Craving Categories (3-Column Circular Grid)
const CRAVING_CATEGORIES = [
  {
    id: 'chicken' as MeatCategory,
    name: 'Chicken',
    badge: 'NEW',
    image:
      'https://images.openai.com/static-rsc-4/DiAfMt2-_cudu3XhayYwgkM80HyCWfEKoYkN_vPekcx_Ym2NuGHrP53p44pkiJch-12eKOy8Yk7vq2apt0hZOB2LLW23VXMGdPtTOn0ySvqZ2C1VIM2We9xAcYJHMMupGbTaqSK1r2iWm67D7Zui3JI6OlnzfpGy2kn7SyE8ZMc?purpose=inline',
  },
  {
    id: 'mutton' as MeatCategory,
    name: 'Mutton',
    image:
      'https://images.openai.com/static-rsc-4/TACdPw9Q6Gm8AjGk-ANfnGAHbaMqyua2lMcZxHBK2Ss2YMiqvVo288wHckubG6AP3YUAOWmLy_KbI-wXlzQB4GoVQr8g7McF3sAstqeZH7oPUiLfm9yNVzVjCg1w8_oXPTJs00woICYIguupUgGmiL-HHqXmrbzWCqPjT8gQW70?purpose=inline',
  },
  {
    id: 'fish' as MeatCategory,
    name: 'Seafood',
    image:
      'https://images.openai.com/static-rsc-4/gkcbQBXEuEr3hyM8m7rGARiglW2LXz9KI1BZ4reSXTwJdbJhdb1Bzu-q21hOmUMbhJbNJ5PXa-GDbWmavaUTGRJzNjpaJfA8i87Y_FTGFX6w1RPZoNv_jFm-rYuxoynT2rmGNxyFojyxqgblE36UNHX8KNiTnaF_2AoNDmyJ2UM?purpose=inline',
  },
  {
    id: 'eggs' as MeatCategory,
    name: 'Eggs',
    image:
      'https://images.openai.com/static-rsc-4/rYgTuoQGG91BWdtto4NxfrBcTwlN9KKy6OhR0L4HnRaQzRyMxmI1b917lEjLtwgWhnIsMEwG0hinRYTVChvdbiOI_IF35SUqKvNmaPtwipT6gxCJw6NxqE-jj880MSoVXrFWe85zbXfRSMcBesuVE5BWcOlyziziOVRfKz8OeUM?purpose=inline',
  },
  {
    id: 'curry-cuts' as MeatCategory,
    name: 'Curry Cuts',
    image:
      'https://images.openai.com/static-rsc-4/j8EyQ2DuPjETzuzTPshiUCKX2DXozL6DzEJQ8PYuI81albvjoRqUdd8Q3TnYNEBRLqen6AntVn6zg7dYjnKrt9SiTSjNVkYGvCMgBzdBnD1gRQcA0aVySqLqboep_bA06fjbp1R4vvs_gUywRJpHu5FoPEPfw8WriqQSNFxU46U?purpose=inline',
  },
  {
    id: 'all' as MeatCategory,
    name: 'Combos',
    badge: 'NEW',
    image:
      'https://images.openai.com/static-rsc-4/W7JbAS73BeSV16U__OGAobH4wAJ_t--Ml_fNlvAcEhk4g4Z5aylob5QUC7yK885FDJZGX6QHUfz1YftE1TxOOvkFHcga9OPXavSFZX9vy1_qHNgnDi4pXZSMo2YyleO8DimMtBUx7KCQrm3Uiih9vUvVg4J_o5SNqmmSFkIaBfw?purpose=inline',
  },
];

const SEARCH_KEYWORDS = ['Chicken Curry Cut', 'Mutton Curry Cut', 'Chicken Breast', 'Rohu Fish', 'Biryani Cut', 'Eggs'];

const HERO_SLIDES = [
  {
    id: 'slide-chicken-table',
    image: require('../../../assets/hero/hero_chicken_table.png'),
    targetCategory: 'chicken' as MeatCategory,
    productId: 'c1',
  },
  {
    id: 'slide-chicken-breast',
    image: require('../../../assets/hero/hero_chicken_breast.png'),
    targetCategory: 'chicken' as MeatCategory,
    productId: 'c2',
  },
  {
    id: 'slide-fresh-eggs',
    image: require('../../../assets/hero/hero_fresh_eggs.png'),
    targetCategory: 'eggs' as MeatCategory,
    productId: 'e1',
  },
  {
    id: 'slide-meals-packaging',
    image: require('../../../assets/hero/hero_meals_packaging.png'),
    targetCategory: 'all' as MeatCategory,
    productId: 'c1',
  },
];

type OrderType = 'delivery' | 'takeaway' | 'dinein';

const AnimatedSearchCapsule = React.memo(function AnimatedSearchCapsule() {
  const [keywordIndex, setKeywordIndex] = useState(0);
  const [searchFadeAnim] = useState(() => new Animated.Value(1));
  const [searchSlideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(searchFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(searchSlideAnim, {
          toValue: -6,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setKeywordIndex((prev) => (prev + 1) % SEARCH_KEYWORDS.length);
        searchSlideAnim.setValue(6);
        Animated.parallel([
          Animated.timing(searchFadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(searchSlideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3200);

    return () => clearInterval(timer);
  }, [searchFadeAnim, searchSlideAnim]);

  return (
    <PressableScale
      style={styles.searchCapsule}
      scaleTo={0.98}
      onPress={() => router.push('/search')}
      accessibilityRole="search"
      accessibilityLabel="Search chicken, mutton, fish and more"
    >
      <AppIcon icon={Search01Icon} size={20} color="#DC2626" strokeWidth={2.2} />
      <View style={styles.searchPlaceholderRow}>
        <Text style={styles.searchStaticPrefix}>Search </Text>
        <Animated.View
          style={{
            opacity: searchFadeAnim,
            transform: [{ translateY: searchSlideAnim }],
            flexShrink: 1,
          }}
        >
          <Text style={styles.searchDynamicWord} numberOfLines={1}>
            “{SEARCH_KEYWORDS[keywordIndex].toLowerCase()}”
          </Text>
        </Animated.View>
      </View>
    </PressableScale>
  );
});
AnimatedSearchCapsule.displayName = 'AnimatedSearchCapsule';

interface HeroProps {
  width: number;
  onSelectSlide: (targetCategory: MeatCategory, productId: string) => void;
}

const HERO_GUTTER = GUTTER;

// Header colour, from the logo's crimson (#B41024) opened up a touch for a
// large surface: #BE1E2D keeps white text at 6.2:1 (WCAG AA at any size).
// The accent is a warm gold, the analogous partner of red, which reads as
// "fast and fresh" and pulls the eye to the delivery time.
const HEADER_BG = '#BE1E2D';
const HEADER_ACCENT = '#FFC94A';

// Rounded, inset hero card with small page dots, like the App Store's
// featured cards. Swipe or wait; tapping a slide opens its product.
const HeroBannerCarousel = React.memo<HeroProps>(function HeroBannerCarousel({ width, onSelectSlide }) {
  const heroScrollRef = useRef<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const cardWidth = width - HERO_GUTTER * 2;
  const cardHeight = Math.round(cardWidth * 0.82);
  const step = cardWidth + 10;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        heroScrollRef.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [step]);

  const handleHeroScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / step);
    if (slideIndex !== currentSlide && slideIndex >= 0 && slideIndex < HERO_SLIDES.length) {
      setCurrentSlide(slideIndex);
    }
  };

  return (
    <View style={styles.mHeroWrap}>
      <ScrollView
        ref={heroScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={handleHeroScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: HERO_GUTTER, gap: 10 }}
        style={{ maxWidth: '100%' }}
      >
        {HERO_SLIDES.map((slide, idx) => (
          <TouchableOpacity
            key={slide.id}
            style={[styles.mHeroCard, { width: cardWidth, height: cardHeight }]}
            activeOpacity={0.92}
            onPress={() => onSelectSlide(slide.targetCategory, slide.productId)}
            accessibilityRole="button"
            accessibilityLabel={`Offer ${idx + 1} of ${HERO_SLIDES.length}`}
          >
            <Image source={slide.image} style={styles.heroSlideImage} resizeMode="cover" fadeDuration={0} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.mDots}>
        {HERO_SLIDES.map((slide, idx) => (
          <View key={`dot-${slide.id}`} style={[styles.mDot, idx === currentSlide && styles.mDotActive]} />
        ))}
      </View>
    </View>
  );
});
HeroBannerCarousel.displayName = 'HeroBannerCarousel';

export default function HomeScreen() {
  const tabInset = useTabBarInset();
  const setSelectedCategory = useStore((state) => state.setSelectedCategory);
  const currentLocation = useStore((state) => state.currentLocation);
  const setLocationModalOpen = useStore((state) => state.setLocationModalOpen);
  const orderFulfillment = useStore((state) => state.orderFulfillment);
  const profilePhoto = useStore((state) => state.profilePhoto);
  const profileName = useStore((state) => state.profile.name);
  const initials = profileName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const activeOrder = useStore((state) => state.activeOrder);
  const orders = useStore((state) => state.orders);
  const cartCount = useStore((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
  const cartTotal = useStore((state) => state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));

  const [activeOrderType, setActiveOrderType] = useState<OrderType>('delivery');
  const [promiseOpen, setPromiseOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const popularDelights = useMemo(() => PRODUCTS.slice(0, 5), []);
  const top10Products = useMemo(() => PRODUCTS.slice(0, 10), []);
  const seafoodProducts = useMemo(() => PRODUCTS.filter((p) => p.category === 'fish'), []);
  const muttonProducts = useMemo(() => PRODUCTS.filter((p) => p.category === 'mutton'), []);
  const nearYouProducts = useMemo(
    () =>
      [
        PRODUCTS.find((p) => p.id === 'c7'),
        PRODUCTS.find((p) => p.id === 'c2'),
        PRODUCTS.find((p) => p.id === 'f1'),
        PRODUCTS.find((p) => p.id === 'rtc1'),
        PRODUCTS.find((p) => p.id === 'm2'),
        PRODUCTS.find((p) => p.id === 'c3'),
        PRODUCTS.find((p) => p.id === 'e1'),
        PRODUCTS.find((p) => p.id === 'f2'),
        PRODUCTS.find((p) => p.id === 'c1'),
        PRODUCTS.find((p) => p.id === 'm1'),
      ].filter((p): p is Product => Boolean(p)),
    [],
  );

  const handleOpenLocationModal = () => {
    if (isDesktop) {
      setLocationModalOpen(true);
    } else {
      router.push('/location-select');
    }
  };

  const openCategory = (category: MeatCategory) => {
    setSelectedCategory(category);
    router.push('/(tabs)/explore');
  };

  const handleSlideSelect = (targetCategory: MeatCategory, productId: string) => {
    setSelectedCategory(targetCategory);
    router.push({
      pathname: '/product/[id]',
      params: { id: productId },
    });
  };

  /* ================================================================= */
  /* DESKTOP VIEW (100% FULL WIDTH - EXACT DOMINO'S DESKTOP WEBSITE)   */
  /* ================================================================= */
  if (isDesktop) {
    return (
      <SafeAreaView style={styles.desktopSafeArea}>
        {/* 1. TOP LUXURY HEADER (FLAGSHIP ARTISAN BUTCHERY) */}
        <View style={styles.desktopTopHeader}>
          {/* Left: Brandmark + Location */}
          <View style={styles.desktopTopLeftGroup}>
            <TouchableOpacity
              style={styles.desktopBrandCol}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.85}
            >
              <View style={styles.brandLogoRow}>
                <View style={styles.brandEmblemBox}>
                  <AppIcon icon={BeefIcon} size={22} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.brandNameBold}>MAGIC</Text>
                    <Text style={styles.brandNameRed}>MEAT</Text>
                  </View>
                  <Text style={styles.brandTagline}>THE ARTISAN BUTCHERY</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.desktopHeaderDivider} />

            {/* Location Selector */}
            <TouchableOpacity style={styles.desktopLocationBlock} onPress={handleOpenLocationModal} activeOpacity={0.8}>
              <View style={styles.desktopLocationRow}>
                <AppIcon icon={Location01Icon} size={14} color="#E52320" strokeWidth={2.5} />
                <Text style={styles.desktopTakeawayText}>
                  {activeOrderType === 'delivery'
                    ? 'Delivery to'
                    : activeOrderType === 'takeaway'
                      ? 'Takeaway from'
                      : 'Visit our store at'}
                </Text>
                <AppIcon icon={ChevronDownIcon} size={13} color="#E52320" strokeWidth={2.5} />
              </View>
              <Text style={styles.desktopAddressText} numberOfLines={1}>
                {currentLocation.shortAddress.toUpperCase()} · {currentLocation.city.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center: Omni-Search Bar */}
          <TouchableOpacity
            style={styles.desktopSearchBar}
            onPress={() => router.push('/search')}
            activeOpacity={0.9}
            accessibilityRole="button"
          >
            <AppIcon icon={Search01Icon} size={16} color="#DC2626" strokeWidth={2} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
              <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '500' }}>Search for </Text>
              <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '700' }}>Fresh Chicken, Mutton, Fish...</Text>
            </View>
            <View style={styles.desktopSearchKbd}>
              <Text style={styles.desktopSearchKbdText}>⌘K</Text>
            </View>
          </TouchableOpacity>

          {/* Right: Trust Badges, Profile & Basket */}
          <View style={styles.desktopTopRightGroup}>
            <View style={styles.desktopTrustPill}>
              <View style={styles.desktopTrustDot} />
              <Text style={styles.desktopTrustText}>Chilled 0-4°C</Text>
            </View>

            <TouchableOpacity
              style={styles.desktopProfileBtn}
              onPress={() => router.push('/profile-menu')}
              activeOpacity={0.8}
            >
              <AppIcon icon={UserIcon} size={16} color="#0F172A" />
              <Text style={styles.desktopProfileText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.desktopHeaderCartBtn}
              onPress={() => router.push('/(tabs)/cart')}
              activeOpacity={0.85}
            >
              <AppIcon icon={ShoppingCart01Icon} size={16} color="#FFFFFF" />
              <Text style={styles.desktopHeaderCartText}>
                {cartCount > 0 ? `${cartCount} Items • ₹${cartTotal}` : 'Basket'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. FULL-WIDTH OBSIDIAN COLD-CHAIN RIBBON */}
        <View style={styles.desktopBlueStrip}>
          <View style={styles.desktopBlueLeft}>
            <View style={styles.desktopPinCircle}>
              <AppIcon icon={SnowflakeIcon} size={15} color="#38BDF8" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.desktopBlueTitle}>{currentLocation.shortAddress} Hub</Text>
                <View style={styles.desktopHubBadge}>
                  <Text style={styles.desktopHubBadgeText}>COLD-CHAIN ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.desktopBlueSub}>Express in 15–20 mins · {currentLocation.distanceKm} km away</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.desktopDetectBtn} onPress={handleOpenLocationModal} activeOpacity={0.8}>
            <AppIcon icon={Location01Icon} size={13} color="#FFFFFF" />
            <Text style={styles.desktopDetectBtnText}>Change location</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.desktopScrollView}
          contentContainerStyle={styles.desktopScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 3. SEGMENTED 3-WAY ORDER CONTROL (MODERN LUXURY PILL SLIDER) */}
          <View style={styles.desktopSegmentedWrapper}>
            <View style={styles.desktopSegmentedPillContainer}>
              {/* Delivery */}
              <TouchableOpacity
                style={[styles.desktopSegmentPill, activeOrderType === 'delivery' && styles.desktopSegmentPillActive]}
                onPress={() => setActiveOrderType('delivery')}
                activeOpacity={0.85}
              >
                <AppIcon
                  icon={DeliveryTruck01Icon}
                  size={18}
                  color={activeOrderType === 'delivery' ? '#DC2626' : '#64748B'}
                  strokeWidth={2}
                />
                <View>
                  <Text
                    style={[
                      styles.desktopSegmentPillTitle,
                      activeOrderType === 'delivery' && styles.desktopSegmentPillTitleActive,
                    ]}
                  >
                    Delivery
                  </Text>
                  <Text style={styles.desktopSegmentPillSub}>Express in 15–20 mins</Text>
                </View>
              </TouchableOpacity>

              {/* Takeaway */}
              <TouchableOpacity
                style={[styles.desktopSegmentPill, activeOrderType === 'takeaway' && styles.desktopSegmentPillActive]}
                onPress={() =>
                  PICKUP_ENABLED
                    ? setActiveOrderType('takeaway')
                    : notify('Pickup is coming soon', 'Our stores are being renovated. We deliver in 15–20 minutes meanwhile.')
                }
                activeOpacity={0.85}
              >
                <AppIcon
                  icon={ShoppingBag01Icon}
                  size={18}
                  color={activeOrderType === 'takeaway' ? '#DC2626' : '#64748B'}
                  strokeWidth={2}
                />
                <View>
                  <Text
                    style={[
                      styles.desktopSegmentPillTitle,
                      activeOrderType === 'takeaway' && styles.desktopSegmentPillTitleActive,
                    ]}
                  >
                    Takeaway
                  </Text>
                  <Text style={styles.desktopSegmentPillSub}>{PICKUP_ENABLED ? 'Pickup in 10 Mins' : 'Coming soon'}</Text>
                </View>
              </TouchableOpacity>

              {/* Dine-in */}
              <TouchableOpacity
                style={[styles.desktopSegmentPill, activeOrderType === 'dinein' && styles.desktopSegmentPillActive]}
                onPress={() => setActiveOrderType('dinein')}
                activeOpacity={0.85}
              >
                <AppIcon
                  icon={Restaurant01Icon}
                  size={18}
                  color={activeOrderType === 'dinein' ? '#DC2626' : '#64748B'}
                  strokeWidth={2}
                />
                <View>
                  <Text
                    style={[
                      styles.desktopSegmentPillTitle,
                      activeOrderType === 'dinein' && styles.desktopSegmentPillTitleActive,
                    ]}
                  >
                    Visit store
                  </Text>
                  <Text style={styles.desktopSegmentPillSub}>Buy at the counter</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. "WHAT ARE YOU CRAVING FOR?" (FULL WIDTH) */}
          <View style={styles.desktopSection}>
            <Text style={styles.desktopSectionHeading}>What are you craving for?</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.desktopCravingRow}
            >
              {CRAVING_CATEGORIES.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.name}-${idx}`}
                  style={styles.desktopCravingItem}
                  onPress={() => setSelectedCategory(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.desktopCravingCircleBox}>
                    <Image source={{ uri: item.image }} style={styles.desktopCravingCircleImg} />
                    {item.badge && (
                      <View style={styles.desktopYellowBadge}>
                        <Text style={styles.desktopYellowBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.desktopCravingLabel} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 5. TOP 10 BESTSELLERS (ROYAL GOLDEN SECTION - EXACT DOMINO'S MATCH) */}
          <View style={styles.top10RoyalContainer}>
            <View style={styles.top10HeaderBlock}>
              <View style={styles.top10CrownRow}>
                <View style={styles.top10AccentLine} />
                <AppIcon icon={CrownIcon} size={26} color="#D97706" />
                <View style={styles.top10AccentLine} />
              </View>
              <Text style={styles.top10Heading}>Bestsellers</Text>
              <View style={styles.top10LocationSub}>
                <AppIcon icon={Location01Icon} size={13} color="#B45309" strokeWidth={2.5} />
                <Text style={styles.top10CityText}>In {currentLocation.city || 'Raipur'}</Text>
              </View>
            </View>

            {/* Full-width Horizontal Scroll of 10 Cards with Golden Bookmark Ribbon */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.desktopShelfCards}
            >
              {PRODUCTS.slice(0, 10).map((product, idx) => (
                <DominosCard
                  key={`top10-${product.id}`}
                  product={product}
                  cardWidth={330}
                  isTop10={true}
                  rank={idx + 1}
                />
              ))}
            </ScrollView>
          </View>

          {/* 6. POPULAR BUTCHERY DELIGHTS (SHELF 1 - EXACT DOMINO'S CARDS) */}
          <View style={styles.desktopSection}>
            <View style={styles.shelfHeaderRow}>
              <View style={styles.shelfTitleGroup}>
                <AppIcon icon={CheckmarkBadge01Icon} size={24} color="#F59E0B" />
                <View>
                  <Text style={styles.shelfTitle}>Popular right now</Text>
                  <Text style={styles.shelfSub}>FREE Delivery For Orders Above ₹149</Text>
                </View>
              </View>
            </View>

            {/* Full-width Horizontal Cards Shelf (Width 330px per card) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.desktopShelfCards}
            >
              {popularDelights.map((product) => (
                <DominosCard key={product.id} product={product} cardWidth={330} />
              ))}
            </ScrollView>
          </View>

          {/* 6. GARLIC WINGS & GOURMET DIPS (SHELF 2) */}
          <View style={styles.desktopSection}>
            <View style={styles.shelfHeaderRow}>
              <View style={styles.shelfTitleGroup}>
                <AppIcon icon={FireIcon} size={24} color="#EF4444" />
                <View>
                  <Text style={styles.shelfTitle}>Garlic Wings &amp; Gourmet Dips</Text>
                  <Text style={styles.shelfSub}>Best Companions To Your Feast · Ready in 10 Mins</Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.desktopShelfCards}
            >
              {PRODUCTS.filter((p) => p.category === 'ready-to-cook' || p.badge?.includes('Cook'))
                .concat(PRODUCTS.slice(0, 3))
                .map((product) => (
                  <DominosCard key={product.id} product={product} cardWidth={330} />
                ))}
            </ScrollView>
          </View>

          {/* 7. PRIME MUTTON & BIRYANI FEAST (SHELF 3) */}
          <View style={styles.desktopSection}>
            <View style={styles.shelfHeaderRow}>
              <View style={styles.shelfTitleGroup}>
                <AppIcon icon={ChefHatIcon} size={24} color="#10B981" />
                <View>
                  <Text style={styles.shelfTitle}>Prime Mutton &amp; Biryani Feast</Text>
                  <Text style={styles.shelfSub}>Grass-Fed Tender Goat &amp; Slow-Dum Hand Cut Pieces</Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.desktopShelfCards}
            >
              {PRODUCTS.filter((p) => p.category === 'mutton' || p.category === 'fish')
                .concat(PRODUCTS.slice(0, 2))
                .map((product) => (
                  <DominosCard key={product.id} product={product} cardWidth={330} />
                ))}
            </ScrollView>
          </View>

          {/* 8. BUTCHER'S QUALITY PROMISE GRID (4 LUXURY PILLARS) */}
          <View style={styles.desktopPromiseSection}>
            <View style={styles.desktopPromiseHeader}>
              <View style={styles.promiseAccentLine} />
              <Text style={styles.desktopPromiseTitle}>The MagicMeat Cold-Chain Promise</Text>
              <View style={styles.promiseAccentLine} />
            </View>
            <Text style={styles.desktopPromiseSub}>
              Farm-to-fork hygiene, scientific temperature control, and precision butchery in every cut.
            </Text>

            <View style={styles.desktopPromiseGrid}>
              <View style={styles.desktopPromiseCard}>
                <View style={[styles.promiseIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <AppIcon icon={WeightScaleIcon} size={22} color="#DC2626" />
                </View>
                <Text style={styles.promiseCardTitle}>Pay only for clean meat</Text>
                <Text style={styles.promiseCardText}>
                  Weighed after cleaning and cutting, so the weight you see is the meat you cook.
                </Text>
              </View>

              <View style={styles.desktopPromiseCard}>
                <View style={[styles.promiseIconCircle, { backgroundColor: '#F0F9FF' }]}>
                  <AppIcon icon={SnowflakeIcon} size={22} color="#0284C7" />
                </View>
                <Text style={styles.promiseCardTitle}>Fresh, never frozen</Text>
                <Text style={styles.promiseCardText}>
                  Kept chilled from our cutting room to your door, so it stays tender and juicy.
                </Text>
              </View>

              <View style={styles.desktopPromiseCard}>
                <View style={[styles.promiseIconCircle, { backgroundColor: '#F0FDF4' }]}>
                  <AppIcon icon={ShieldCheckIcon} size={22} color="#16A34A" />
                </View>
                <Text style={styles.promiseCardTitle}>100% Jhatka</Text>
                <Text style={styles.promiseCardText}>
                  Prepared the traditional jhatka way, with a single swift cut.
                </Text>
              </View>

              <View style={styles.desktopPromiseCard}>
                <View style={[styles.promiseIconCircle, { backgroundColor: '#FFFBEB' }]}>
                  <AppIcon icon={FlashIcon} size={22} color="#D97706" />
                </View>
                <Text style={styles.promiseCardTitle}>At your door in 15–20 mins</Text>
                <Text style={styles.promiseCardText}>
                  Packed in an insulated pouch with gel packs and sent straight from our nearest store.
                </Text>
              </View>
            </View>
          </View>

          {/* 9. LUXURY DESKTOP FOOTER */}
          <View style={styles.desktopFooter}>
            <View style={styles.desktopFooterContent}>
              <View style={styles.desktopFooterColBrand}>
                <View style={styles.brandLogoRow}>
                  <View style={styles.brandEmblemBox}>
                    <AppIcon icon={BeefIcon} size={22} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.brandNameBold}>MAGIC</Text>
                      <Text style={styles.brandNameRed}>MEAT</Text>
                    </View>
                    <Text style={styles.brandTagline}>THE ARTISAN BUTCHERY</Text>
                  </View>
                </View>
                <Text style={styles.desktopFooterAbout}>
                  Fresh jhatka chicken and mutton, plus fish, cleaned and cut to order and delivered chilled in as
                  little as 15 minutes.
                </Text>
              </View>

              <View style={styles.desktopFooterColLinks}>
                <Text style={styles.footerColTitle}>Fresh Butchery</Text>
                <Text style={styles.footerLink}>Farm Chicken Curry Cut</Text>
                <Text style={styles.footerLink}>Prime Boneless Breast</Text>
                <Text style={styles.footerLink}>Mutton Curry Cut</Text>
                <Text style={styles.footerLink}>Rohu &amp; Katla Fish</Text>
              </View>

              <View style={styles.desktopFooterColLinks}>
                <Text style={styles.footerColTitle}>How we deliver</Text>
                <Text style={styles.footerLink}>Cut to order</Text>
                <Text style={styles.footerLink}>Express in 15–20 mins</Text>
                <Text style={styles.footerLink}>Normal in 45–60 mins</Text>
              </View>

              <View style={styles.desktopFooterColLinks}>
                <Text style={styles.footerColTitle}>Customer Care</Text>
                <Text style={styles.footerLink}>care@magicmeat.in</Text>
                <Text style={styles.footerLink}>Live Delivery Tracking</Text>
                <Text style={styles.footerLink}>Refunds &amp; replacements</Text>
              </View>
            </View>

            <View style={styles.desktopFooterBottomBar}>
              <Text style={styles.desktopFooterCopy}>
                © 2026 MagicMeat Technologies Pvt Ltd. All rights reserved. Chilled at 2°C with pride in India.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ================================================================= */
  /* MOBILE VIEW                                                        */
  /* ================================================================= */
  const isPickup = orderFulfillment === 'takeaway';
  // Products from the customer's past orders, newest first, for "Buy again".
  const buyAgain = (() => {
    const seen = new Set<string>();
    const list: Product[] = [];
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      for (const item of o.items) {
        const product = PRODUCTS.find((p) => p.id === item.product.id);
        if (product && !seen.has(product.id)) {
          seen.add(product.id);
          list.push(product);
        }
      }
    }
    return list.slice(0, 8);
  })();

  return (
    <SafeAreaView style={styles.mSafeArea} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.mScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={Platform.OS === 'android'}
        overScrollMode="never"
        scrollEventThrottle={32}
        stickyHeaderIndices={[1]}
      >
        {/* Location + profile */}
        <View style={styles.mTopBar}>
          {/* Paints above the header too, so pulling down never shows white */}
          <View pointerEvents="none" style={styles.mTopOverscroll} />
          {/* Depth: a warm glow from the top-right and a faint brand bird */}
          <View pointerEvents="none" style={styles.mHeaderGlow} />
          <Image
            pointerEvents="none"
            source={require('../../../assets/brand/bird.png')}
            style={styles.mHeaderBird}
            resizeMode="contain"
          />
          <View style={styles.mLocationBlock}>
            {/* One line: the time, with the mode as a small gold pill */}
            <View style={styles.mEtaRow}>
              <Text style={styles.mEta}>{isPickup ? '10 min' : '15–20 min'}</Text>
              <View style={styles.mModePill}>
                <AppIcon icon={isPickup ? ShoppingBag01Icon : FlashIcon} size={11} color={HEADER_ACCENT} strokeWidth={2.6} />
                <Text style={styles.mModeText}>{isPickup ? 'PICKUP' : 'EXPRESS'}</Text>
              </View>
            </View>
            {/* Address as a glass chip: clearly tappable, one line */}
            <PressableScale
              style={styles.mAddressChip}
              scaleTo={0.97}
              haptics="tap"
              onPress={handleOpenLocationModal}
              accessibilityRole="button"
              accessibilityLabel={`${isPickup ? 'Pickup from' : 'Deliver to'} ${currentLocation.shortAddress}. Change address`}
            >
              <AppIcon icon={Location01Icon} size={13} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.mAddressChipText} numberOfLines={1}>
                {currentLocation.shortAddress || 'Choose address'}
              </Text>
              <AppIcon icon={ChevronDownIcon} size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.6} />
            </PressableScale>
          </View>

          {/* Profile: photo in a thin ring, or initials (Contacts style), or a person glyph */}
          <PressableScale
            style={styles.mProfileRing}
            scaleTo={0.92}
            haptics="tap"
            onPress={() => router.push('/profile-menu')}
            accessibilityRole="button"
            accessibilityLabel={profileName ? `Profile, ${profileName}` : 'Profile'}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.mProfileImg} />
            ) : initials ? (
              <View style={styles.mProfileInitials}>
                <Text style={styles.mProfileInitialsText}>{initials}</Text>
              </View>
            ) : (
              <View style={styles.mProfileInitials}>
                <AppIcon icon={UserIcon} size={20} color="#B91C1C" strokeWidth={2} />
              </View>
            )}
          </PressableScale>
        </View>

        {/* Search (sticks to the top while scrolling) */}
        <View style={styles.mSearchWrap}>
          <AnimatedSearchCapsule />
        </View>

        {/* Live order (talabat-style status card) */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.liveCard}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/order-tracking/[id]', params: { id: activeOrder.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${LIVE_STATUS_TEXT[activeOrder.status] || 'Order in progress'}. Track order`}
          >
            <View style={styles.liveTop}>
              {!!activeOrder.items[0] && (
                <Image
                  source={{ uri: optimizeImageUrl(activeOrder.items[0].product.image, 100) }}
                  style={styles.liveThumb}
                />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.liveEyebrow}>Your order</Text>
                <Text style={styles.liveEta} numberOfLines={1}>
                  {activeOrder.deliveryMode === 'instant'
                    ? `Arriving in ${activeOrder.eta}`
                    : `Arriving ${activeOrder.eta}`}
                </Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.livePillDot} />
                <Text style={styles.livePillText}>Live</Text>
              </View>
            </View>

            <View style={styles.liveSteps}>
              {LIVE_STEPS.map((step, i) => {
                const current = customerStage(activeOrder.status);
                const done = i < current;
                const now = i === current;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && <View style={[styles.liveLine, i <= current && styles.liveLineDone]} />}
                    <View style={styles.liveStepCol}>
                      <View style={[styles.liveStep, done && styles.liveStepDone, now && styles.liveStepNow]}>
                        <AppIcon
                          icon={done ? Tick02Icon : step.icon}
                          size={15}
                          color={done ? '#FFFFFF' : now ? '#DC2626' : '#9CA3AF'}
                          strokeWidth={2.2}
                        />
                      </View>
                      <Text style={[styles.liveStepLabel, (done || now) && styles.liveStepLabelOn]}>{step.label}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>

            <View style={styles.liveBottom}>
              <Text style={styles.liveStatus} numberOfLines={1}>
                {LIVE_STATUS_TEXT[activeOrder.status] || 'Order in progress'}
              </Text>
              <View style={styles.liveTrack}>
                <Text style={styles.liveTrackText}>Track</Text>
                <AppIcon icon={ArrowRight01Icon} size={14} color="#DC2626" strokeWidth={2.4} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Offer */}
        {!isPickup && (
          <View style={styles.mOffer}>
            <AppIcon icon={DeliveryTruck01Icon} size={16} color="#166534" strokeWidth={2} />
            <Text style={styles.mOfferText}>
              <Text style={{ fontFamily: FONT.heavy }}>Free delivery</Text> on orders above ₹{FREE_DELIVERY_ABOVE}
            </Text>
          </View>
        )}

        {/* Coupons (thin ticket row; hidden when there are none) */}
        <OffersStrip background="#FFFFFF" />

        {/* Categories */}
        <View style={styles.mCategoryGrid}>
          {HOME_CATEGORIES.map((cat, i) => (
            <FadeInUp key={`cat-${cat.id}`} delay={80 + i * 45} style={styles.mCategoryItem}>
              <PressableScale
                containerStyle={{ width: '100%', alignItems: 'center' }}
                style={{ width: '100%', alignItems: 'center' }}
                scaleTo={0.93}
                haptics="select"
                onPress={() => openCategory(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
              >
                <View style={[styles.mCategoryTile, { backgroundColor: categoryTint(cat.id) }]}>
                  {cat.source ? (
                    <Image source={cat.source} style={styles.mCategoryImg} resizeMode="contain" fadeDuration={0} />
                  ) : (
                    <View style={styles.mCategoryAllIcon}>
                      <AppIcon icon={GridViewIcon} size={24} color="#DC2626" strokeWidth={1.9} />
                    </View>
                  )}
                </View>
                <Text style={styles.mCategoryLabel} numberOfLines={2}>
                  {cat.label}
                </Text>
              </PressableScale>
            </FadeInUp>
          ))}
        </View>

        {/* Hero */}
        <HeroBannerCarousel width={width} onSelectSlide={handleSlideSelect} />

        {/* Why MagicMeat */}
        <View style={styles.mTrustRow}>
          {TRUST_POINTS.map((point) => (
            <View key={point.title} style={styles.mTrustItem}>
              <View style={styles.mTrustIcon}>
                <AppIcon icon={point.icon} size={18} color="#DC2626" strokeWidth={2} />
              </View>
              <Text style={styles.mTrustTitle}>{point.title}</Text>
              <Text style={styles.mTrustSub}>{point.sub}</Text>
            </View>
          ))}
        </View>

        {/* Buy again */}
        {buyAgain.length > 0 && (
          <>
            <SectionHeader
              title="Buy again"
              subtitle="From your past orders"
              onSeeAll={() => router.push('/(tabs)/orders')}
            />
            <ProductShelf data={buyAgain} keyPrefix="again" />
          </>
        )}

        {/* Bestsellers */}
        <SectionHeader
          title="Bestsellers"
          subtitle="What our customers order most"
          onSeeAll={() => openCategory('all')}
        />
        <ProductShelf data={top10Products} keyPrefix="best" />

        {/* Jhatka promise (Target-style editorial card; opens a DoorDash-style sheet) */}
        <TouchableOpacity
          style={styles.promiseCard}
          activeOpacity={0.92}
          onPress={() => setPromiseOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Our jhatka promise. Learn more"
        >
          <View style={styles.promiseBadge}>
            <Text style={styles.promiseBadgeText}>100% Jhatka</Text>
          </View>
          <Text style={styles.promiseTitle}>Jhatka, the way{'\n'}you trust.</Text>
          <Text style={styles.promiseSub}>
            One swift cut, cleaned and cut to order, and packed fresh for your kitchen.
          </Text>
          <View style={styles.promiseLink}>
            <Text style={styles.promiseLinkText}>Our promise</Text>
            <AppIcon icon={ArrowRight01Icon} size={14} color="#B91C1C" strokeWidth={2.4} />
          </View>
          <Image
            source={{ uri: optimizeImageUrl(JHATKA_IMAGE, 700) }}
            style={styles.promiseImage}
            resizeMode="cover"
            fadeDuration={0}
          />
        </TouchableOpacity>

        {/* The butcher's cuts (editorial image carousel) */}
        <CutsShowcase />

        {/* Fish */}
        <SectionHeader
          title="Fresh fish"
          subtitle="Cleaned and cut into curry steaks"
          onSeeAll={() => openCategory('fish')}
        />
        <ProductShelf data={seafoodProducts} keyPrefix="fish" />

        {/* Mutton */}
        <SectionHeader
          title="Mutton"
          subtitle="Tender goat meat, cut to order"
          onSeeAll={() => openCategory('mutton')}
        />
        <ProductShelf data={muttonProducts} keyPrefix="mutton" />

        {/* Picks */}
        <SectionHeader title="Popular near you" subtitle={`What ${currentLocation.city || 'your area'} is ordering`} />
        <View style={styles.mPopularGrid}>
          {nearYouProducts.slice(0, 6).map((product) => (
            <ShopCard key={`near-you-${product.id}`} product={product} width={Math.floor((width - 32 - 12) / 2)} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.mBrowseAll}
          onPress={() => openCategory('all')}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.mBrowseAllText}>Browse all products</Text>
          <AppIcon icon={ArrowRight01Icon} size={16} color="#111111" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Brand sign-off */}
        <View style={styles.signoff}>
          <Text style={styles.signoffLine}>Fresh meat.</Text>
          <Text style={styles.signoffLine}>
            Better <Text style={styles.signoffAccent}>meals.</Text>
          </Text>
          <Text style={styles.signoffSub}>
            Fresh jhatka meat, cut to order and at your door in as little as 15 minutes.
          </Text>

          <View style={styles.signoffChips}>
            {[
              { icon: ShieldCheckIcon, text: '100% Jhatka' },
              { icon: ChefHatIcon, text: 'Cut to order' },
              { icon: CheckmarkBadge01Icon, text: 'Pay on delivery' },
            ].map((chip) => (
              <View key={chip.text} style={styles.signoffChip}>
                <AppIcon icon={chip.icon} size={13} color="#B91C1C" strokeWidth={2} />
                <Text style={styles.signoffChipText}>{chip.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.signoffBottom}>
            <Text style={styles.signoffBrand}>
              MAGIC<Text style={{ color: '#DC2626' }}>MEAT</Text>
            </Text>
            <View style={styles.jhatkaSeal}>
              <AppIcon icon={ShieldCheckIcon} size={14} color="#DC2626" strokeWidth={2.2} />
              <Text style={styles.jhatkaSealEnglish}>JHATKA</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 + tabInset }} />
      </ScrollView>

      <FloatingCartBar />

      <Modal visible={promiseOpen} transparent animationType="slide" onRequestClose={() => setPromiseOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPromiseOpen(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.sheetGrabber} />
          <Text style={styles.sheetTitle}>Our jhatka promise</Text>
          {PROMISES.map((item) => (
            <View key={item.title} style={styles.sheetRow}>
              <View style={styles.sheetIcon}>
                <AppIcon icon={item.icon} size={22} color="#B91C1C" strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetRowTitle}>{item.title}</Text>
                <Text style={styles.sheetRowText}>{item.text}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.sheetBtn}
            activeOpacity={0.85}
            onPress={() => {
              setPromiseOpen(false);
              openCategory('mutton');
            }}
          >
            <Text style={styles.sheetBtnText}>Shop jhatka mutton</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPromiseOpen(false)} style={{ alignSelf: 'center', padding: 10 }}>
            <Text style={styles.sheetClose}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const PROMISES = [
  { icon: Knife01Icon, title: 'Traditional jhatka', text: 'Prepared the jhatka way, with a single swift cut.' },
  { icon: ChefHatIcon, title: 'Cut to order', text: 'Cleaned and cut after you order, the way you chose.' },
  {
    icon: RefreshIcon,
    title: 'Fresh, or your money back',
    text: 'If anything isn’t right, tell us and we’ll replace it or refund you.',
  },
];

// Our own mutton curry cut photo for the jhatka story card.
const JHATKA_IMAGE = PRODUCTS.find((p) => p.id === 'm1')?.image || '';

// Category grid (Instacart / Blinkit style): the store's own cut-out
// photos (transparent, on a plate) sitting on a soft warm tile. See all
// shows a grid icon.
const HOME_CATEGORIES: {
  id: MeatCategory;
  label: string;
  source?: ImageSourcePropType;
}[] = [
  { id: 'chicken', label: 'Chicken', source: CATEGORY_IMAGES.chicken },
  { id: 'mutton', label: 'Mutton', source: CATEGORY_IMAGES.mutton },
  { id: 'fish', label: 'Fish', source: CATEGORY_IMAGES.fish },
  { id: 'curry-cuts', label: 'Curry cuts', source: CATEGORY_IMAGES['curry-cuts'] },
  { id: 'eggs', label: 'Eggs', source: CATEGORY_IMAGES.eggs },
  { id: 'vegetables', label: 'Vegetables', source: CATEGORY_IMAGES.vegetables },
  { id: 'fruits', label: 'Fruits', source: CATEGORY_IMAGES.fruits },
  { id: 'all', label: 'See all' },
];

const LIVE_STATUS_TEXT: Record<string, string> = {
  placed: 'Order placed, starting soon',
  butcher_prepping: 'Being cleaned and cut',
  cold_packed: 'Packed, waiting for the rider',
  rider_assigned: 'Rider is picking it up',
  out_for_delivery: 'Rider is on the way',
};

const LIVE_STEPS = [
  { key: 'preparing', label: 'Preparing', icon: Knife01Icon },
  { key: 'on_the_way', label: 'On the way', icon: Scooter01Icon },
  { key: 'delivered', label: 'Delivered', icon: Home01Icon },
];

const TRUST_POINTS = [
  { title: '15–20 mins', sub: 'Express delivery', icon: FlashIcon },
  { title: '100% Jhatka', sub: 'Traditional cut', icon: ShieldCheckIcon },
  { title: 'Pay later', sub: 'Cash or UPI', icon: CheckmarkBadge01Icon },
];

function SectionHeader({ title, subtitle, onSeeAll }: { title: string; subtitle?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.mSectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.mSectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.mSectionSub}>{subtitle}</Text>}
      </View>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
        >
          <Text style={styles.mSeeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ProductShelf({ data, keyPrefix }: { data: Product[]; keyPrefix: string }) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxWidth: '100%' }}
      contentContainerStyle={styles.mShelf}
      data={data}
      keyExtractor={(item) => `${keyPrefix}-${item.id}`}
      renderItem={({ item }) => <ShopCard product={item} width={146} />}
      getItemLayout={(_, index) => ({ length: 158, offset: 158 * index, index })}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={3}
      removeClippedSubviews={Platform.OS === 'android'}
      overScrollMode="never"
    />
  );
}

const styles = StyleSheet.create({
  /* ============================================================= */
  /* MOBILE (redesign)                                              */
  /* ============================================================= */
  // Status-bar strip shares the header colour.
  mSafeArea: {
    flex: 1,
    backgroundColor: HEADER_BG,
  },
  mScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.sm,
    gap: SPACE.md,
    backgroundColor: HEADER_BG,
  },
  mHeaderGlow: {
    position: 'absolute',
    top: -140,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,214,170,0.16)',
  },
  mHeaderBird: {
    position: 'absolute',
    right: -18,
    bottom: -26,
    width: 170,
    height: 112,
    opacity: 0.09,
    tintColor: '#FFFFFF',
  },
  mEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  mModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    paddingHorizontal: SPACE.sm,
    borderRadius: 11,
    backgroundColor: 'rgba(255,201,74,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,74,0.4)',
  },
  mModeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: HEADER_ACCENT,
  },
  mEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mBoltBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,201,74,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,74,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mAddressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: SPACE.xs,
    height: 28,
    paddingHorizontal: SPACE.md - 3,
    marginTop: SPACE.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  mAddressChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  mTopOverscroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -1000,
    height: 1000,
    backgroundColor: HEADER_BG,
  },
  mLocationBlock: {
    flex: 1,
    minWidth: 0,
  },
  mEyebrow: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.8)',
  },
  mEta: {
    fontSize: TYPE.display,
    lineHeight: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.2,
  },
  mAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  mAddressStrong: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginHorizontal: GUTTER,
    marginBottom: SPACE.lg,
    paddingVertical: SPACE.sm + 2,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#ECFDF3',
  },
  mOfferText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: '#166534',
  },
  mShelf: {
    paddingHorizontal: GUTTER,
    gap: SPACE.md,
  },
  mPopularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
  },
  mLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  mLocationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  mLocationSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
  },
  // 2 pt white gap inside a hairline brand ring, like an iOS avatar.
  mProfileRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: '#FFFFFF',
  },
  mProfileImg: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  mProfileInitials: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mProfileInitialsText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#B91C1C',
  },
  mProfileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header ends in soft rounded corners over the white page; it stays
  // with the search bar when it sticks to the top.
  mSearchWrap: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.md,
    marginBottom: SPACE.lg,
    backgroundColor: HEADER_BG,
    borderBottomLeftRadius: SPACE.lg,
    borderBottomRightRadius: SPACE.lg,
  },
  liveCard: {
    marginHorizontal: GUTTER,
    marginBottom: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F1F3',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  liveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F4F4F6',
  },
  liveEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  liveEta: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#ECFDF3',
  },
  livePillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  livePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  liveSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  liveStepCol: {
    alignItems: 'center',
    width: 64,
  },
  liveStepLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  liveStepLabelOn: {
    color: '#111111',
  },
  liveStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStepDone: {
    backgroundColor: '#DC2626',
  },
  liveStepNow: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  liveLine: {
    flex: 1,
    height: 3,
    marginTop: -18,
    marginHorizontal: -12,
    borderRadius: 2,
    backgroundColor: '#ECECEE',
  },
  liveLineDone: {
    backgroundColor: '#DC2626',
  },
  liveBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  liveStatus: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  liveTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  liveTrackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  mHeroWrap: {
    marginTop: 2,
  },
  mHeroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  mDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACE.md,
  },
  mDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  mDotActive: {
    width: 18,
    backgroundColor: '#111111',
  },
  mTrustRow: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginTop: SPACE.lg,
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACE.md,
  },
  mTrustItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  mTrustIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  mTrustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  mTrustSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  mSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: GUTTER,
    marginTop: SPACE.xl,
    marginBottom: SPACE.md,
    gap: SPACE.md,
  },
  mSectionTitle: {
    fontSize: TYPE.title,
    fontFamily: FONT.display,
    color: '#111111',
    letterSpacing: -0.5,
  },
  mSectionSub: {
    fontSize: TYPE.body,
    fontFamily: FONT.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  mSeeAll: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: '#DC2626',
  },
  mCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // tiles' own 5pt side padding brings their edges to the 21pt gutter
    paddingHorizontal: GUTTER - SPACE.xs,
    marginBottom: 0,
  },
  mCategoryItem: {
    width: '25%',
    paddingHorizontal: SPACE.xs,
    marginBottom: SPACE.md,
    alignItems: 'center',
  },
  // Squircle-ish tile in the category's tint; the plate fills it.
  mCategoryTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mCategoryImg: {
    width: '104%',
    height: '104%',
    ...CATEGORY_IMG_3D,
  },
  mCategoryAllIcon: {
    width: '58%',
    height: '58%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mCategoryLabel: {
    marginTop: SPACE.sm,
    fontSize: TYPE.body,
    lineHeight: 16,
    fontFamily: FONT.bold,
    letterSpacing: -0.1,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  mBrowseAll: {
    marginHorizontal: 16,
    marginTop: 4,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mBrowseAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },

  /* ============================================================= */
  /* DESKTOP STYLES (FULL WIDTH - NO MAX WIDTH RESTRICTION)        */
  /* ============================================================= */
  desktopSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  desktopTopHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 50,
  },
  desktopTopLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  desktopBrandCol: {
    cursor: 'pointer' as any,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmblemBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  brandEmblemIcon: {
    fontSize: 20,
  },
  brandNameBold: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandNameRed: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginLeft: 1,
  },
  brandTagline: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: -1,
  },
  desktopHeaderDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  desktopLocationBlock: {
    justifyContent: 'center',
  },
  desktopLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  desktopTakeawayText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  desktopAddressText: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  desktopSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 420,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 21,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  desktopSearchPlaceholder: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '500',
  },
  desktopSearchKbd: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  desktopSearchKbdText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  desktopTopRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  desktopTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  desktopTrustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  desktopTrustText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  desktopProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  desktopProfileText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  desktopHeaderCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  desktopHeaderCartText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  desktopBlueStrip: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  desktopBlueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopHubBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  desktopHubBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  desktopBlueTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  desktopBlueSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  desktopDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  desktopDetectBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  desktopScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  desktopScrollContent: {
    paddingBottom: 0,
    width: '100%',
  },
  desktopSegmentedWrapper: {
    alignItems: 'center',
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  desktopSegmentedPillContainer: {
    flexDirection: 'row',
    width: 720,
    backgroundColor: '#E2E8F0',
    borderRadius: 30,
    padding: 4,
    gap: 4,
  },
  desktopSegmentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 26,
    gap: 8,
  },
  desktopSegmentPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentPillEmoji: {
    fontSize: 16,
  },
  desktopSegmentPillTitle: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  desktopSegmentPillTitleActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  desktopSegmentPillSub: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  desktopSection: {
    width: '100%',
    marginTop: 28,
  },
  desktopSectionHeading: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 16,
    paddingHorizontal: 40,
    letterSpacing: -0.3,
  },
  desktopCravingRow: {
    gap: 22,
    paddingHorizontal: 40,
  },
  desktopCravingItem: {
    alignItems: 'center',
    width: 96,
  },
  desktopCravingCircleBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  desktopCravingCircleImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  desktopYellowBadge: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    backgroundColor: '#FBBF24',
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  desktopYellowBadgeText: {
    color: '#000000',
    fontSize: 9.5,
    fontWeight: '900',
  },
  desktopCravingLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  shelfHeaderRow: {
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  shelfTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shelfTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  shelfSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  desktopShelfCards: {
    gap: 20,
    paddingHorizontal: 40,
  },

  /* Promise Section */
  desktopPromiseSection: {
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 48,
    paddingHorizontal: 40,
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
  },
  desktopPromiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  promiseAccentLine: {
    width: 48,
    height: 1.5,
    backgroundColor: '#DC2626',
  },
  desktopPromiseTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  desktopPromiseSub: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32,
  },
  desktopPromiseGrid: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    justifyContent: 'center',
  },
  desktopPromiseCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  promiseIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  promiseEmoji: {
    fontSize: 20,
  },
  promiseCardTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  promiseCardText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* Luxury Footer */
  desktopFooter: {
    backgroundColor: '#0F172A',
    width: '100%',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 40,
  },
  desktopFooterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  desktopFooterColBrand: {
    flex: 2,
    paddingRight: 40,
  },
  desktopFooterAbout: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 20,
    marginTop: 14,
    marginBottom: 18,
  },
  fssaiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  fssaiText: {
    color: '#6EE7B7',
    fontSize: 10.5,
    fontWeight: '700',
  },
  desktopFooterColLinks: {
    flex: 1,
  },
  footerColTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  footerLink: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 10,
  },
  desktopFooterBottomBar: {
    paddingTop: 24,
    alignItems: 'center',
  },
  desktopFooterCopy: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
  },

  /* Royal Top 10 Bestsellers Section Styles */
  top10RoyalContainer: {
    backgroundColor: '#FFFDF0',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingTop: 32,
    paddingBottom: 36,
    marginBottom: 36,
    width: '100%',
  },
  top10HeaderBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  top10CrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  top10AccentLine: {
    width: 60,
    height: 1.5,
    backgroundColor: '#D97706',
    borderRadius: 1,
  },
  top10Heading: {
    color: '#854D0E',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  top10LocationSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 5,
  },
  top10CityText: {
    color: '#A16207',
    fontSize: 12.5,
    fontWeight: '700',
  },
  mobileTop10Container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  mobileTop10HeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  mobileTop10Heading: {
    color: '#171717',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  mobileTop10Subtitle: {
    color: '#737373',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  seeAllText: {
    color: '#E52329',
    fontSize: 13,
    fontWeight: '700',
  },
  mobileTop10Scroll: {
    paddingHorizontal: 16,
  },

  /* ============================================================= */
  /* MOBILE STYLES                                                 */
  /* ============================================================= */
  safeArea: {
    flex: 1,
    backgroundColor: '#101010',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  darkHeader: {
    backgroundColor: '#101010',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    gap: 10,
  },
  etaContainer: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  etaNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  etaLabel: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  locationBlock: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deliveringToEyebrow: {
    color: '#9CA3AF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  locationNameBold: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  addressSubText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 1,
    flexShrink: 1,
    width: '100%',
  },
  profileCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
    marginLeft: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  // Zomato / Swiggy / Blinkit style: white bar, hairline border, soft
  // shadow, brand-coloured icon, rotating "quoted" suggestion.
  searchCapsule: {
    minWidth: 0,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    // Shadow in the header's own hue reads as depth, not dirt.
    shadowColor: '#5A0A12',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  searchPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  searchStaticPrefix: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 0,
  },
  searchDynamicWord: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  offlineStoreCard: {
    width: 54,
    height: 54,
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#050914',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTitleActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  segmentSubtitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  segmentSubtitleActive: {
    color: '#64748B',
  },
  activeIndicatorBar: {
    width: 22,
    height: 2.5,
    backgroundColor: '#0F172A',
    borderRadius: 2,
    marginTop: 3,
  },
  heroCarouselContainer: {
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  heroScrollView: {
    width: '100%',
    height: '100%',
  },
  heroSlideItem: {
    position: 'relative',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSlideImage: {
    width: '100%',
    height: '100%',
  },
  heroTickerStrip: {
    backgroundColor: '#0055A5',
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroTickerText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  heroPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 7,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  paginationActivePill: {
    backgroundColor: '#212121',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  paginationActivePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paginationInactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  cravingSection: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  cravingTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  cravingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  cravingGridItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 16,
  },
  cravingCircleWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cravingCircleImg: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  cravingRedBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 5,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cravingRedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cravingGridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.1,
  },
  popularNearYouSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  popularNearYouHeader: {
    marginBottom: 16,
  },
  popularNearYouTitle: {
    color: '#171717',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  popularNearYouSub: {
    color: '#6B7280',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 3,
  },
  popularNearYouLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  popularNearYouLocationText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  productList: {
    width: '100%',
  },
  /* Service Availability Banner (Lazizia Style Sky Blue Strip) */
  serviceBanner: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  serviceBannerTitle: {
    color: '#1D4ED8',
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  serviceBannerAreas: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  /* Generic Shelf Section Container */
  sectionContainer: {
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  shelfCardsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  /* Jhatka promise card */
  promiseCard: {
    marginHorizontal: GUTTER,
    marginTop: SPACE.xl,
    paddingTop: SPACE.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#F7EFE6',
  },
  promiseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  promiseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3F2A23',
  },
  promiseTitle: {
    marginTop: 14,
    marginHorizontal: 20,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    color: '#2A1C17',
    letterSpacing: -1,
  },
  promiseSub: {
    marginTop: 8,
    marginHorizontal: 20,
    fontSize: 15,
    lineHeight: 21,
    color: '#6B574E',
  },
  promiseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    marginHorizontal: 20,
  },
  promiseLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
  },
  promiseImage: {
    marginTop: 18,
    width: '100%',
    height: 190,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginTop: 8,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111111',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  sheetRowText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginTop: 2,
  },
  sheetBtn: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetClose: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  /* Poetic Brand Footer */
  signoff: {
    marginHorizontal: 16,
    marginTop: 28,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFF6F1',
  },
  signoffLine: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: '#1F1A17',
    letterSpacing: -1,
  },
  signoffAccent: {
    color: '#DC2626',
  },
  signoffSub: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B5E57',
  },
  signoffChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  signoffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  signoffChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3F3A37',
  },
  signoffBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  signoffBrand: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#1F1A17',
  },
  jhatkaSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
  },
  jhatkaSealEnglish: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#DC2626',
  },
});
