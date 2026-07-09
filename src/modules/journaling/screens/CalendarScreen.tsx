import React,{useState,useMemo,useCallback} from 'react';
import {View,Text,TouchableOpacity,ScrollView,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation,useFocusEffect} from '@react-navigation/native';
import {RootState} from '../../../store';
import {MOOD_BG,JournalEntry} from '../types';
import {QuickNoteRecord,loadNotes,stripHtml} from '../quickNotesStore';
import CalendarLogo from '../../../../assets/images/CalenderTopLogo';
import {RecentEntryCard} from '../components/home';
import {NoteCard,NoteCardData} from '../components/list';

const C={blue:'#2979FF',white:'#FFFFFF',bg:'#FFFFFF',black:'#111111',grey:'#888888',lgrey:'#CCCCCC',orange:'#FFA726'};
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HDRS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FONT='DMSans-Regular';
const FONT_BOLD='DMSans-Bold';
// Journal hashtags (#Birthday, #ImportantDay — auto-detected from the entry
// body, same mechanism as the editor's "Auto-tagged" chips) get their own
// dot colour on the calendar grid, matching the legend below it.
const HASHTAG_COLORS:Record<string,string>={birthday:'#Fcc707',importantday:'#fc5d07'};
const TODAY_DOT='#000000';

