import React,{useState,useMemo} from 'react';
import {View,Text,TouchableOpacity,ScrollView,StyleSheet,Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {RootState} from '../../../store';
import {MOOD_OPTIONS,MOOD_BG,JOURNAL_THEMES,JournalEntry} from '../types';

const C={blue:'#2979FF',white:'#FFFFFF',bg:'#FFFFFF',black:'#111111',grey:'#888888',lgrey:'#CCCCCC',orange:'#FFA726'};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HDRS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FONT='DMSans-Regular';
const FONT_BOLD='DMSans-Bold';

function MoodCircle({mood,size=36}:{mood:string;size?:number}) {
  const opt=MOOD_OPTIONS.find(m=>m.value===mood);
  return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:MOOD_BG(mood as any),alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:size*0.48}}>{opt?.emoji??'😊'}</Text></View>;
}

export function CalendarScreen({navigation:navProp}:{navigation?:any}) {
  // Support both stack navigation and direct usage as tab
  const navigation = navProp ?? useNavigation<any>();
  const allEntries=useSelector((s:RootState)=>s.journal.entries);
  const entries=useMemo(()=>allEntries.filter(e=>!e.isPrivate&&!e.isDraft),[allEntries]);
  const today=new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [selDay,setSelDay]=useState<number>(today.getDate());

  const entryMap=useMemo(()=>{
    const map:Record<string,JournalEntry[]>={};
    entries.forEach(e=>{
      const d=new Date(e.createdAt);
      if(d.getFullYear()===year&&d.getMonth()===month){
        const k=d.getDate().toString();
        if(!map[k])map[k]=[];
        map[k].push(e);
      }
    });
    return map;
  },[entries,year,month]);

  const offset=(new Date(year,month,1).getDay()+6)%7;
  const daysInMon=new Date(year,month+1,0).getDate();
  const daysInPrev=new Date(year,month,0).getDate();
  const trailing=(7-((offset+daysInMon)%7))%7;
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);setSelDay(1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);setSelDay(1);};
  const isToday=(d:number)=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
  const selEntries=selDay?(entryMap[selDay.toString()]??[]):[];
  const moodCounts:Record<string,number>={};
  entries.forEach(e=>{moodCounts[e.mood]=(moodCounts[e.mood]??0)+1;});
  const topMood=Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]??'happy';
  const topMoodOpt=MOOD_OPTIONS.find(m=>m.value===topMood);

  const openEntry = (e: JournalEntry) => {
    try {
      navigation.navigate('EntryDetail',{entryId:e.id});
    } catch {
      try {
        navigation.navigate('Home',{screen:'EntryDetail',params:{entryId:e.id}});
      } catch {
        (navigation as any).navigate('EntryDetail',{entryId:e.id});
      }
    }
  };

  const writeEntry = () => {
    try { navigation.navigate('WriteEntry',{}); }
    catch { navigation.navigate('Home',{screen:'WriteEntry',params:{}}); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.headerTitle,{fontFamily:FONT_BOLD}]}>Calendar</Text>
          <Text style={[s.headerSub,{fontFamily:FONT}]}>Reflection for {MONTHS[month]} {year}</Text>
        </View>
        <View style={s.monthNav}>
          <Text style={[s.monthTitle,{fontFamily:FONT_BOLD}]}>{MONTHS[month]}  {year}</Text>
          <View style={{flexDirection:'row',gap:4}}>
            <TouchableOpacity onPress={prevMonth} style={s.arrowBtn}><Text style={s.arrow}>‹</Text></TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={s.arrowBtn}><Text style={s.arrow}>›</Text></TouchableOpacity>
          </View>
        </View>
        <View style={s.dayHdrs}>{DAY_HDRS.map(d=><Text key={d} style={[s.dayHdr,{fontFamily:FONT}]}>{d}</Text>)}</View>
        <View style={s.grid}>
          {Array.from({length:offset},(_,i)=><View key={`p${i}`} style={s.cell}><Text style={[s.cellFaded,{fontFamily:FONT}]}>{daysInPrev-offset+i+1}</Text></View>)}
          {Array.from({length:daysInMon},(_,i)=>i+1).map(d=>{
            const hasEntry=!!entryMap[d.toString()];
            const tod=isToday(d);const sel=selDay===d&&!tod;
            const dayMood=entryMap[d.toString()]?.[0]?.mood;
            return (
              <TouchableOpacity key={d} style={s.cell} onPress={()=>setSelDay(d)}>
                <View style={[s.dayInner,tod&&s.todayCircle,sel&&s.selCircle]}>
                  <Text style={[s.cellText,{fontFamily:FONT},tod&&s.cellToday,sel&&s.cellSel]}>{String(d).padStart(2,'0')}</Text>
                </View>
                {hasEntry&&!tod&&<View style={[s.entryDot,{backgroundColor:dayMood?MOOD_BG(dayMood as any):C.blue}]}/>}
              </TouchableOpacity>
            );
          })}
          {Array.from({length:trailing},(_,i)=><View key={`n${i}`} style={s.cell}><Text style={[s.cellFaded,{fontFamily:FONT}]}>{String(i+1).padStart(2,'0')}</Text></View>)}
        </View>
        {selDay&&<Text style={[s.selLabel,{fontFamily:FONT_BOLD}]}>{new Date(year,month,selDay).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</Text>}
        <Text style={[s.sectionTitle,{fontFamily:FONT_BOLD}]}>Journals {selEntries.length>0?`(${selEntries.length})`:''}</Text>
        {selEntries.length===0
          ?<View style={s.noEntries}>
              <Text style={{fontSize:36,marginBottom:10}}>📅</Text>
              <Text style={[s.noEntriesTxt,{fontFamily:FONT}]}>No journals for this day</Text>
              <TouchableOpacity style={s.addBtn} onPress={writeEntry}>
                <Text style={[s.addBtnTxt,{fontFamily:FONT_BOLD}]}>+ Write for this day</Text>
              </TouchableOpacity>
            </View>
          :selEntries.map(e=>{
              const date=new Date(e.createdAt);
              const time=date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false});
              const th=JOURNAL_THEMES.find(t=>t.id===e.theme)??JOURNAL_THEMES[0];
              return (
                <TouchableOpacity key={e.id} style={[s.jCard,{backgroundColor:th.card}]} onPress={()=>openEntry(e)}>
                  <View style={s.jTop}><Text style={[s.jTime,{fontFamily:FONT}]}>{time}</Text><MoodCircle mood={e.mood}/></View>
                  {!!e.title&&<Text style={[s.jTitle,{color:e.textColor,fontFamily:FONT_BOLD}]}>{e.title}</Text>}
                  <Text style={[s.jBody,{fontFamily:FONT}]} numberOfLines={3}>{e.body}</Text>
                  {e.stickers.length>0&&<Text style={{fontSize:18,marginTop:6}}>{e.stickers.slice(0,5).join(' ')}</Text>}
                  {e.mediaUrls.length>0&&<View style={s.mediaRow}>{e.mediaUrls.slice(0,2).map((u:string,i:number)=><Image key={i} source={{uri:u}} style={s.thumb}/>)}</View>}
                </TouchableOpacity>
              );
            })
        }
        <View style={{height:100}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  header:{paddingHorizontal:16,paddingTop:12,paddingBottom:4},
  headerTitle:{fontSize:26,color:C.black},
  headerSub:{fontSize:13,color:C.grey,marginTop:2},
  monthNav:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingTop:18,paddingBottom:10},
  monthTitle:{fontSize:18,color:C.black},
  arrowBtn:{padding:6},arrow:{fontSize:24,color:C.grey},
  dayHdrs:{flexDirection:'row',paddingHorizontal:12,marginBottom:4},
  dayHdr:{flex:1,textAlign:'center',fontSize:13,color:C.grey},
  grid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12,marginBottom:6},
  cell:{width:`${100/7}%` as any,alignItems:'center',paddingVertical:6},
  dayInner:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  cellText:{fontSize:14,color:C.black},
  cellFaded:{fontSize:14,color:C.lgrey},
  cellToday:{color:C.white,fontFamily:'DMSans-Bold'},cellSel:{color:C.blue,fontFamily:'DMSans-Bold'},
  todayCircle:{backgroundColor:C.blue},selCircle:{backgroundColor:'#E3EEFF'},
  entryDot:{width:5,height:5,borderRadius:3,marginTop:2},
  selLabel:{textAlign:'center',fontSize:15,color:C.blue,marginBottom:14},
  sectionTitle:{fontSize:18,color:C.black,paddingHorizontal:16,marginTop:4,marginBottom:12},
  jCard:{marginHorizontal:14,marginBottom:12,borderRadius:16,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  jTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  jTime:{fontSize:13,color:C.grey},jTitle:{fontSize:16,marginBottom:5},jBody:{fontSize:14,color:C.grey,lineHeight:21},
  mediaRow:{flexDirection:'row',gap:8,marginTop:10},thumb:{width:90,height:72,borderRadius:10},
  noEntries:{alignItems:'center',paddingVertical:30},noEntriesTxt:{fontSize:14,color:C.lgrey,marginBottom:12},
  addBtn:{backgroundColor:'#E3EEFF',borderRadius:20,paddingHorizontal:18,paddingVertical:9},addBtnTxt:{fontSize:14,color:C.blue},
});
