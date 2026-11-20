import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Text, AccessibilityInfo, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash (crimson + white bird badge) up until this
// component has drawn the same frame, so the hand-off is invisible.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 200, fade: true });

const BIRD = require('../../assets/brand/bird.png');
const WORDMARK = require('../../assets/brand/wordmark.png');
const BIRD_RATIO = 313 / 475; // height / width of bird.png
const WORD_RATIO = 169 / 859;

// Brand crimson (same as the home header) and its gold accent.
const BG = '#BE1E2D';
const BG_DEEP = '#8E1220';
const GOLD = '#FFC94A';

// Native splash: 200pt image, badge = 90% of it, bird = 62% of it.
const BADGE = 180;
const BIRD_W = 124;

let shownThisLaunch = false;

/**
 * Brand intro on cold start, on crimson:
 *  1. Native splash hands over (same crimson, same white badge).
 *  2. Soft rings ripple out from the badge; the bird pulls back and dashes
 *     forward while white wind streaks fly past.
 *  3. The badge lifts and settles; the white wordmark rises beneath it with
 *     a gold underline sweep and the promise line.
 *  4. Once the app is ready the whole layer fades and lifts away.
 * About 1.6 s; with Reduce Motion it is a plain fade.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(!shownThisLaunch);
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Start only once the bird is on screen, so the first frame always matches
  // the native splash.
  const [birdReady, setBirdReady] = useState(false);

  const [dash] = useState(() => new Animated.Value(0)); // bird pull-back + dash
  const [lift] = useState(() => new Animated.Value(0)); // badge moves up, word rises
  const [streaks] = useState(() => new Animated.Value(0)); // wind lines
  const [ripple] = useState(() => new Animated.Value(0)); // rings
  const [line] = useState(() => new Animated.Value(0)); // gold underline
  const [tag] = useState(() => new Animated.Value(0)); // promise line
  const [out] = useState(() => new Animated.Value(0)); // exit

  const wordW = Math.min(250, width * 0.64);
  const glow = Math.max(width, height) * 1.1;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => !cancelled && setReduceMotion(!!r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Never get stuck: start anyway if the image hasn't reported in time.
  useEffect(() => {
    if (!visible || birdReady) return;
    const t = setTimeout(() => {
      setBirdReady(true);
      SplashScreen.hide();
    }, 1200);
    return () => clearTimeout(t);
  }, [visible, birdReady]);

  // Intro.
  useEffect(() => {
    if (!visible || !birdReady) return;
    if (reduceMotion) {
      dash.setValue(1);
      lift.setValue(1);
      line.setValue(1);
      tag.setValue(1);
      return;
    }
    const ease = Easing.bezier(0.22, 1, 0.36, 1);
    Animated.timing(ripple, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const anim = Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(dash, {
          toValue: 1,
          duration: 520,
          easing: Easing.bezier(0.5, -0.4, 0.3, 1.4),
          useNativeDriver: true,
        }),
        Animated.timing(streaks, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(lift, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(line, { toValue: 1, duration: 380, easing: ease, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(tag, { toValue: 1, duration: 360, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(260),
    ]);
    anim.start(({ finished }) => finished && setIntroDone(true));
    return () => anim.stop();
  }, [visible, birdReady, reduceMotion, dash, lift, streaks, ripple, line, tag]);

  // Exit once the intro has played and the app is ready underneath.
  useEffect(() => {
    if (!visible || !(introDone || reduceMotion) || !ready) return;
    Animated.timing(out, {
      toValue: 1,
      duration: reduceMotion ? 200 : 380,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      shownThisLaunch = true;
      setVisible(false);
    });
  }, [visible, introDone, ready, reduceMotion, out]);

  if (!visible) return null;

  const birdTranslateX = dash.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -10, 0] });
  const badgeScale = dash.interpolate({ inputRange: [0, 0.25, 0.7, 1], outputRange: [1, 0.95, 1.05, 1] });
  const badgeLiftY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
  const badgeLiftScale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] });

  const wordOpacity = lift.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  const wordY = lift.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
  const wordScale = lift.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const layerOpacity = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const layerScale = out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  // Two soft rings that spread from the badge, one after the other.
  const RINGS = [0, 0.3];

  // Wind streaks: thin white lines that fly from right to left past the bird.
  const STREAKS = [
    { top: -30, w: 80, delay: 0 },
    { top: 4, w: 130, delay: 0.12 },
    { top: 36, w: 64, delay: 0.22 },
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { opacity: layerOpacity }]}
      accessibilityLabel="MagicMeat"
    >
      {/* Background: crimson with a lit centre and deeper edges */}
      <View style={[styles.edge, { width: glow * 1.4, height: glow * 1.4, borderRadius: glow * 0.7 }]} />
      <View style={[styles.centreGlow, { width: glow, height: glow, borderRadius: glow / 2 }]} />
      <View style={[styles.centreGlowInner, { width: glow * 0.55, height: glow * 0.55, borderRadius: glow * 0.275 }]} />

      <Animated.View style={[styles.stage, { transform: [{ scale: layerScale }] }]}>
        {/* ripples */}
        {RINGS.map((d, i) => {
          const scale = ripple.interpolate({
            inputRange: [0, d, Math.min(1, d + 0.7), 1],
            outputRange: [1, 1, 2.4, 2.4],
          });
          const opacity = ripple.interpolate({
            inputRange: [0, d, d + 0.05, Math.min(1, d + 0.7), 1],
            outputRange: [0, 0, 0.35, 0, 0],
          });
          return (
            <Animated.View
              key={i}
              style={[styles.ring, { width: BADGE, height: BADGE, borderRadius: BADGE / 2, opacity, transform: [{ scale }] }]}
            />
          );
        })}

        {/* wind */}
        <View style={[styles.windBox, { width }]} pointerEvents="none">
          {STREAKS.map((s, i) => {
            const start = s.delay;
            const tx = streaks.interpolate({
              inputRange: [0, start, Math.min(1, start + 0.6), 1],
              outputRange: [width * 0.6, width * 0.6, -width * 0.6, -width * 0.6],
            });
            const op = streaks.interpolate({
              inputRange: [0, start, start + 0.15, Math.min(1, start + 0.5), 1],
              outputRange: [0, 0, 0.75, 0, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[styles.streak, { top: s.top, width: s.w, opacity: op, transform: [{ translateX: tx }] }]}
              />
            );
          })}
        </View>

        {/* white badge with the bird (matches the native splash image) */}
        <Animated.View
          style={[
            styles.badge,
            {
              transform: [{ translateY: badgeLiftY }, { scale: Animated.multiply(badgeScale, badgeLiftScale) }],
            },
          ]}
        >
          <Animated.Image
            source={BIRD}
            onLoad={() => {
              setBirdReady(true);
              SplashScreen.hide();
            }}
            onError={() => setBirdReady(true)}
            resizeMode="contain"
            style={{
              width: BIRD_W,
              height: BIRD_W * BIRD_RATIO,
              marginLeft: 2,
              transform: [{ translateX: birdTranslateX }],
            }}
          />
        </Animated.View>

        {/* wordmark + underline + promise */}
        <Animated.View
          style={[styles.wordWrap, { opacity: wordOpacity, transform: [{ translateY: wordY }, { scale: wordScale }] }]}
        >
          <Animated.Image
            source={WORDMARK}
            resizeMode="contain"
            style={{ width: wordW, height: wordW * WORD_RATIO, tintColor: '#FFFFFF' }}
          />
          <Animated.View style={[styles.underline, { width: wordW * 0.3, transform: [{ scaleX: line }] }]} />
          <Animated.View style={{ opacity: tag }}>
            <Text style={styles.tagline}>FRESH JHATKA MEAT · 15–20 MIN</Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BG,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Deeper crimson towards the corners (a soft vignette).
  edge: {
    position: 'absolute',
    borderWidth: 220,
    borderColor: 'rgba(110,10,22,0.35)',
    backgroundColor: 'transparent',
  },
  centreGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,120,110,0.10)',
  },
  centreGlowInner: {
    position: 'absolute',
    backgroundColor: 'rgba(255,170,150,0.10)',
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BG_DEEP,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  windBox: {
    position: 'absolute',
    height: 1,
    alignSelf: 'center',
    top: '50%',
  },
  streak: {
    position: 'absolute',
    left: '50%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  wordWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: 52,
    alignItems: 'center',
  },
  underline: {
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 12,
  },
  tagline: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.75)',
  },
});