export function CalendarScreen({navigation:navProp}:{navigation?:any}) {
  const navigation = navProp ?? useNavigation<any>();
  const allEntries=useSelector((s:RootState)=>s.journal.entries);
  const entries=useMemo(()=>allEntries.filter(e=>!e.isPrivate&&!e.isDraft),[allEntries]);
  const [notes,setNotes]=useState<QuickNoteRecord[]>([]);
  useFocusEffect(useCallback(()=>{let a=true;loadNotes().then(l=>{if(a)setNotes(l);});return()=>{a=false;};},[]));

  const today=new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [selDay,setSelDay]=useState<number>(today.getDate());

  const entryMap=useMemo(()=>{
    const map:Record<string,JournalEntry[]>={};
    entries.forEach(e=>{const d=new Date(e.createdAt);if(d.getFullYear()===year&&d.getMonth()===month){const k=d.getDate().toString();(map[k]=map[k]||[]).push(e);}});
    return map;
  },[entries,year,month]);

  // Days with an entry pinned via the Hashtags tool's "Pin to Calendar"
  // switch (entry.isImportant) get a star marker instead of the plain mood dot.
  const importantDays=useMemo(()=>{
    const set=new Set<string>();
    Object.entries(entryMap).forEach(([day,es])=>{ if(es.some(e=>e.isImportant)) set.add(day); });
    return set;
  },[entryMap]);

  const noteMap=useMemo(()=>{
    const map:Record<string,QuickNoteRecord[]>={};
    notes.forEach(n=>{const d=new Date(n.updatedAt);if(d.getFullYear()===year&&d.getMonth()===month){const k=d.getDate().toString();(map[k]=map[k]||[]).push(n);}});
    return map;
  },[notes,year,month]);

  const offset=(new Date(year,month,1).getDay()+6)%7;
  const daysInMon=new Date(year,month+1,0).getDate();
  const daysInPrev=new Date(year,month,0).getDate();
  const trailing=(7-((offset+daysInMon)%7))%7;
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);setSelDay(1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);setSelDay(1);};
  const isToday=(d:number)=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
  const selEntries=selDay?(entryMap[selDay.toString()]??[]):[];
  const selNotes=selDay?(noteMap[selDay.toString()]??[]):[];

  const openEntry=(e:JournalEntry)=>{ try{navigation.navigate('EntryDetail',{entryId:e.id});}catch{navigation.navigate('Home',{screen:'EntryDetail',params:{entryId:e.id}});} };
  const openNote=(n:QuickNoteRecord)=>{ try{navigation.navigate('NoteEditor',{noteId:n.id});}catch{navigation.navigate('Home',{screen:'NoteEditor',params:{noteId:n.id}});} };
  const writeEntry=()=>{ try{navigation.navigate('WriteEntry',{});}catch{navigation.navigate('Home',{screen:'WriteEntry',params:{}});} };

  // Same mapper QuickNotesScreen uses, so a note looks identical here.
  const toCard=(n:QuickNoteRecord):NoteCardData=>({
    id:n.id,title:n.title,body:stripHtml(n.body),tag:n.tag,
    checklist:n.checklist?.length?{done:n.checklist.filter(i=>i.done).length,total:n.checklist.length}:undefined,
  });

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
            const hasEntry=!!entryMap[d.toString()];const hasNote=!!noteMap[d.toString()];
            const tod=isToday(d);const sel=selDay===d&&!tod;
            const dayMood=entryMap[d.toString()]?.[0]?.mood;
            const isImportant=importantDays.has(d.toString());
            // Checks both the auto-detected #hashtags (from typing "#Birthday"
            // in the body) and the manually-added tags (from the Hashtags
            // tool's suggestions), lowercased, so either way of tagging an
            // entry "Birthday"/"ImportantDay" colours its calendar dot.
            const dayTags=(entryMap[d.toString()]??[]).flatMap(e=>[...(e.detectedHashtags??[]),...(e.tags??[])].map(t=>t.toLowerCase()));
            const dotColor=tod?TODAY_DOT
              :dayTags.includes('birthday')?HASHTAG_COLORS.birthday
              :dayTags.includes('importantday')?HASHTAG_COLORS.importantday
              :(dayMood?MOOD_BG(dayMood as any):C.blue);
            return (
              <TouchableOpacity key={d} style={s.cell} onPress={()=>setSelDay(d)}>
                <View style={[s.dayInner,tod&&s.todayCircle,sel&&s.selCircle]}>
                  <Text style={[s.cellText,{fontFamily:FONT},tod&&s.cellToday,sel&&s.cellSel]}>{String(d).padStart(2,'0')}</Text>
                  {isImportant&&<Text style={s.starBadge}>⭐</Text>}
                </View>
                {(hasEntry||hasNote)&&!isImportant&&<View style={[s.entryDot,{backgroundColor:dotColor}]}/>}
              </TouchableOpacity>
            );
          })}
          {Array.from({length:trailing},(_,i)=><View key={`n${i}`} style={s.cell}><Text style={[s.cellFaded,{fontFamily:FONT}]}>{String(i+1).padStart(2,'0')}</Text></View>)}
        </View>

        {/* Legend for the day dots above — Today is always black; Birthday/
            ImportantDay match the #hashtag colours used on the entry cards
            below. */}
        <View style={s.legendRow}>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:TODAY_DOT}]}/><Text style={[s.legendText,{fontFamily:FONT}]}>Today</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:HASHTAG_COLORS.birthday}]}/><Text style={[s.legendText,{fontFamily:FONT}]}>Birthday</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:HASHTAG_COLORS.importantday}]}/><Text style={[s.legendText,{fontFamily:FONT}]}>ImportantDay</Text></View>
        </View>

        <Text style={[s.sectionTitle,{fontFamily:FONT_BOLD}]}>Journals {selEntries.length>0?`(${selEntries.length})`:''}</Text>
        {selEntries.length===0
          ?<View style={s.noEntries}>
              <CalendarLogo width={40} height={43} style={{marginBottom:8}} />
              <Text style={[s.noEntriesTxt,{fontFamily:FONT}]}>No journals for this day</Text>
              <TouchableOpacity style={s.addBtn} onPress={writeEntry}><Text style={[s.addBtnTxt,{fontFamily:FONT_BOLD}]}>+ Write for this day</Text></TouchableOpacity>
            </View>
          // Same card component the Journal list itself uses, so an entry
          // opened from the Calendar looks identical (type icon, mode pill,
          // mood, title, body, media thumbnails, tag pill, time — all of it).
          :selEntries.map(e=><RecentEntryCard key={e.id} entry={e} onPress={()=>openEntry(e)}/>)
        }

        <Text style={[s.sectionTitle,{fontFamily:FONT_BOLD}]}>Notes {selNotes.length>0?`(${selNotes.length})`:''}</Text>
        {selNotes.length===0
          ?<Text style={[s.noNotes,{fontFamily:FONT}]}>No notes for this day</Text>
          // Same card component the Notes list itself uses (title, tag chip,
          // checklist progress, body preview).
          :selNotes.map(n=><NoteCard key={n.id} note={toCard(n)} onPress={()=>openNote(n)}/>)
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
  dayInner:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',position:'relative'},
  cellText:{fontSize:14,color:C.black},
  starBadge:{position:'absolute',top:-6,right:-4,fontSize:11},
  cellFaded:{fontSize:14,color:C.lgrey},
  cellToday:{color:C.white,fontFamily:'DMSans-Bold'},cellSel:{color:C.blue,fontFamily:'DMSans-Bold'},
  todayCircle:{backgroundColor:TODAY_DOT},selCircle:{backgroundColor:'#E3EEFF'},
  entryDot:{width:5,height:5,borderRadius:3,marginTop:2},
  legendRow:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:16,marginBottom:14},
  legendItem:{flexDirection:'row',alignItems:'center',gap:6},
  legendDot:{width:8,height:8,borderRadius:4},
  legendText:{fontSize:12,color:C.grey},
  sectionTitle:{fontSize:18,color:C.black,paddingHorizontal:16,marginTop:8,marginBottom:12},
  noEntries:{alignItems:'center',paddingVertical:20},noEntriesTxt:{fontSize:14,color:C.lgrey,marginBottom:12},
  addBtn:{backgroundColor:'#E3EEFF',borderRadius:20,paddingHorizontal:18,paddingVertical:9},addBtnTxt:{fontSize:14,color:C.blue},
  noNotes:{textAlign:'center',fontSize:14,color:C.lgrey,paddingVertical:10,marginBottom:8},
});
