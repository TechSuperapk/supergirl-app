import React,{useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Vibration} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSelector,useDispatch} from 'react-redux';
import {RootState} from '../../../store';
import {setVaultPin} from '../store/journalSlice';
import {PrivateStackParamList} from '../../../navigation/PrivateNavigator';

const C={blue:'#2979FF',bg:'#F2F2F7',white:'#FFFFFF',black:'#111111',grey:'#666',lgrey:'#CCCCCC',red:'#EF5350',green:'#4CAF50'};
const KEYS=['1','2','3','4','5','6','7','8','9','.','0','⌫'];
type Step='verify_q1'|'verify_q2'|'new_pin'|'confirm_pin'|'success';

export function ForgotPINScreen() {
  const dispatch=useDispatch();
  const navigation=useNavigation<NativeStackNavigationProp<PrivateStackParamList>>();
  const q1=useSelector((s:RootState)=>s.journal.securityQuestion1);
  const a1=useSelector((s:RootState)=>s.journal.securityAnswer1);
  const q2=useSelector((s:RootState)=>s.journal.securityQuestion2);
  const a2=useSelector((s:RootState)=>s.journal.securityAnswer2);
  const [step,setStep]=useState<Step>('verify_q1');
  const [ans1,setAns1]=useState('');[ans1,setAns1];
  const [ans2,setAns2]=useState('');
  const [newPin,setNewPin]=useState('');
  const [confPin,setConfPin]=useState('');
  const [shake,setShake]=useState(false);
  const [error,setError]=useState('');

  const wrong=(msg:string)=>{Vibration.vibrate(300);setShake(true);setError(msg);setTimeout(()=>setShake(false),600);};

  const handleVerify=()=>{
    if(step==='verify_q1'){if(ans1.trim().toLowerCase()===a1){setError('');setStep(q2?'verify_q2':'new_pin');}else wrong('Incorrect answer.');}
    else if(step==='verify_q2'){if(ans2.trim().toLowerCase()===a2){setError('');setStep('new_pin');}else wrong('Incorrect answer.');}
  };

  const handlePINKey=(key:string)=>{
    if(key==='⌫'){if(step==='new_pin')setNewPin(p=>p.slice(0,-1));else setConfPin(p=>p.slice(0,-1));setError('');return;}
    if(key==='.')return;
    if(step==='new_pin'){const next=newPin+key;setNewPin(next);if(next.length===4)setTimeout(()=>setStep('confirm_pin'),100);}
    else if(step==='confirm_pin'){
      const next=confPin+key;setConfPin(next);
      if(next.length===4){setTimeout(()=>{
        if(next===newPin){dispatch(setVaultPin(next));setStep('success');}
        else{Vibration.vibrate(300);setShake(true);setError("PINs don't match.");setConfPin('');setTimeout(()=>setShake(false),600);}
      },100);}
    }
  };

  const stepIcons:Record<Step,string>={verify_q1:'🛡️',verify_q2:'🛡️',new_pin:'🔑',confirm_pin:'🔑',success:'✅'};
  const stepTitles:Record<Step,string>={verify_q1:'Reset PIN',verify_q2:'One More Step',new_pin:'Create New PIN',confirm_pin:'Confirm New PIN',success:'PIN Changed! 🎉'};
  const stepSubs:Record<Step,string>={verify_q1:'Answer your first security question',verify_q2:'Answer your second security question',new_pin:'Enter your new 4-digit PIN',confirm_pin:'Re-enter your new PIN',success:'Your new PIN has been set successfully.'};
  const currentPIN=step==='new_pin'?newPin:confPin;
  const totalSteps=q2?4:3;
  const stepNum=['verify_q1','verify_q2','new_pin','confirm_pin','success'].indexOf(step);

  if(!q1)return(
    <SafeAreaView style={s.safe}>
      <View style={s.inner}>
        <Text style={s.title}>No security questions set</Text>
        <Text style={s.desc}>Please contact support to reset your PIN.</Text>
        <TouchableOpacity style={s.actionBtn} onPress={()=>navigation.navigate('PrivateVault')}><Text style={s.actionBtnTxt}>← Back to PIN</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={()=>navigation.navigate('PrivateVault')} style={s.backBtn}><Text style={s.backArrow}>←</Text></TouchableOpacity>
        <Text style={s.topTitle}>Forgot PIN</Text>
        <View style={{width:40}}/>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.stepDots}>{Array.from({length:totalSteps},(_,i)=><View key={i} style={[s.stepDot,i<=stepNum&&s.stepDotActive]}/>)}</View>
          <View style={s.iconWrap}><View style={s.ring2}><View style={s.ring1}><View style={s.iconCircle}><Text style={s.icon}>{stepIcons[step]}</Text></View></View></View></View>
          <Text style={s.title}>{stepTitles[step]}</Text>
          <Text style={s.desc}>{stepSubs[step]}</Text>

          {step==='success'&&(
            <>
              <View style={s.successCard}><Text style={s.successTxt}>✅ PIN changed successfully!</Text><Text style={s.successSub}>You can now use your new PIN to access your private journal.</Text></View>
              <TouchableOpacity style={s.actionBtn} onPress={()=>navigation.replace('PrivateVault')}><Text style={s.actionBtnTxt}>Go to Login →</Text></TouchableOpacity>
            </>
          )}

          {(step==='verify_q1'||step==='verify_q2')&&(
            <>
              <View style={s.questionBox}><Text style={s.questionLbl}>Security Question</Text><Text style={s.questionTxt}>{step==='verify_q1'?q1:q2}</Text></View>
              <View style={[s.answerBox,shake&&s.answerBoxShake]}>
                <Text style={s.answerLabel}>Your Answer</Text>
                <TextInput style={s.answerInput} placeholder="Type your answer..." placeholderTextColor={C.lgrey} value={step==='verify_q1'?ans1:ans2} onChangeText={step==='verify_q1'?v=>{setAns1(v);setError('');}:v=>{setAns2(v);setError('');}} autoCapitalize="none" returnKeyType="done" secureTextEntry autoFocus/>
              </View>
              {!!error&&<Text style={s.errorTxt}>{error}</Text>}
              <TouchableOpacity style={[s.actionBtn,!(step==='verify_q1'?ans1:ans2).trim()&&s.actionBtnDisabled]} onPress={handleVerify} disabled={!(step==='verify_q1'?ans1:ans2).trim()}>
                <Text style={s.actionBtnTxt}>{step==='verify_q2'||!q2?'Verify & Continue':'Next →'}</Text>
              </TouchableOpacity>
            </>
          )}

          {(step==='new_pin'||step==='confirm_pin')&&(
            <>
              <View style={[s.dotsRow,shake&&s.dotsShake]}>{Array.from({length:4},(_,i)=><View key={i} style={[s.dot,i<currentPIN.length&&s.dotFilled]}/>)}</View>
              {!!error&&<Text style={s.errorTxt}>{error}</Text>}
              <View style={s.keypad}>
                {KEYS.map((key,i)=>(
                  <TouchableOpacity key={i} style={[s.key,key==='.'&&s.keyEmpty]} onPress={()=>handlePINKey(key)} disabled={key==='.'} activeOpacity={0.7}>
                    {key==='⌫'?<Text style={s.keyBackspace}>⌫</Text>:<Text style={[s.keyTxt,key==='.'&&{color:'transparent'}]}>{key}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  topBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12},
  backBtn:{width:40,height:40,alignItems:'center',justifyContent:'center'},backArrow:{fontSize:22,color:C.black},
  topTitle:{fontSize:17,fontWeight:'600',color:C.black},
  inner:{alignItems:'center',paddingHorizontal:20,paddingTop:16,gap:16,paddingBottom:40},
  stepDots:{flexDirection:'row',gap:8},stepDot:{width:8,height:8,borderRadius:4,backgroundColor:C.lgrey},stepDotActive:{backgroundColor:C.blue},
  iconWrap:{alignItems:'center'},
  ring2:{width:110,height:110,borderRadius:55,backgroundColor:'#DCE6FF',alignItems:'center',justifyContent:'center'},
  ring1:{width:82,height:82,borderRadius:41,backgroundColor:'#C4D4FF',alignItems:'center',justifyContent:'center'},
  iconCircle:{width:62,height:62,borderRadius:31,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},
  icon:{fontSize:28},title:{fontSize:22,fontWeight:'800',color:C.black,textAlign:'center'},
  desc:{fontSize:14,color:C.grey,textAlign:'center',lineHeight:20},
  questionBox:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:16,borderWidth:1,borderColor:'#E0E0E0'},
  questionLbl:{fontSize:11,fontWeight:'700',color:C.grey,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6},
  questionTxt:{fontSize:15,color:C.black,lineHeight:22,fontWeight:'500'},
  answerBox:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:14,borderWidth:1,borderColor:'#E0E0E0'},
  answerBoxShake:{borderColor:C.red},
  answerLabel:{fontSize:12,fontWeight:'600',color:C.grey,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6},
  answerInput:{fontSize:16,color:C.black,paddingVertical:4},
  errorTxt:{fontSize:13,color:C.red,fontWeight:'500',textAlign:'center'},
  actionBtn:{width:'100%',backgroundColor:C.blue,borderRadius:14,paddingVertical:16,alignItems:'center'},
  actionBtnDisabled:{backgroundColor:C.lgrey},actionBtnTxt:{fontSize:16,fontWeight:'600',color:C.white},
  successCard:{width:'100%',backgroundColor:'#E8F5E9',borderRadius:14,padding:16},
  successTxt:{fontSize:16,fontWeight:'700',color:C.green,marginBottom:8},successSub:{fontSize:14,color:'#2E7D32',lineHeight:20},
  dotsRow:{flexDirection:'row',gap:14},dotsShake:{opacity:0.2},
  dot:{width:52,height:52,borderRadius:12,borderWidth:1.5,borderColor:C.lgrey,backgroundColor:C.white},
  dotFilled:{backgroundColor:'#E8EEFF',borderColor:C.blue},
  keypad:{flexDirection:'row',flexWrap:'wrap',width:312,gap:10},
  key:{width:96,height:58,backgroundColor:C.white,borderRadius:14,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:4,elevation:1},
  keyEmpty:{backgroundColor:'transparent',shadowOpacity:0,elevation:0},keyTxt:{fontSize:22,fontWeight:'500',color:C.black},keyBackspace:{fontSize:20,color:'#555'},
});
