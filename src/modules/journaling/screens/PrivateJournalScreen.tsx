import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView }            from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState }               from '../../../store';
import { lockVault }               from '../store/journalSlice';
import { MOOD_OPTIONS, MOOD_BG, JOURNAL_THEMES, JournalEntry } from '../types';
import { PrivateStackParamList }   from '../../../navigation/PrivateNavigator';

const C    = { blue:'#2979FF', white:'#FFFFFF', bg:'#F5F5F5', black:'#111111', grey:'#888888', lgrey:'#CCCCCC' };
const F    = 'DMSans-Regular';
const FB   = 'DMSans-Bold';

function MoodCircle({ mood, size=36 }:{ mood:string; size?:number }) {
  const opt = MOOD_OPTIONS.find(m=>m.value===mood);
  return (
    <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:MOOD_BG(mood as any),alignItems:'center',justifyContent:'center'}}>
      <Text style={{fontSize:size*0.48}}>{opt?.emoji??'😊'}</Text>
    </View>
  );
}

function EntryCard({ entry, onPress }:{ entry:JournalEntry; onPress:()=>void }) {
  const date  = new Date(entry.createdAt);
  const day   = date.getDate();
  const month = date.toLocaleString('en',{month:'short'});
  const suffix = new Date().toDateString()===date.toDateString()?' · Today':
                 new Date(Date.now()-86400000).toDateString()===date.toDateString()?' · Yesterday':'';
  const time  = date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false});
  const th    = JOURNAL_THEMES.find(t=>t.id===entry.theme)??JOURNAL_THEMES[0];
  return (
    <TouchableOpacity style={[s.card,{backgroundColor:th.card}]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <View style={{flexDirection:'row',alignItems:'baseline',gap:4}}>
          <Text style={[s.cardDay,{color:th.accent,fontFamily:FB}]}>{day}</Text>
          <Text style={[s.cardMon,{fontFamily:F}]}>{month}{suffix}</Text>
        </View>
        <MoodCircle mood={entry.mood}/>
      </View>
      {!!entry.title&&<Text style={[s.cardTitle,{color:entry.textColor,fontFamily:FB}]}>{entry.title}</Text>}
      <Text style={[s.cardBody,{fontFamily:F}]} numberOfLines={3}>{entry.body}</Text>
      {entry.tags.length>0&&(
        <View style={s.tagsRow}>
          {entry.tags.slice(0,3).map(t=>(
            <View key={t} style={[s.tagChip,{backgroundColor:th.accent+'20'}]}>
              <Text style={[s.tagTxt,{color:th.accent,fontFamily:F}]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
      {entry.mediaUrls.length>0&&(
        <View style={s.mediaRow}>
          {entry.mediaUrls.slice(0,2).map((u,i)=><Image key={i} source={{uri:u}} style={s.thumb}/>)}
        </View>
      )}
      <Text style={[s.cardTime,{fontFamily:F}]}>{time}</Text>
    </TouchableOpacity>
  );
}

export function PrivateJournalScreen() {
  const dispatch   = useDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<PrivateStackParamList>>();
  const allEntries = useSelector((s:RootState)=>s.journal.entries);
  const entries    = useMemo(()=>allEntries.filter(e=>e.isPrivate),[allEntries]);
  const now        = new Date();
  const vaultUnlocked = useSelector((s:RootState)=>s.journal.vaultUnlocked);

  useFocusEffect(useCallback(()=>{
    if(!vaultUnlocked){ navigation.replace('PrivateVault'); }
    return ()=>{ dispatch(lockVault()); };
  },[vaultUnlocked]));

  const handleLock = () => {
    dispatch(lockVault());
    navigation.replace('PrivateVault');
  };

  const goHome = () => {
    dispatch(lockVault());
    // Navigate to the main tab navigator Home tab
    navigation.getParent?.()?.getParent?.()?.navigate?.('Home' as never);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.titleWrap}>
          <Text style={[s.headerTitle,{fontFamily:FB}]}>Private Journal</Text>
          <View style={s.privBadge}><Text style={[s.privBadgeT,{fontFamily:F}]}>🔒 Secure</Text></View>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          <TouchableOpacity style={s.iconBtn} onPress={()=>navigation.navigate('ChangePIN')}>
            <Text style={{fontSize:18}}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleLock}>
            <Text style={{fontSize:18}}>🔒</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month row */}
      <View style={s.monthRow}>
        <Text style={[s.monthTxt,{fontFamily:F}]}>{now.toLocaleString('en',{month:'short'})}</Text>
        <Text style={[s.yearTxt,{fontFamily:F}]}>{now.getFullYear()}</Text>
      </View>

      {/* Entry list */}
      <ScrollView showsVerticalScrollIndicator={false} style={{flex:1}}>
        {entries.length===0
          ?<View style={s.empty}>
              <Text style={{fontSize:52,marginBottom:14}}>🔒</Text>
              <Text style={[s.emptyTitle,{fontFamily:FB}]}>No private entries yet</Text>
              <Text style={[s.emptySub,{fontFamily:F}]}>Write an entry and enable the Private toggle to see it here</Text>
              <TouchableOpacity style={s.writeBtn} onPress={()=>{/* FAB handles this */}}>
                <Text style={[s.writeBtnT,{fontFamily:FB}]}>+ Write Private Entry</Text>
              </TouchableOpacity>
            </View>
          :entries.map(e=>(
              <EntryCard key={e.id} entry={e}
                onPress={()=>(navigation.getParent?.() as any)?.navigate('Home', {screen:'EntryDetail',params:{entryId:e.id}})}/>
            ))
        }
        <View style={{height:100}}/>
      </ScrollView>

      {/* FAB */}
      {/* <TouchableOpacity
        style={s.fab}
        onPress={()=>(navigation.getParent?.() as any)?.navigate('Home', {screen:'WriteEntry',params:{}})}
        activeOpacity={0.85}>
        <Text style={s.fabTxt}>+</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.bg },
  header:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingTop:8, paddingBottom:10 },
  homeBtn:    { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:7, backgroundColor:'#E3EEFF', borderRadius:12 },
  homeBtnT:   { fontSize:13, color:C.blue },
  titleWrap:  { alignItems:'center', gap:4 },
  headerTitle:{ fontSize:18, color:C.black },
  privBadge:  { backgroundColor:'#F3E5F5', borderRadius:10, paddingHorizontal:8, paddingVertical:2 },
  privBadgeT: { fontSize:11, color:'#7B1FA2' },
  iconBtn:    { width:40, height:40, backgroundColor:C.white, borderRadius:10, alignItems:'center', justifyContent:'center' },
  monthRow:   { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, marginBottom:6 },
  monthTxt:   { fontSize:13, color:C.grey }, yearTxt:{ fontSize:13, color:C.grey },
  card:       { marginHorizontal:14, marginBottom:12, borderRadius:18, padding:16, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3 },
  cardTop:    { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  cardDay:    { fontSize:32, lineHeight:36 }, cardMon:{ fontSize:14, color:C.black },
  cardTitle:  { fontSize:16, marginBottom:5 }, cardBody:{ fontSize:14, color:C.grey, lineHeight:21 },
  cardTime:   { fontSize:12, color:C.lgrey, textAlign:'right', marginTop:8 },
  tagsRow:    { flexDirection:'row', gap:6, marginTop:8, flexWrap:'wrap' },
  tagChip:    { paddingHorizontal:8, paddingVertical:3, borderRadius:12 }, tagTxt:{ fontSize:11 },
  mediaRow:   { flexDirection:'row', gap:8, marginTop:10 }, thumb:{ width:100, height:80, borderRadius:10 },
  empty:      { alignItems:'center', paddingTop:60, paddingHorizontal:32, gap:10 },
  emptyTitle: { fontSize:18, color:C.black },
  emptySub:   { fontSize:14, color:C.grey, textAlign:'center', lineHeight:22 },
  writeBtn:   { marginTop:8, backgroundColor:'#E3EEFF', borderRadius:20, paddingHorizontal:20, paddingVertical:10 },
  writeBtnT:  { fontSize:14, color:C.blue },
  fab:        { position:'absolute', bottom:24, alignSelf:'center', width:58, height:58, borderRadius:29, backgroundColor:C.blue, alignItems:'center', justifyContent:'center', shadowColor:C.blue, shadowOffset:{width:0,height:8}, shadowOpacity:0.45, shadowRadius:14, elevation:10 },
  fabTxt:     { fontSize:32, color:C.white, fontWeight:'300', lineHeight:38 },
});
