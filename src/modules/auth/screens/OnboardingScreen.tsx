import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { saveUserToFirestore } from '../services/userService';
import { sendOtp as fbSendOtp, verifyOtp as fbVerifyOtp } from '../services/authService';
import { exchangeFirebaseTokenForSession } from '../services/backendAuthService';
import { auth } from '../../../lib/firebase';
import { signInAnonymously } from 'firebase/auth';

const { width: SW } = Dimensions.get('window');
const F  = 'DMSans-Regular';
const FM = 'DMSans-Medium';
const FB = 'DMSans-Bold';
const BLUE = '#2979FF';

// Real SMS OTP via react-native-firebase (native phone auth, no reCAPTCHA).
// Set to false to fall back to the test/anonymous flow.
const USE_REAL_OTP = true;
const OTP_LEN = USE_REAL_OTP ? 6 : 4;
// Responsive box sizing so the digits fit on small screens.
const OTP_GAP = 8;
const OTP_BOX = Math.max(40, Math.min(56, Math.floor((SW - 44 - OTP_GAP * (OTP_LEN - 1)) / OTP_LEN)));

const SLIDES = [
  { img: require('../../../../assets/onboarding/circle.png'),   title: 'Your Personality, All in', accent: 'One Place.', sub: 'Add your favorites, hobbies, travel memories, books, movies, music, and circle of friends to create a profile that is uniquely yours.' },
  { img: require('../../../../assets/onboarding/track.png'),    title: 'Track Every Part of', accent: 'Your Life.', sub: 'Monitor your mood, sleep, habits, periods, health, and spending — all in one place designed for girls.' },
  { img: require('../../../../assets/onboarding/wardrobe.png'), title: 'Your Closet, Digitally', accent: 'Organized.', sub: 'Save clothes, shoes, bags, and accessories. Create outfits, discover combinations, and simplify your daily styling.' },
];

