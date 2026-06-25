// SecurityVerifyScreen — shown after PIN, answers 1 or 2 security questions
import React,{useState} from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {PrivateStackParamList} from '../../../navigation/PrivateNavigator';

const C={blue:'#2979FF',bg:'#F2F2F7',white:'#FFFFFF',black:'#111111',grey:'#666',lgrey:'#CCCCCC',red:'#EF5350'};

export function SecurityQuestionScreen() {
  const navigation=useNavigation<NativeStackNavigationProp<PrivateStackParamList>>();
  const q1=useSelector((s:RootState)=>s.journal.securityQuestion1);
  const a1=useSelector((s:RootState)=>s.journal.securityAnswer1);
  const q2=useSelector((s:RootState)=>s.journal.securityQuestion2);
  const a2=useSelector((s:RootState)=>s.journal.securityAnswer2);
  const [step,setStep]=useState(1);
  const [ans1,setAns1]=useState('');
  const [ans2,setAns2]=useState('');
  const [error,setError]=useState('');

  if(!q1){navigation.replace('PrivateJournal');return null;}

  const handleVerify=()=>{
    if(step===1){
      if(ans1.trim().toLowerCase()===a1){
        setError('');
        if(q2)setStep(2);else navigation.replace('PrivateJournal');
      } else setError('Incorrect answer. Please try again.');
    } else {
      if(ans2.trim().toLowerCase()===a2)navigation.replace('PrivateJournal');
      else setError('Incorrect answer. Please try again.');
    }
  };

  const currentQ=step===1?q1:q2;
  const currentA=step===1?ans1:ans2;
  const setAnswer=step===1?setAns1:setAns2;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.iconWrap}><View style={s.ring2}><View style={s.ring1}><View style={s.iconCircle}><Text style={s.icon}>🛡️</Text></View></View></View></View>
          {q2&&<View style={s.stepRow}><View style={[s.stepDot,s.stepDotActive]}/><View style={[s.stepDot,step===2&&s.stepDotActive]}/></View>}
          <Text style={s.title}>Security Check</Text>
          <Text style={s.desc}>{q2?`Question ${step} of 2`:'Answer your security question to continue.'}</Text>
          <View style={s.questionBox}><Text style={s.questionTxt}>{currentQ}</Text></View>
          <View style={s.answerBox}>
            <Text style={s.answerLabel}>Your Answer</Text>
            <TextInput style={s.answerInput} placeholder="Type your answer..." placeholderTextColor={C.lgrey} value={currentA} onChangeText={v=>{setAnswer(v);setError('');}} autoCapitalize="none" returnKeyType="done" secureTextEntry/>
          </View>
          {!!error&&<Text style={s.errorTxt}>{error}</Text>}
          <TouchableOpacity style={[s.actionBtn,!currentA.trim()&&s.actionBtnDisabled]} onPress={handleVerify} disabled={!currentA.trim()}>
            <Text style={s.actionBtnTxt}>{step===1&&q2?'Next →':'Unlock Journal'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>navigation.navigate('PrivateVault')} style={{marginTop:8}}><Text style={s.backTxt}>← Back to PIN</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  inner:{alignItems:'center',padding:24,paddingTop:40,gap:16},
  iconWrap:{alignItems:'center'},
  ring2:{width:110,height:110,borderRadius:55,backgroundColor:'#DCE6FF',alignItems:'center',justifyContent:'center'},
  ring1:{width:82,height:82,borderRadius:41,backgroundColor:'#C4D4FF',alignItems:'center',justifyContent:'center'},
  iconCircle:{width:62,height:62,borderRadius:31,backgroundColor:C.blue,alignItems:'center',justifyContent:'center'},
  icon:{fontSize:28},
  stepRow:{flexDirection:'row',gap:8},stepDot:{width:8,height:8,borderRadius:4,backgroundColor:C.lgrey},stepDotActive:{backgroundColor:C.blue},
  title:{fontSize:22,fontWeight:'800',color:C.black,textAlign:'center'},
  desc:{fontSize:14,color:C.grey,textAlign:'center'},
  questionBox:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:16,borderWidth:1,borderColor:'#E0E0E0'},
  questionTxt:{fontSize:15,color:C.black,lineHeight:22,fontWeight:'500'},
  answerBox:{width:'100%',backgroundColor:C.white,borderRadius:14,padding:14,borderWidth:1,borderColor:'#E0E0E0'},
  answerLabel:{fontSize:12,fontWeight:'600',color:C.grey,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6},
  answerInput:{fontSize:16,color:C.black,paddingVertical:4},
  errorTxt:{fontSize:13,color:C.red,fontWeight:'500',textAlign:'center'},
  actionBtn:{width:'100%',backgroundColor:C.blue,borderRadius:14,paddingVertical:16,alignItems:'center'},
  actionBtnDisabled:{backgroundColor:C.lgrey},actionBtnTxt:{fontSize:16,fontWeight:'600',color:C.white},
  backTxt:{fontSize:14,color:C.grey},
});
