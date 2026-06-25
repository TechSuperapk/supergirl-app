import React,{useMemo} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {JournalStackParamList} from '../../../navigation/JournalNavigator';
import {MOOD_OPTIONS} from '../types';

type Props=NativeStackScreenProps<JournalStackParamList,'Stats'>;
const C={blue:'#2979FF',white:'#FFFFFF',bg:'#F5F5F5',black:'#111111',grey:'#888888'};

export function StatsScreen({navigation}:Props) {
  const entries=useSelector((s:RootState)=>s.journal.entries);
  const stats=useMemo(()=>{
    const total=entries.length;
    const totalWords=entries.reduce((s,e)=>s+e.body.split(' ').filter(Boolean).length,0);
    const avgWords=total?Math.round(totalWords/total):0;
    const moodCounts:Record<string,number>={};
    entries.forEach(e=>{moodCounts[e.mood]=(moodCounts[e.mood]??0)+1;});
    const happyCount=(moodCounts['happy']??0)+(moodCounts['loved']??0)+(moodCounts['calm']??0)+(moodCounts['grateful']??0)+(moodCounts['excited']??0);
    const happyPct=total?Math.round((happyCount/total)*100):0;
    let streak=0;const dateSet=new Set(entries.map(e=>e.createdAt.slice(0,10)));
    const check=new Date();check.setHours(0,0,0,0);
    while(dateSet.has(check.toISOString().slice(0,10))){streak++;check.setDate(check.getDate()-1);}
    return{total,avgWords,happyPct,streak,moodCounts};
  },[entries]);
  const moodBars=MOOD_OPTIONS.map(o=>({...o,count:stats.moodCounts[o.value]??0})).filter(m=>m.count>0).sort((a,b)=>b.count-a.count);
  const maxMood=moodBars[0]?.count??1;
  const pixels=useMemo(()=>{const cells=[];const today=new Date();today.setHours(0,0,0,0);for(let i=90;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const key=d.toISOString().slice(0,10);const de=entries.filter(e=>e.createdAt.startsWith(key));const color=de[0]?.mood?(MOOD_OPTIONS.find(m=>m.value===de[0].mood)?.color??'#F5EDE4'):'#F0ECE8';cells.push({key,color});}return cells;},[entries]);
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={{width:60}}><Text style={s.backTxt}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Your Insights</Text><View style={{width:60}}/>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Overview</Text>
        <View style={s.cardGrid}>
          {[{num:stats.streak.toString(),label:'🔥 Day streak'},{num:stats.total.toString(),label:'📝 Total entries'},{num:stats.avgWords.toString(),label:'📖 Avg. words'},{num:`${stats.happyPct}%`,label:'😊 Happy days'}].map(c=>(
            <View key={c.label} style={s.statCard}><Text style={s.statNum}>{c.num}</Text><Text style={s.statLabel}>{c.label}</Text></View>
          ))}
        </View>
        {moodBars.length>0&&<>
          <Text style={s.sectionLabel}>Mood Breakdown</Text>
          <View style={s.barsBox}>{moodBars.map(m=><View key={m.value} style={s.barRow}><Text style={s.barEmoji}>{m.emoji}</Text><View style={s.barBg}><View style={[s.barFill,{width:`${(m.count/maxMood)*100}%` as any,backgroundColor:m.color}]}/></View><Text style={s.barCount}>{m.count}</Text></View>)}</View>
        </>}
        <Text style={s.sectionLabel}>Last 91 Days</Text>
        <View style={s.pixelGrid}>{pixels.map(cell=><View key={cell.key} style={[s.pixelCell,{backgroundColor:cell.color}]}/>)}</View>
        <View style={{height:40}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#E0E0E0'},
  backTxt:{fontSize:14,color:C.blue,fontWeight:'500'},headerTitle:{fontSize:16,fontWeight:'600',color:C.black},
  sectionLabel:{fontSize:11,fontWeight:'600',color:C.grey,letterSpacing:0.6,textTransform:'uppercase',paddingHorizontal:20,paddingTop:20,paddingBottom:8},
  cardGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,paddingHorizontal:16},
  statCard:{width:'47%',backgroundColor:C.white,borderRadius:14,borderWidth:0.5,borderColor:'#EAE0D8',padding:14},
  statNum:{fontSize:26,fontWeight:'700',color:C.blue},statLabel:{fontSize:12,color:C.grey,marginTop:2},
  barsBox:{paddingHorizontal:20,gap:10},
  barRow:{flexDirection:'row',alignItems:'center',gap:10},barEmoji:{fontSize:18,width:26},
  barBg:{flex:1,height:10,backgroundColor:'#F5EDE4',borderRadius:20,overflow:'hidden'},barFill:{height:'100%',borderRadius:20},
  barCount:{fontSize:12,color:C.grey,minWidth:20,textAlign:'right'},
  pixelGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:16,gap:3},
  pixelCell:{width:`${(1/13)*100-0.5}%` as any,aspectRatio:1,borderRadius:3},
});
