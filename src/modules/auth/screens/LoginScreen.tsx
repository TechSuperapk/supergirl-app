import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useDispatch }    from 'react-redux';
import { loginSuccess }   from '../store/authSlice';
import { saveUserToFirestore, getUserProfileFromFirestore } from '../services/userService';

const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India'     },
  { code: '+1',   flag: '🇺🇸', name: 'USA'       },
  { code: '+44',  flag: '🇬🇧', name: 'UK'        },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE'       },
];

interface Props { onLogin: () => void; }

export function LoginScreen({ onLogin }: Props) {
  const dispatch = useDispatch();

  const [mode,    setMode]    = useState<'login' | 'signup'>('login');
  const [phone,   setPhone]   = useState('');
  const [name,    setName]    = useState('');
  const [cc,      setCc]      = useState('+91');
  const [showCC,  setShowCC]  = useState(false);
  const [step,    setStep]    = useState<'phone' | 'otp' | 'welcome'>('phone');
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);

  const selCC = COUNTRY_CODES.find(c => c.code === cc) ?? COUNTRY_CODES[0];

  const handleSendOtp = async () => {
    if (phone.length < 6) {
      Alert.alert('Invalid number', 'Enter a valid phone number');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Name required', 'Enter your name to continue');
      return;
    }
    setLoading(true);
    try {
      setStep('otp');
      Alert.alert('OTP Sent', 'Use verification code: 123456');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      if (otp.trim() !== '123456') {
        throw new Error('Incorrect code. Use 123456 for demo.');
      }

      const uid = `demo_user_${phone.replace(/\D/g, '') || 'guest'}`;

      let profile: any = null;
      try {
        await saveUserToFirestore(uid, `${cc}${phone}`);
        profile = await getUserProfileFromFirestore(uid);
      } catch (dbErr) {
        console.warn('Firestore sync failed (proceeding locally):', dbErr);
      }

      dispatch(loginSuccess({
        id:          uid,
        name:        profile?.name ?? name ?? 'SuperGirl User',
        phone:       `${cc}${phone}`,
        countryCode: cc,
        avatarUrl:   profile?.avatarUrl,
        bio:         profile?.bio,
        createdAt:   profile?.createdAt ?? new Date().toISOString(),
        isVerified:  true,
      }));

      if (mode === 'signup' && !profile?.name) {
        setStep('welcome');
      } else {
        onLogin();
      }
    } catch (e: any) {
      Alert.alert('Verification Failed', e.message ?? 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <View style={[s.safe, s.centred]}>
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <Text style={[s.bigTitle, { fontFamily: FB, textAlign: 'center' }]}>
          Welcome, {name || 'SuperGirl'}!
        </Text>
        <Text style={[s.subTxt, { fontFamily: F, textAlign: 'center' }]}>
          Your journal is ready. Start capturing your thoughts and memories.
        </Text>
        <TouchableOpacity style={s.btn} onPress={onLogin}>
          <Text style={[s.btnT, { fontFamily: FB }]}>Open My Journal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── OTP screen ──────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setStep('phone')} style={s.back}>
              <Text style={[s.backT, { fontFamily: F }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={[s.bigTitle, { fontFamily: FB }]}>Enter OTP</Text>
            <Text style={[s.subTxt, { fontFamily: F }]}>
              We sent a 6-digit code to {selCC.flag} {cc} {phone}
            </Text>

            <TextInput
              style={[s.otpInput, { fontFamily: FB }]}
              placeholder="— — — — — —"
              placeholderTextColor="#CCCCCC"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
              editable={!loading}
              autoFocus
            />

            <TouchableOpacity style={s.btn} onPress={handleVerifyOtp} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={[s.btnT, { fontFamily: FB }]}>Verify OTP</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendOtp} style={s.resend} disabled={loading}>
              <Text style={[s.resendT, { fontFamily: F }]}>Resend OTP</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── Phone screen ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoCircle}>
              <Text style={{ fontSize: 36 }}>🌸</Text>
            </View>
            <Text style={[s.logoTitle, { fontFamily: FB }]}>SuperGirl</Text>
          </View>

          <Text style={[s.bigTitle, { fontFamily: FB }]}>
            {mode === 'login' ? 'Welcome back 👋' : 'Create account ✨'}
          </Text>
          <Text style={[s.subTxt, { fontFamily: F }]}>
            {mode === 'login' ? 'Sign in to continue' : 'Start your SuperGirl journey'}
          </Text>

          {mode === 'signup' && (
            <View style={s.inputWrap}>
              <Text style={[s.label, { fontFamily: F }]}>Your Name</Text>
              <TextInput
                style={[s.input, { fontFamily: F }]}
                placeholder="Enter your name"
                placeholderTextColor="#AAAAAA"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={s.inputWrap}>
            <Text style={[s.label, { fontFamily: F }]}>Phone Number</Text>
            <View style={s.phoneRow}>
              <TouchableOpacity style={s.ccBtn} onPress={() => setShowCC(v => !v)}>
                <Text style={[s.ccTxt, { fontFamily: F }]}>{selCC.flag} {cc} ▾</Text>
              </TouchableOpacity>
              <TextInput
                style={[s.phoneInput, { fontFamily: F }]}
                placeholder="Mobile number"
                placeholderTextColor="#AAAAAA"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={12}
              />
            </View>
            {showCC && (
              <View style={s.ccDropdown}>
                {COUNTRY_CODES.map(c => (
                  <TouchableOpacity
                    key={c.code}
                    style={s.ccItem}
                    onPress={() => { setCc(c.code); setShowCC(false); }}
                  >
                    <Text style={[s.ccItemT, { fontFamily: F }]}>
                      {c.flag}  {c.name} ({c.code})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={[s.btnT, { fontFamily: FB }]}>
                  {mode === 'login' ? 'Send OTP' : 'Sign Up'}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(m => m === 'login' ? 'signup' : 'login')} style={s.switchRow}>
            <Text style={[s.switchT, { fontFamily: F }]}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={[s.switchLink, { fontFamily: FB }]}>
                {mode === 'login' ? 'Sign Up' : 'Login'}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#FFFFFF' },
  centred:     { justifyContent: 'center', alignItems: 'center', gap: 24, paddingHorizontal: 32 },
  scroll:      { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 18 },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  logoCircle:  { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E3EEFF', alignItems: 'center', justifyContent: 'center' },
  logoTitle:   { fontSize: 20, color: '#111' },
  bigTitle:    { fontSize: 30, color: '#111', lineHeight: 38 },
  subTxt:      { fontSize: 15, color: '#888', lineHeight: 22 },
  inputWrap:   { gap: 8 },
  label:       { fontSize: 13, color: '#555' },
  input:       { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111', backgroundColor: '#FAFAFA' },
  phoneRow:    { flexDirection: 'row', gap: 10 },
  ccBtn:       { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#FAFAFA', justifyContent: 'center' },
  ccTxt:       { fontSize: 14, color: '#111' },
  phoneInput:  { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111', backgroundColor: '#FAFAFA' },
  ccDropdown:  { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  ccItem:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  ccItemT:     { fontSize: 15, color: '#111' },
  otpInput:    { borderWidth: 2, borderColor: '#2979FF', borderRadius: 16, paddingVertical: 18, fontSize: 28, color: '#111', letterSpacing: 12, marginVertical: 12 },
  btn:         { backgroundColor: '#2979FF', borderRadius: 50, paddingVertical: 18, alignItems: 'center' },
  btnT:        { fontSize: 17, color: '#FFF' },
  resend:      { alignItems: 'center' },
  resendT:     { fontSize: 14, color: '#2979FF' },
  back:        { paddingVertical: 8 },
  backT:       { fontSize: 16, color: '#2979FF' },
  switchRow:   { alignItems: 'center', marginTop: 8 },
  switchT:     { fontSize: 14, color: '#888' },
  switchLink:  { color: '#2979FF' },
});
