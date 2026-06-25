import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { SafeAreaView }            from 'react-native-safe-area-context';
import { useNavigation }            from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState }               from '../../../store';
import { unlockVault, setVaultPin, setSecurityQuestions } from '../store/journalSlice';
import { PrivateStackParamList }   from '../../../navigation/PrivateNavigator';
import { saveVaultData } from '../services/journalDbService';

const C  = { blue:'#2979FF', bg:'#F2F2F7', white:'#FFFFFF', black:'#111111', grey:'#888888' };
const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';
const KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

const SEC_QUESTIONS = [
  "What was your first pet's name?",
  "What city were you born in?",
  "What's your mother's maiden name?",
  "What was your first school's name?",
  "What is your favourite book?",
];

type Phase = 'enter'|'setup_pin'|'confirm_pin'|'setup_q1'|'setup_q2';

export function PrivateVaultScreen() {
  const dispatch    = useDispatch();
  const navigation  = useNavigation<NativeStackNavigationProp<PrivateStackParamList>>();
  const storedPin   = useSelector((s:RootState)=>s.journal.vaultPin);
  const userId      = useSelector((s:RootState)=>s.auth.user?.id);
  const hasPin      = storedPin !== '1234';  // default pin means not yet set up
  const hasQ        = useSelector((s:RootState)=>!!s.journal.securityQuestion1);

  const [phase, setPhase]     = useState<Phase>(hasPin ? 'enter' : 'setup_pin');
  // If a stored PIN arrives from the database while we're still on first-run
  // setup, switch to the enter screen (returning user on a new device/session).
  useEffect(() => { if (hasPin && phase === 'setup_pin') setPhase('enter'); }, [hasPin]);
  const [pin, setPin]         = useState('');
  const [newPin, setNewPin]   = useState('');
  const [shake, setShake]     = useState(false);
  const [error, setError]     = useState('');
  const [q1, setQ1]           = useState('');
  const [a1, setA1]           = useState('');
  const [q2, setQ2]           = useState('');
  const [a2, setA2]           = useState('');
  const [selQ, setSelQ]       = useState(0);
  const [inputA, setInputA]   = useState('');
  const [showQPicker, setShowQPicker] = useState(false);
  const [secQ, setSecQ]       = useState(SEC_QUESTIONS[0]);

  const wrongPin = () => {
    Vibration.vibrate(300);
    setShake(true);
    setError('Wrong PIN. Try again.');
    setTimeout(()=>{ setPin(''); setShake(false); setError(''); }, 700);
  };

  const handleKey = useCallback((key: string) => {
    if (key==='⌫') { setPin(p=>p.slice(0,-1)); setError(''); return; }
    if (key==='.') return;
    const next = pin + key;
    setPin(next);
    setError('');
    if (next.length !== 4) return;

    if (phase === 'enter') {
      if (next === storedPin) {
        dispatch(unlockVault());
        navigation.replace('PrivateJournal');
      } else {
        wrongPin();
      }
    } else if (phase === 'setup_pin') {
      setNewPin(next);
      setPin('');
      setPhase('confirm_pin');
    } else if (phase === 'confirm_pin') {
      if (next === newPin) {
        dispatch(setVaultPin(newPin));
        if (userId) saveVaultData(userId, { pin: newPin });
        setPin('');
        setPhase('setup_q1');
      } else {
        setError("PINs don't match. Try again.");
        setPin('');
      }
    }
  }, [pin, phase, storedPin, newPin, dispatch, navigation]);

  const saveQ1 = () => {
    if (!inputA.trim()) { Alert.alert('Please enter an answer'); return; }
    setQ1(secQ); setA1(inputA.trim()); setInputA(''); setSelQ(1);
    setSecQ(SEC_QUESTIONS.find((q,i)=>i!==SEC_QUESTIONS.indexOf(secQ))??SEC_QUESTIONS[1]);
    setPhase('setup_q2');
  };

  const saveQ2 = () => {
    if (!inputA.trim()) { Alert.alert('Please enter an answer'); return; }
    dispatch(setSecurityQuestions({ q1, a1, q2:secQ, a2:inputA.trim() }));
    if (userId) saveVaultData(userId, { q1, a1: a1.toLowerCase().trim(), q2: secQ, a2: inputA.toLowerCase().trim() });
    dispatch(unlockVault());
    navigation.replace('PrivateJournal');
  };

  const phaseTitle = () => {
    if (phase==='setup_pin')    return 'Create Your PIN';
    if (phase==='confirm_pin')  return 'Confirm Your PIN';
    return 'Private Vault';
  };
  const phaseDesc = () => {
    if (phase==='setup_pin')   return 'Choose a 4-digit PIN to protect your private journal';
    if (phase==='confirm_pin') return 'Enter the same PIN again to confirm';
    return 'Enter your 4-digit PIN to unlock';
  };

  // ── Security question setup ─────────────────────────────────────────────────
  if (phase === 'setup_q1' || phase === 'setup_q2') {
    const qNum = phase === 'setup_q1' ? 1 : 2;
    const save = phase === 'setup_q1' ? saveQ1 : saveQ2;
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.inner}>
          <Text style={{fontSize:42,marginBottom:8}}>🛡️</Text>
          <Text style={[s.title,{fontFamily:FB}]}>Security Question {qNum}</Text>
          <Text style={[s.desc,{fontFamily:F}]}>This helps you recover access if you forget your PIN</Text>

          <TouchableOpacity style={s.questionBtn} onPress={()=>setShowQPicker(v=>!v)}>
            <Text style={[s.questionBtnT,{fontFamily:F}]} numberOfLines={2}>{secQ}</Text>
            <Text style={{fontSize:16}}>▾</Text>
          </TouchableOpacity>

          {showQPicker && (
            <View style={s.qDropdown}>
              {SEC_QUESTIONS.map((q,i)=>(
                <TouchableOpacity key={i} style={s.qItem} onPress={()=>{ setSecQ(q); setShowQPicker(false); }}>
                  <Text style={[s.qItemT,{fontFamily:F}]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.answerInput}>
            <Text style={[s.answerLabel,{fontFamily:F}]}>Your Answer</Text>
            <TextInput
              style={[s.answerRow,{fontFamily:F,fontSize:16,color:'#111'}]}
              value={inputA}
              onChangeText={setInputA}
              placeholder="Type your answer..."
              placeholderTextColor="#AAAAAA"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity style={[s.btn,{backgroundColor:C.blue}]} onPress={save}>
            <Text style={[s.btnT,{fontFamily:FB}]}>{phase==='setup_q1'?'Next →':'Finish Setup'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PIN entry / setup ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.inner}>
        <View style={s.iconWrap}>
          <View style={s.ring2}><View style={s.ring1}>
            <View style={s.iconCircle}><Text style={{fontSize:32}}>🔒</Text></View>
          </View></View>
        </View>
        <Text style={[s.title,{fontFamily:FB}]}>{phaseTitle()}</Text>
        <Text style={[s.desc,{fontFamily:F}]}>{phaseDesc()}</Text>

        <View style={[s.dotsRow, shake&&s.shake]}>
          {Array.from({length:4},(_,i)=>(
            <View key={i} style={[s.dot, i<pin.length&&{backgroundColor:C.blue,borderColor:C.blue}]}>{i<pin.length && <Text style={s.dotStar}>*</Text>}</View>
          ))}
        </View>
        {!!error&&<Text style={[s.err,{fontFamily:F}]}>{error}</Text>}

        <View style={s.keypad}>
          {KEYS.map((key,i)=>(
            <TouchableOpacity key={i} style={[s.key, key==='.'&&s.keyEmpty]}
              onPress={()=>handleKey(key)} disabled={key==='.'} activeOpacity={0.7}>
              {key==='⌫'
                ?<Text style={[s.keyBack,{fontFamily:F}]}>⌫</Text>
                :<Text style={[s.keyTxt,{fontFamily:FB}, key==='.'&&{color:'transparent'}]}>{key}</Text>
              }
            </TouchableOpacity>
          ))}
        </View>

        {phase==='enter'&&(
          <TouchableOpacity onPress={()=>navigation.navigate('ForgotPIN')}>
            <Text style={[s.forgot,{fontFamily:F}]}>Forgot PIN?</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.bg },
  inner:      { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:28, gap:16 },
  iconWrap:   { marginBottom:8 },
  ring2:      { width:100, height:100, borderRadius:50, backgroundColor:'rgba(41,121,255,0.08)', alignItems:'center', justifyContent:'center' },
  ring1:      { width:78, height:78, borderRadius:39, backgroundColor:'rgba(41,121,255,0.15)', alignItems:'center', justifyContent:'center' },
  iconCircle: { width:58, height:58, borderRadius:29, backgroundColor:C.blue, alignItems:'center', justifyContent:'center' },
  title:      { fontSize:26, color:C.black, textAlign:'center' },
  desc:       { fontSize:14, color:C.grey, textAlign:'center', lineHeight:21, marginBottom:8 },
  dotsRow:    { flexDirection:'row', gap:16, marginVertical:8 },
  shake:      { transform:[{translateX:10}] },
  dot:        { width:52, height:52, borderRadius:12, borderWidth:1.5, borderColor:'#DDD', backgroundColor:'#F5F5F5', alignItems:'center', justifyContent:'center' },
  dotStar:    { color:'#FFFFFF', fontSize:30, lineHeight:34, fontFamily:FB },
  err:        { fontSize:13, color:'#EF5350' },
  keypad:     { flexDirection:'row', flexWrap:'wrap', width:280, gap:12 },
  key:        { width:(280-24)/3, height:58, backgroundColor:C.white, borderRadius:14, alignItems:'center', justifyContent:'center',
                shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  keyEmpty:   { opacity:0 },
  keyTxt:     { fontSize:24, color:C.black },
  keyBack:    { fontSize:20, color:C.grey },
  forgot:     { fontSize:15, color:C.blue, marginTop:8 },
  // Security question styles
  questionBtn:   { width:'100%', flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderColor:'#E0E0E0', borderRadius:14, paddingHorizontal:16, paddingVertical:14, backgroundColor:'#FAFAFA', gap:8 },
  questionBtnT:  { flex:1, fontSize:14, color:'#111' },
  qDropdown:     { width:'100%', borderWidth:1, borderColor:'#E0E0E0', borderRadius:12, backgroundColor:C.white, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:8, elevation:5 },
  qItem:         { paddingHorizontal:16, paddingVertical:12, borderBottomWidth:0.5, borderBottomColor:'#F0F0F0' },
  qItemT:        { fontSize:14, color:'#111' },
  answerInput:   { width:'100%', gap:8 },
  answerLabel:   { fontSize:13, color:'#555' },
  answerRow:     { borderWidth:1.5, borderColor:'#E0E0E0', borderRadius:14, paddingHorizontal:16, paddingVertical:14, backgroundColor:'#FAFAFA', minHeight:50 },
  answerTxt:     { fontSize:16, color:'#111' },
  keypadSmall:   { flexDirection:'row', flexWrap:'wrap', gap:6 },
  charKey:       { width:36, height:36, borderRadius:8, backgroundColor:'#F0F0F0', alignItems:'center', justifyContent:'center' },
  btn:           { width:'100%', borderRadius:50, paddingVertical:16, alignItems:'center' },
  btnT:          { fontSize:16, color:C.white },
});
