import React,{useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert,Vibration} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSelector,useDispatch} from 'react-redux';
import {RootState} from '../../../store';
import {setVaultPin,setSecurityQuestions} from '../store/journalSlice';
import {PrivateStackParamList} from '../../../navigation/PrivateNavigator';
import {saveVaultData} from '../services/journalDbService';
import {SECURITY_QUESTIONS} from '../types';
import DropdownIcon from '../../../../assets/DropdownIcon';

const C={blue:'#2979FF',bg:'#F2F2F7',white:'#FFFFFF',black:'#111111',grey:'#666',lgrey:'#CCCCCC',red:'#EF5350',green:'#4CAF50'};
const KEYS=['1','2','3','4','5','6','7','8','9','.','0','⌫'];
type Step='current'|'new'|'confirm'|'security';

export function ChangePINScreen() {
  const dispatch=useDispatch();
  const navigation=useNavigation<NativeStackNavigationProp<PrivateStackParamList>>();
  const storedPin=useSelector((s:RootState)=>s.journal.vaultPin);
  const userId=useSelector((s:RootState)=>s.auth.user?.id);
  const [step,setStep]=useState<Step>('current');
  const [pin,setPin]=useState('');
  const [newPin,setNewPin]=useState('');
  const [shake,setShake]=useState(false);
  const [error,setError]=useState('');
  const [selQ1,setSelQ1]=useState('');[selQ1,setSelQ1];
  const [ans1,setAns1]=useState('');
  const [selQ2,setSelQ2]=useState('');
  const [ans2,setAns2]=useState('');
  const [showQ1,setShowQ1]=useState(false);
  const [showQ2,setShowQ2]=useState(false);
  const stepIndex=['current','new','confirm','security'].indexOf(step);

  const wrong=(msg:string)=>{Vibration.vibrate(300);setShake(true);setError(msg);setTimeout(()=>{setPin('');setShake(false);},700);};

  const handleKey=(key:string)=>{
    if(key==='⌫'){setPin(p=>p.slice(0,-1));setError('');return;}
    if(key==='.')return;
    const next=pin+key;setPin(next);setError('');
    if(next.length===4){
      setTimeout(()=>{
        if(step==='current'){if(next===storedPin){setPin('');setStep('new');}else wrong('Incorrect current PIN.');}
        else if(step==='new'){setNewPin(next);setPin('');setStep('confirm');}
        else if(step==='confirm'){
          if(next===newPin){dispatch(setVaultPin(next));setPin('');setStep('security');}
          else{wrong("PINs don't match.");setStep('new');setNewPin('');}
        }
      },100);
    }
  };

  const handleSaveSecurity=()=>{
    if(!selQ1||ans1.trim().length<2){Alert.alert('Required','Please select question 1 and provide an answer.');return;}
    dispatch(setSecurityQuestions({q1:selQ1,a1:ans1,q2:selQ2,a2:ans2}));
    if(userId) saveVaultData(userId,{pin:newPin,q1:selQ1,a1:ans1.toLowerCase().trim(),q2:selQ2,a2:ans2.toLowerCase().trim()}).catch(e=>console.error('saveVaultData failed:',e));
    Alert.alert('✅ Done!','PIN and security questions saved.',[{text:'OK',onPress:()=>navigation.replace('PrivateJournal')}]);
  };

  const cfgs:Record<Step,{title:string;sub:string;icon:string}>={
    current:{title:'Change PIN',sub:'Enter your current PIN',icon:'🔒'},
    new:{title:'New PIN',sub:'Enter your new 4-digit PIN',icon:'🔑'},
    confirm:{title:'Confirm PIN',sub:'Re-enter your new PIN',icon:'🔑'},
    security:{title:'Security Questions',sub:'Set questions to recover your PIN',icon:'🛡️'},
  };
  const cfg=cfgs[step];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}><Text style={s.backArrow}>←</Text></TouchableOpacity>
        <Text style={s.topTitle}>Security Settings</Text>
        <View style={{width:40}}/>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.stepDots}>{[0,1,2,3].map(i=><View key={i} style={[s.stepDot,i<=stepIndex&&s.stepDotActive]}/>)}</View>
          <View style={s.iconWrap}><View style={s.ring2}><View style={s.ring1}><View style={s.iconCircle}><Text style={s.icon}>{cfg.icon}</Text></View></View></View></View>
          <Text style={s.title}>{cfg.title}</Text>
          <Text style={s.desc}>{cfg.sub}</Text>

          {step!=='security'&&(
            <>
              <View style={[s.dotsRow,shake&&s.dotsShake]}>{Array.from({length:4},(_,i)=><View key={i} style={[s.dot,i<pin.length&&s.dotFilled]}>{i<pin.length&&<Text style={s.dotStar}>*</Text>}</View>)}</View>
              {!!error&&<Text style={s.errorTxt}>{error}</Text>}
              <View style={s.keypad}>
                {KEYS.map((key,i)=>(
                  <TouchableOpacity key={i} style={[s.key,key==='.'&&s.keyEmpty]} onPress={()=>handleKey(key)} disabled={key==='.'}>
                    {key==='⌫'?<Text style={s.keyBackspace}>⌫</Text>:<Text style={[s.keyTxt,key==='.'&&{color:'transparent'}]}>{key}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step==='security'&&(
            <>
              <View style={s.successBanner}><Text style={s.successTxt}>✅ PIN changed!</Text></View>
              <Text style={s.qTitle}>Security Question 1 (Required)</Text>
              <TouchableOpacity style={s.questionBtn} onPress={()=>setShowQ1(v=>!v)}>
                <Text style={selQ1?s.questionTxt:s.questionPlaceholder} numberOfLines={2}>{selQ1||'Select a question...'}</Text>
                <DropdownIcon style={{marginLeft:6}}/>
              </TouchableOpacity>
              {showQ1&&<View style={s.dropdown}>{SECURITY_QUESTIONS.filter(q=>q!==selQ2).map(q=><TouchableOpacity key={q} style={[s.dropItem,selQ1===q&&s.dropItemActive]} onPress={()=>{setSelQ1(q);setShowQ1(false);}}><Text style={[s.dropTxt,selQ1===q&&{color:C.blue}]}>{q}</Text></TouchableOpacity>)}</View>}
              <View style={s.answerBox}><Text style={s.answerLabel}>Answer</Text><TextInput style={s.answerInput} placeholder="Type your answer..." placeholderTextColor={C.lgrey} value={ans1} onChangeText={setAns1} autoCapitalize="none"/></View>

              <Text style={s.qTitle}>Security Question 2 (Optional)</Text>
              <TouchableOpacity style={s.questionBtn} onPress={()=>setShowQ2(v=>!v)}>
                <Text style={selQ2?s.questionTxt:s.questionPlaceholder} numberOfLines={2}>{selQ2||'Select a question...'}</Text>
                <DropdownIcon style={{marginLeft:6}}/>
              </TouchableOpacity>
              {showQ2&&<View style={s.dropdown}>{SECURITY_QUESTIONS.filter(q=>q!==selQ1).map(q=><TouchableOpacity key={q} style={[s.dropItem,selQ2===q&&s.dropItemActive]} onPress={()=>{setSelQ2(q);setShowQ2(false);}}><Text style={[s.dropTxt,selQ2===q&&{color:C.blue}]}>{q}</Text></TouchableOpacity>)}</View>}
              {selQ2&&<View style={s.answerBox}><Text style={s.answerLabel}>Answer</Text><TextInput style={s.answerInput} placeholder="Type your answer..." placeholderTextColor={C.lgrey} value={ans2} onChangeText={setAns2} autoCapitalize="none"/></View>}

              <TouchableOpacity style={[s.actionBtn,(!selQ1||ans1.trim().length<2)&&s.actionBtnDisabled]} onPress={handleSaveSecurity} disabled={!selQ1||ans1.trim().length<2}>
                <Text style={s.actionBtnTxt}>Save & Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>navigation.replace('PrivateJournal')} style={{marginTop:4}}><Text style={s.skipTxt}>Skip for now</Text></TouchableOpacity>
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
  inner:{alignItems:'center',paddingHorizontal:20,paddingTop:16,gap:14,paddingBottom:40},
  stepDots:{flexDirection:'row',gap:8},stepDot:{width:8,height:8,borderRadius:4,backgroundColor:C.lgrey},stepDotActive:{backgroundColor:C.blue},
  iconWrap:{alignItems:'center'},
  ring2:{width:100,height:100,borderRadius:50,backgroundColor:'#DCE6FF',alignItems:'center',justifyContent:'center'},
  ring1:{width:76,height:76,borderRadius:38,backgroundColor:'#C4D4FF',alignItems:'center',justifyContent:'center'},
  iconCircle:{width:58,height:58,borderRadius:29,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},
  icon:{fontSize:24},title:{fontSize:22,fontWeight:'800',color:C.black,textAlign:'center'},
  desc:{fontSize:14,color:C.grey,textAlign:'center',lineHeight:20},
  dotsRow:{flexDirection:'row',gap:12},dotsShake:{opacity:0.2},
  dot:{width:50,height:50,borderRadius:12,borderWidth:1.5,borderColor:C.lgrey,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},
  dotStar:{color:C.blue,fontSize:28,lineHeight:32,fontWeight:'700'},
  dotFilled:{backgroundColor:'#E8EEFF',borderColor:C.blue},
  errorTxt:{fontSize:13,color:C.red,fontWeight:'500',textAlign:'center'},
  keypad:{flexDirection:'row',flexWrap:'wrap',width:312,gap:10},
  key:{width:96,height:56,backgroundColor:C.white,borderRadius:14,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:4,elevation:1},
  keyEmpty:{backgroundColor:'transparent',shadowOpacity:0,elevation:0},keyTxt:{fontSize:22,fontWeight:'500',color:C.black},keyBackspace:{fontSize:20,color:'#555'},
  successBanner:{width:'100%',backgroundColor:'#E8F5E9',borderRadius:12,padding:12},successTxt:{fontSize:15,fontWeight:'600',color:C.green,textAlign:'center'},
  qTitle:{width:'100%',fontSize:13,fontWeight:'700',color:C.black,marginBottom:-6},
  questionBtn:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:'#E0E0E0'},
  questionTxt:{fontSize:14,color:C.black,flex:1,lineHeight:20},questionPlaceholder:{fontSize:14,color:C.lgrey,flex:1},questionCaret:{fontSize:14,color:C.grey},
  dropdown:{width:'100%',backgroundColor:C.white,borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:'#E0E0E0',maxHeight:220},
  dropItem:{padding:14,borderBottomWidth:0.5,borderBottomColor:'#F0F0F0'},dropItemActive:{backgroundColor:'#EEF2FF'},
  dropTxt:{fontSize:14,color:C.black,lineHeight:20},
  answerBox:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:14,borderWidth:1,borderColor:'#E0E0E0'},
  answerLabel:{fontSize:11,fontWeight:'700',color:C.grey,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6},
  answerInput:{fontSize:15,color:C.black,paddingVertical:4},
  actionBtn:{width:'100%',backgroundColor:C.blue,borderRadius:14,paddingVertical:16,alignItems:'center'},
  actionBtnDisabled:{backgroundColor:C.lgrey},actionBtnTxt:{fontSize:16,fontWeight:'600',color:C.white},
  skipTxt:{fontSize:14,color:C.grey,textDecorationLine:'underline'},
});