const COUNTRY_CODES = [
  { code: '+91',  flag: '\u{1F1EE}\u{1F1F3}', name: 'India' },
  { code: '+1',   flag: '\u{1F1FA}\u{1F1F8}', name: 'USA' },
  { code: '+44',  flag: '\u{1F1EC}\u{1F1E7}', name: 'UK' },
  { code: '+61',  flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE' },
];

type Step = 'phone' | 'otp' | 'welcome';
interface Props { onDone: () => void; }

export function OnboardingScreen({ onDone }: Props) {
  const dispatch = useDispatch();
  const scrollRef = useRef<ScrollView>(null);
  const [slide, setSlide] = useState(0);
  const [step, setStep]   = useState<Step>('phone');

  const [cc, setCc]       = useState('+91');
  const [showCC, setShowCC] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resend, setResend]   = useState(0);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const onOtpChange = (text: string, i: number) => {
    const clean = text.replace(/\D/g, '');
    if (clean.length > 1) {
      // handles paste / autofill of the full code
      const next = (otp.substring(0, i) + clean).slice(0, OTP_LEN);
      setOtp(next);
      otpRefs.current[Math.min(next.length, OTP_LEN - 1)]?.focus();
      return;
    }
    const arr = otp.split('');
    arr[i] = clean;
    const next = arr.join('').slice(0, OTP_LEN);
    setOtp(next);
    if (clean && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKey = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      const arr = otp.split('');
      arr[i - 1] = '';
      setOtp(arr.join(''));
      otpRefs.current[i - 1]?.focus();
    }
  };
  const selCC = COUNTRY_CODES.find(c => c.code === cc) ?? COUNTRY_CODES[0];

  const doneRef = useRef(onDone); doneRef.current = onDone;

  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  // Auto-advance carousel only on the phone step
  useEffect(() => {
    if (step !== 'phone') return;
    const t = setInterval(() => {
      setSlide(prev => {
        const ni = (prev + 1) % SLIDES.length;
        scrollRef.current?.scrollTo({ x: ni * SW, animated: true });
        return ni;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (resend <= 0) return;
    const t = setInterval(() => setResend(r => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(t);
  }, [resend]);

  // Auto-continue from the welcome screen
  useEffect(() => {
    if (step !== 'welcome') return;
    const t = setTimeout(() => doneRef.current(), 1900);
    return () => clearTimeout(t);
  }, [step]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setSlide(Math.round(e.nativeEvent.contentOffset.x / SW));
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) { Alert.alert('Invalid number', 'Enter a valid mobile number.'); return; }
    if (USE_REAL_OTP) {
      setLoading(true);
      try {
        await fbSendOtp(`${cc}${digits}`);
        setStep('otp'); setResend(29); setOtp('');
        setTimeout(() => otpRefs.current[0]?.focus(), 350);
      } catch (e: any) {
        Alert.alert('Could not send OTP', e?.message ?? 'Please try again.');
      } finally { setLoading(false); }
      return;
    }
    // Test mode: any code of OTP_LEN digits verifies.
    setStep('otp'); setResend(29); setOtp('');
    setTimeout(() => otpRefs.current[0]?.focus(), 350);
  };

  const verifyOtp = async () => {
    if (otp.length !== OTP_LEN) { Alert.alert('Invalid OTP', `Enter the ${OTP_LEN}-digit code.`); return; }
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, '');
      if (USE_REAL_OTP) {
        // 1. Confirm the SMS code with Firebase.
        const fu = await fbVerifyOtp(otp);
        // 2. Hand the Firebase ID token to our backend, which verifies it
        //    (Firebase Admin) and mints our own session JWT + Mongo user.
        const idToken = await fu.getIdToken();
        const backendUser = await exchangeFirebaseTokenForSession(idToken);
        dispatch(loginSuccess({
          id: backendUser.id,
          name: backendUser.name ?? '',
          phone: backendUser.phone || `${cc}${phone}`,
          countryCode: backendUser.countryCode || cc,
          avatarUrl: backendUser.avatarUrl,
          bio: backendUser.bio,
          createdAt: backendUser.createdAt,
          isVerified: true,
        }));
      } else {
        // Test mode: sign in anonymously so writes have a real auth uid.
        // Falls back to a local session if Anonymous auth isn't enabled yet.
        let uid: string;
        try {
          const cred = await signInAnonymously(auth);
          uid = cred.user.uid;
        } catch (e) {
          uid = `demo_user_${digits || 'guest'}`;
        }
        try { await saveUserToFirestore(uid, `${cc}${phone}`); } catch (e) { /* proceed locally */ }
        dispatch(loginSuccess({
          id: uid, name: '', phone: `${cc}${phone}`, countryCode: cc,
          createdAt: new Date().toISOString(), isVerified: true,
        }));
      }
      setStep('welcome');
    } catch (e: any) {
      Alert.alert('Verification failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    let uid = 'guest';
    try { const cred = await signInAnonymously(auth); uid = cred.user.uid; } catch (e) { /* ignore */ }
    try { await saveUserToFirestore(uid, ''); } catch (e) { /* ignore */ }
    dispatch(loginSuccess({
      id: uid, name: '', phone: '', countryCode: cc,
      createdAt: new Date().toISOString(), isVerified: true,
    }));
    doneRef.current();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Carousel — collapses while the keyboard is open */}
        {!kbOpen && (
        <View style={s.heroWrap}>
          <ScrollView
            ref={scrollRef}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={step === 'phone'}
            onMomentumScrollEnd={onScrollEnd}
          >
            {SLIDES.map((sl, i) => (
              <View key={i} style={{ width: SW }}>
                <Image source={sl.img} style={s.hero} resizeMode="cover" />
                <View style={s.heroText}>
                  <Text style={[s.title, { fontFamily: FB }]}>
                    {sl.title}{' '}
                    <Text style={{ color: BLUE }}>{sl.accent}</Text>
                  </Text>
                  <Text style={[s.sub, { fontFamily: F }]}>{sl.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {step === 'phone' && (
            <TouchableOpacity style={s.skip} onPress={skip} activeOpacity={0.8}>
              <Text style={[s.skipT, { fontFamily: FM }]}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Dots */}
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === slide && s.dotActive]} />
            ))}
          </View>
        </View>
        )}

        {/* Bottom panel */}
        <View style={s.panel}>
          {step === 'phone' && (
            <>
              <Text style={[s.panelTitle, { fontFamily: FB }]}>Login or Signup</Text>
              <Text style={[s.panelSub, { fontFamily: F }]}>Get started & grab best offers on top brands!</Text>
              <View style={s.phoneRow}>
                <TouchableOpacity style={s.ccBtn} onPress={() => setShowCC(v => !v)} activeOpacity={0.8}>
                  <Text style={[s.ccTxt, { fontFamily: FM }]}>{selCC.flag} {cc}  ▾</Text>
                </TouchableOpacity>
                <TextInput
                  style={[s.phoneInput, { fontFamily: F }]}
                  placeholder="10-digit mobile Number"
                  placeholderTextColor="#AAB0B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={12}
                />
              </View>
              {showCC && (
                <View style={s.ccDropdown}>
                  {COUNTRY_CODES.map(c => (
                    <TouchableOpacity key={c.code} style={s.ccItem} onPress={() => { setCc(c.code); setShowCC(false); }}>
                      <Text style={[s.ccItemT, { fontFamily: F }]}>{c.flag}  {c.name} ({c.code})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.cta} onPress={sendOtp} activeOpacity={0.85}>
                <Text style={[s.ctaT, { fontFamily: FB }]}>Continue</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <View style={s.otpHead}>
                <TouchableOpacity onPress={() => setStep('phone')} style={s.backBtn}>
                  <Text style={s.backArr}>‹</Text>
                </TouchableOpacity>
                <Text style={[s.panelTitle, { fontFamily: FB, flex: 1, textAlign: 'center' }]}>Enter OTP</Text>
                <View style={{ width: 28 }} />
              </View>
              <Text style={[s.otpSent, { fontFamily: F }]}>
                Sent to {cc} {phone}{'  '}
                <Text style={{ color: BLUE }} onPress={() => setStep('phone')}>✎</Text>
              </Text>

              <View style={s.otpRow}>
                {Array.from({ length: OTP_LEN }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={r => { otpRefs.current[i] = r; }}
                    style={[s.otpBox, { width: OTP_BOX, height: Math.round(OTP_BOX * 1.14), fontFamily: FB }, (otp.length === i || otp[i]) && s.otpBoxActive]}
                    keyboardType="number-pad"
                    maxLength={OTP_LEN}
                    value={otp[i] ?? ''}
                    onChangeText={t => onOtpChange(t, i)}
                    onKeyPress={e => onOtpKey(e, i)}
                    selectTextOnFocus
                    autoFocus={i === 0}
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                  />
                ))}
              </View>

              <TouchableOpacity style={s.cta} onPress={verifyOtp} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={[s.ctaT, { fontFamily: FB }]}>Continue</Text>}
              </TouchableOpacity>

              {resend > 0 ? (
                <Text style={[s.resend, { fontFamily: F }]}>Resend in 00:{String(resend).padStart(2, '0')}</Text>
              ) : (
                <TouchableOpacity onPress={sendOtp}><Text style={[s.resendLink, { fontFamily: FM }]}>Resend OTP</Text></TouchableOpacity>
              )}
            </>
          )}

          {step === 'welcome' && (
            <View style={s.welcomeWrap}>
              <View style={s.check}><Text style={s.checkT}>✓</Text></View>
              <Text style={[s.welcomeT, { fontFamily: FB }]}>Welcome!</Text>
              <Text style={[s.welcomeSub, { fontFamily: F }]}>Your space is ready.</Text>
            </View>
          )}
        </View>

        <Text style={[s.terms, { fontFamily: F }]}>
          By continuing, I agree to SnBsuper{'\n'}
          <Text style={{ color: BLUE }}>Terms & Conditions</Text> and <Text style={{ color: BLUE }}>Privacy Policy</Text>
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const HERO_H = Math.min(360, Dimensions.get('window').height * 0.42);

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#FFFFFF' },
  heroWrap:    { position: 'relative' },
  hero:        { width: SW, height: HERO_H },
  heroText:    { paddingHorizontal: 28, paddingTop: 16 },
  title:       { fontSize: 24, color: '#111', textAlign: 'center', lineHeight: 31 },
  sub:         { fontSize: 14, color: '#8A8F98', textAlign: 'center', lineHeight: 21, marginTop: 10 },
  skip:        { position: 'absolute', top: 14, right: 16, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 7 },
  skipT:       { fontSize: 14, color: '#FFFFFF' },
  dots:        { flexDirection: 'row', gap: 6, alignSelf: 'center', marginTop: 16 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D7DBE0' },
  dotActive:   { width: 22, backgroundColor: BLUE },

  panel:       { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  panelTitle:  { fontSize: 20, color: '#111', textAlign: 'center' },
  panelSub:    { fontSize: 13, color: '#8A8F98', textAlign: 'center', marginTop: 4, marginBottom: 18 },
  phoneRow:    { flexDirection: 'row', gap: 10 },
  ccBtn:       { borderWidth: 1.5, borderColor: '#E5E8EC', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#FFF' },
  ccTxt:       { fontSize: 15, color: '#111' },
  phoneInput:  { flex: 1, borderWidth: 1.5, borderColor: '#E5E8EC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111', backgroundColor: '#FFF' },
  ccDropdown:  { borderWidth: 1, borderColor: '#E5E8EC', borderRadius: 12, backgroundColor: '#FFF', marginTop: 8, overflow: 'hidden' },
  ccItem:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  ccItemT:     { fontSize: 15, color: '#111' },
  cta:         { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  ctaT:        { fontSize: 16, color: '#FFFFFF' },

  otpHead:     { flexDirection: 'row', alignItems: 'center' },
  backBtn:     { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  backArr:     { fontSize: 30, color: '#111', lineHeight: 30 },
  otpSent:     { fontSize: 13, color: '#8A8F98', textAlign: 'center', marginTop: 4 },
  otpRow:      { flexDirection: 'row', gap: OTP_GAP, justifyContent: 'center', marginTop: 20, alignSelf: 'center' },
  otpBox:      { borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E8EC', backgroundColor: '#FFF', textAlign: 'center', fontSize: 24, color: '#111', padding: 0 },
  otpBoxActive:{ borderColor: BLUE, borderWidth: 2 },
  resend:      { fontSize: 13, color: '#8A8F98', textAlign: 'center', marginTop: 16 },
  resendLink:  { fontSize: 14, color: BLUE, textAlign: 'center', marginTop: 16 },

  welcomeWrap: { alignItems: 'center', gap: 10 },
  check:       { width: 96, height: 96, borderRadius: 48, backgroundColor: '#2ECC71', alignItems: 'center', justifyContent: 'center' },
  checkT:      { fontSize: 52, color: '#FFFFFF', lineHeight: 58 },
  welcomeT:    { fontSize: 26, color: '#111', marginTop: 8 },
  welcomeSub:  { fontSize: 14, color: '#8A8F98' },

  terms:       { fontSize: 12, color: '#AAB0B8', textAlign: 'center', paddingBottom: 14, paddingHorizontal: 24, lineHeight: 18 },
});
