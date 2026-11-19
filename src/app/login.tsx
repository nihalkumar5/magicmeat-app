import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { OtpError, requestOtp, verifyOtp } from '../services/backend';
import { AppIcon, ArrowLeft01Icon, CheckmarkCircle02Icon } from '../components/HugeIcon';

const RED = '#DC2626';
const TEXT = '#111111';
const SECONDARY = '#6B7280';
const CODE_LENGTH = 4;

const HERO = require('../../assets/hero/hero_chicken_table.png');

const TRUST = ['100% Jhatka', 'Cut fresh to order', 'Pay on delivery'];

const cleanDigits = (s: string) => s.replace(/\D/g, '');
const isValidMobile = (s: string) => /^[6-9]\d{9}$/.test(s);

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  // Typed loosely: RN 0.88's TextInput ref type is not the component type.
  const codeRef = useRef<{ focus: () => void } | null>(null);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const phoneOk = isValidMobile(phone);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const heroHeight = Math.round(Math.min(Math.max(screenH * 0.46, 300), 460));

  const sendCode = async () => {
    if (!phoneOk || busy) return;
    setBusy(true);
    setError('');
    try {
      const wait = await requestOtp(phone);
      setCode('');
      setStep('code');
      setResendIn(wait);
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      const err = e as OtpError;
      // Already sent recently: go to the code screen and show the timer.
      if (err.code === 'too_soon' && step === 'phone') {
        setStep('code');
        setResendIn(err.retryIn || 30);
        setTimeout(() => codeRef.current?.focus(), 250);
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value: string) => {
    if (value.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError('');
    try {
      await verifyOtp(phone, value);
      // The root layout swaps to the app when the session arrives.
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message || 'That code is not right. Please try again.');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (text: string) => {
    const digits = cleanDigits(text).slice(0, CODE_LENGTH);
    setCode(digits);
    if (error) setError('');
    if (digits.length === CODE_LENGTH) submitCode(digits);
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
  };

  /* ----------------------------------------------------------- code step */
  if (step === 'code') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.nav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={backToPhone}
            accessibilityRole="button"
            accessibilityLabel="Back, change number"
          >
            <AppIcon icon={ArrowLeft01Icon} size={22} color={TEXT} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.codeBody}>
            <Text style={styles.codeTitle}>Enter the code</Text>
            <Text style={styles.codeSub}>
              We sent a {CODE_LENGTH}-digit code by SMS to{'\n'}
              <Text style={styles.codePhone}>
                +91 {phone.slice(0, 5)} {phone.slice(5)}
              </Text>
              {'  '}
              <Text style={styles.editLink} onPress={backToPhone} accessibilityRole="link">
                Edit
              </Text>
            </Text>

            {/* One hidden input drives the boxes, so paste and SMS autofill work. */}
            <Pressable style={styles.boxes} onPress={() => codeRef.current?.focus()} accessibilityLabel="Enter code">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const filled = i < code.length;
                const active = i === code.length && !busy;
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      filled && styles.boxFilled,
                      active && styles.boxActive,
                      !!error && styles.boxError,
                    ]}
                  >
                    <Text style={styles.boxText}>{code[i] || ''}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={codeRef as never}
                value={code}
                onChangeText={onCodeChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                maxLength={CODE_LENGTH}
                autoFocus
                editable={!busy}
                caretHidden
                style={styles.hiddenInput}
                accessibilityLabel={`${CODE_LENGTH}-digit code`}
              />
            </Pressable>

            {busy ? (
              <View style={styles.statusRow}>
                <ActivityIndicator color={RED} />
                <Text style={styles.statusText}>Checking…</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.resendRow}>
              {resendIn > 0 ? (
                <Text style={styles.resendMuted}>Resend code in 0:{String(resendIn).padStart(2, '0')}</Text>
              ) : (
                <Text style={styles.resendMuted}>
                  Didn’t get it?{' '}
                  <Text style={styles.resendLink} onPress={sendCode} accessibilityRole="button">
                    Resend code
                  </Text>
                </Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ---------------------------------------------------------- phone step */
  // Glovo / Swiggy style: full-bleed brand photo, then a white sheet with the
  // number field.
  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image
              source={HERO}
              style={[styles.heroImg, { width: screenW, height: Math.round((screenW * 1402) / 1122) }]}
              resizeMode="cover"
            />
            <SafeAreaView edges={['top']} style={styles.heroTop}>
              <Text style={styles.heroBrand}>
                Magic<Text style={styles.heroBrandAccent}>Meat</Text>
              </Text>
            </SafeAreaView>
          </View>

          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <Text style={styles.title}>Log in or sign up</Text>
            <Text style={styles.sub}>Enter your mobile number to continue</Text>

            <View style={[styles.phoneField, phone.length > 0 && styles.phoneFieldActive]}>
              <Text style={styles.prefix}>+91</Text>
              <View style={styles.prefixDivider} />
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(t) => {
                  setPhone(cleanDigits(t).slice(-10));
                  if (error) setError('');
                }}
                placeholder="Mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={sendCode}
                accessibilityLabel="Mobile number"
              />
            </View>
            {!!error && <Text style={styles.errorTextLeft}>{error}</Text>}

            <TouchableOpacity
              style={[styles.cta, (!phoneOk || busy) && styles.ctaOff]}
              onPress={sendCode}
              disabled={!phoneOk || busy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !phoneOk || busy }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.ctaText, !phoneOk && styles.ctaTextOff]}>Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.trustRow}>
              {TRUST.map((t) => (
                <View key={t} style={styles.trustItem}>
                  <AppIcon icon={CheckmarkCircle02Icon} size={14} color="#15803D" strokeWidth={2.2} />
                  <Text style={styles.trustText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={{ flex: 1 }} />
            <Text style={styles.legal}>
              By continuing, you agree to our <Text style={styles.legalStrong}>Terms of Service</Text> and{' '}
              <Text style={styles.legalStrong}>Privacy Policy</Text>.
            </Text>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* phone step */
  hero: {
    width: '100%',
    backgroundColor: '#B91C1C',
    overflow: 'hidden',
  },
  heroImg: {
    // Sized in code to the photo's own ratio at full width, so its headline
    // is never cut at the sides; the extra height falls under the sheet.
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroTop: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  heroBrand: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroBrandAccent: {
    color: '#FCA5A5',
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 15,
    color: SECONDARY,
    marginTop: 6,
    marginBottom: 20,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  phoneFieldActive: {
    borderColor: TEXT,
  },
  flag: {
    fontSize: 18,
    marginRight: 6,
  },
  prefix: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
  },
  prefixDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 17,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  cta: {
    height: 54,
    borderRadius: 27,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  ctaOff: {
    backgroundColor: '#F3F4F6',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  ctaTextOff: {
    color: '#9CA3AF',
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 14,
    rowGap: 6,
    marginTop: 18,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  legal: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  legalStrong: {
    color: '#6B7280',
    fontWeight: '600',
  },

  /* code step */
  nav: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBody: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  codeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.6,
  },
  codeSub: {
    fontSize: 15,
    color: SECONDARY,
    lineHeight: 22,
    marginTop: 8,
  },
  codePhone: {
    color: TEXT,
    fontWeight: '700',
  },
  editLink: {
    color: RED,
    fontWeight: '700',
  },
  boxes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  box: {
    width: 62,
    height: 66,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  boxActive: {
    borderColor: TEXT,
    backgroundColor: '#FFFFFF',
  },
  boxError: {
    borderColor: RED,
  },
  boxText: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', color: 'transparent' } as object) : {}),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  statusText: {
    fontSize: 14,
    color: SECONDARY,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: RED,
    fontWeight: '600',
    marginTop: 18,
  },
  errorTextLeft: {
    fontSize: 13,
    color: RED,
    fontWeight: '600',
    marginTop: 8,
  },
  resendRow: {
    marginTop: 26,
  },
  resendMuted: {
    fontSize: 15,
    color: SECONDARY,
  },
  resendLink: {
    color: RED,
    fontWeight: '700',
  },
});
