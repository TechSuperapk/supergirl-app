import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { sendOtp, verifyOtp } from '../services/authService';
import { saveUserToFirestore } from '../services/userService';

export function PhoneEntryScreen({ onLogin }: { onLogin: () => void }) {
  const dispatch     = useDispatch();
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (phone.length < 10) return Alert.alert('Enter a valid 10-digit number');
    setLoading(true);
    try {
      await sendOtp('+91' + phone);
      setStep('otp');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  }

  // Dev-only: enter the app without OTP (useful in Expo Go, where the native
  // phone-auth module isn't available, and for quick UI testing). Signs in
  // with a local mock user — never shown in production builds (__DEV__ gate).
  function handleDevSkip() {
    const num = phone.length >= 10 ? phone : '9999999999';
    dispatch(loginSuccess({
      id: 'dev_' + num,
      phone: num,
      name: '',
      countryCode: '+91',
      createdAt: new Date().toISOString(),
      isVerified: true,
    }));
    onLogin();
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) return Alert.alert('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const user = await verifyOtp(otp);
      await saveUserToFirestore(user.uid, phone);
      dispatch(loginSuccess({
        id: user.uid, phone, name: '',
        countryCode: '+91',
        createdAt: new Date().toISOString(),
        isVerified: true,
      }));
      onLogin();
    } catch (e: any) {
      Alert.alert('Wrong OTP', 'Please try again.');
    }
    setLoading(false);
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>
        {step === 'phone' ? '📱 Enter your number' : '🔐 Enter OTP'}
      </Text>
      <Text style={s.sub}>
        {step === 'phone' ? "We'll send a verification code" : `Code sent to +91 ${phone}`}
      </Text>

      {step === 'phone' ? (
        <View style={s.row}>
          <Text style={s.prefix}>+91</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="9876543210"
          />
        </View>
      ) : (
        <TextInput
          style={[s.input, s.otp]}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="• • • • • •"
        />
      )}

      <TouchableOpacity
        style={s.btn}
        onPress={step === 'phone' ? handleSendOtp : handleVerifyOtp}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>
              {step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
            </Text>
        }
      </TouchableOpacity>

      {step === 'otp' && (
        <TouchableOpacity onPress={() => setStep('phone')} style={{ marginTop: 16 }}>
          <Text style={{ color: '#2979FF', textAlign: 'center' }}>← Change number</Text>
        </TouchableOpacity>
      )}

      {/* Dev-only shortcut: skip OTP and enter the app directly. */}
      {__DEV__ && (
        <TouchableOpacity onPress={handleDevSkip} style={{ marginTop: 20 }}>
          <Text style={{ color: '#888', textAlign: 'center' }}>Skip OTP · Enter (dev)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, padding:28, justifyContent:'center', backgroundColor:'#fff' },
  title:  { fontSize:26, fontWeight:'700', marginBottom:8 },
  sub:    { fontSize:14, color:'#888', marginBottom:32 },
  row:    { flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#ddd', borderRadius:10, paddingHorizontal:14, marginBottom:20 },
  prefix: { fontSize:16, color:'#333', marginRight:8 },
  input:  { flex:1, fontSize:18, paddingVertical:14 },
  otp:    { borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:14, fontSize:28, letterSpacing:10, textAlign:'center', marginBottom:20 },
  btn:    { backgroundColor:'#2979FF', padding:16, borderRadius:12, alignItems:'center' },
  btnText:{ color:'#fff', fontSize:16, fontWeight:'700' },
});