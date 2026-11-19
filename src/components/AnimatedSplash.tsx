import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Text, AccessibilityInfo, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash (black + bird) up until this component has drawn
// the same frame, so the hand-off is invisible.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 200, fade: true });

const BIRD = require('../../assets/brand/bird.png');
const WORDMARK = require('../../assets/brand/wordmark.png');
const BIRD_RATIO = 313 / 475; // height / width of bird.png
const WORD_RATIO = 169 / 859;
const RED = '#C8102E';

let shownThisLaunch = false;

/**
 * Brand intro on cold start:
 *  1. Native splash hands over (same black frame, same bird).
 *  2. The bird pulls back, then dashes forward while wind streaks fly past.
 *  3. It lifts and settles; "Magicmeat" rises in beneath it, with a red
 *     underline sweep and the promise line.
 *  4. Once the app is ready the whole layer fades and lifts away.
 * About 1.6 s; with Reduce Motion it is a plain fade.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(!shownThisLaunch);
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Start only once the bird is on screen, so the first frame always matches
  // the native splash.
  const [birdReady, setBirdReady] = useState(false);

  const [dash] = useState(() => new Animated.Value(0)); // bird pull-back + dash
  const [lift] = useState(() => new Animated.Value(0)); // bird moves up, word rises
  const [streaks] = useState(() => new Animated.Value(0)); // wind lines
  const [line] = useState(() => new Animated.Value(0)); // red underline
  const [tag] = useState(() => new Animated.Value(0)); // promise line
  const [out] = useState(() => new Animated.Value(0)); // exit

  const birdW = Math.min(200, width * 0.5);
  const wordW = Math.min(260, width * 0.66);

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
    const ease = Easing.bezier(0.22, 1, 0.36, 1); // easeOutQuint-ish
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
  }, [visible, birdReady, reduceMotion, dash, lift, streaks, line, tag]);

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

  const birdTranslateX = dash.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -18, 0] });
  const birdScale = dash.interpolate({ inputRange: [0, 0.25, 0.7, 1], outputRange: [1, 0.94, 1.06, 1] });
  const birdLiftY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const birdLiftScale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });

  const wordOpacity = lift.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
  const wordY = lift.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
  const wordScale = lift.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const layerOpacity = out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const layerScale = out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  // Wind streaks: thin red lines that fly from right to left past the bird.
  const STREAKS = [
    { top: -34, w: 90, delay: 0 },
    { top: 6, w: 140, delay: 0.12 },
    { top: 40, w: 70, delay: 0.22 },
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { opacity: layerOpacity }]}
      accessibilityLabel="MagicMeat"
    >
      <Animated.View style={[styles.stage, { transform: [{ scale: layerScale }] }]}>
        {/* wind */}
        <View style={[styles.windBox, { width: width }]} pointerEvents="none">
          {STREAKS.map((s, i) => {
            const start = s.delay;
            const tx = streaks.interpolate({
              inputRange: [0, start, Math.min(1, start + 0.6), 1],
              outputRange: [width * 0.6, width * 0.6, -width * 0.6, -width * 0.6],
            });
            const op = streaks.interpolate({
              inputRange: [0, start, start + 0.15, Math.min(1, start + 0.5), 1],
              outputRange: [0, 0, 0.9, 0, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[styles.streak, { top: s.top, width: s.w, opacity: op, transform: [{ translateX: tx }] }]}
              />
            );
          })}
        </View>

        {/* bird */}
        <Animated.Image
          source={BIRD}
          onLoad={() => {
            setBirdReady(true);
            SplashScreen.hide();
          }}
          onError={() => setBirdReady(true)}
          resizeMode="contain"
          style={{
            width: birdW,
            height: birdW * BIRD_RATIO,
            transform: [
              { translateY: birdLiftY },
              { translateX: birdTranslateX },
              { scale: Animated.multiply(birdScale, birdLiftScale) },
            ],
          }}
        />

        {/* wordmark + underline + promise */}
        <Animated.View
          style={[styles.wordWrap, { opacity: wordOpacity, transform: [{ translateY: wordY }, { scale: wordScale }] }]}
        >
          <Animated.Image source={WORDMARK} resizeMode="contain" style={{ width: wordW, height: wordW * WORD_RATIO }} />
          <Animated.View style={[styles.underline, { width: wordW * 0.34, transform: [{ scaleX: line }] }]} />
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
    backgroundColor: '#000000',
    zIndex: 1000,
    elevation: 1000,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: RED,
  },
  wordWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: 36,
    alignItems: 'center',
  },
  underline: {
    height: 4,
    borderRadius: 2,
    backgroundColor: RED,
    marginTop: 12,
  },
  tagline: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.6)',
  },
});
