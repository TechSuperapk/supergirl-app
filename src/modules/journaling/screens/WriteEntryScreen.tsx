import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, Dimensions, Image, Modal,
  PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { SafeAreaView }            from 'react-native-safe-area-context';
import { NativeStackScreenProps }  from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as ImagePicker             from 'expo-image-picker';
import Svg, { Path as SvgPath, Line as SvgLine } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { RootState }               from '../../../store';
import { addEntry, updateEntry, saveDraft, deleteDraft } from '../store/journalSlice';
import type { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { saveJournalEntry, saveDraftToFirestore, deleteDraftFromFirestore } from '../services/journalDbService';
import { uploadFileToFirebase } from '../../../services/storageService';
import { useOfflineJournal } from '../offline/useOfflineJournal';
import { ActivityIndicator } from 'react-native';
import {
  JournalEntry, Mood, JournalTheme, StickerPlacement,
  MOOD_OPTIONS, JOURNAL_THEMES, FONT_SIZES, TEXT_COLORS,
  detectHashtags,
} from '../types';
import { STICKER_ASSETS } from '../stickers';
import { StickerGlyph } from '../components/StickerGlyph';
import PhotoIcon    from '../components/PhotoIcon';
import MicLogo      from '../components/MicLogo';
import ScribleLogo  from '../components/ScribleLogo';
import StickerLogo  from '../components/StickerLogo';
import TextLogo     from '../components/TextLogo';
import VideoLogo    from '../components/VideoLogo';
import ThemeLogo    from '../components/ThemeLogo';
import PrivateLogo  from '../components/PrivateLogo';
import PinLogo       from '../components/PinLogo';
import CheckLogo     from '../components/CheckLogo';
import { VoiceWidget, RecordingWidget } from '../components/VoiceWidgets';

type Props = NativeStackScreenProps<JournalStackParamList, 'WriteEntry'>;
const { width: SW, height: SH } = Dimensions.get('window');
type Panel = 'none'|'mood'|'theme'|'textStyle'|'sticker'|'calendar';
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HDRS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';

// ── Inline hashtag highlight ──────────────────────────────────────────────────
function HighlightedText({ text, color, fs, accent }:{text:string;color:string;fs:number;accent:string}) {
  if (!text) return null;
  return (
    <Text style={{color,fontSize:fs,fontFamily:F,lineHeight:fs*1.65}}>
      {text.split(/(#\w+)/g).map((p,i) =>
        /^#\w+$/.test(p)
          ? <Text key={i} style={{color:accent,fontFamily:FB,backgroundColor:accent+'20'}}>{p}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────────
function FullCalendar({selDate,onSelect,accent}:{selDate:Date;onSelect:(d:Date)=>void;accent:string}) {
  const [yr,setYr]=useState(selDate.getFullYear());
  const [mo,setMo]=useState(selDate.getMonth());
  const today=new Date();
  const off=(new Date(yr,mo,1).getDay()+6)%7;
  const days=new Date(yr,mo+1,0).getDate();
  const tail=(7-((off+days)%7))%7;
  return (
    <View style={cal.wrap}>
      <View style={cal.nav}>
        <TouchableOpacity onPress={()=>mo===0?(setMo(11),setYr(y=>y-1)):setMo(m=>m-1)} style={cal.arr}><Text style={cal.arrT}>‹</Text></TouchableOpacity>
        <Text style={[cal.title,{fontFamily:FB}]}>{MONTHS[mo]} {yr}</Text>
        <TouchableOpacity onPress={()=>mo===11?(setMo(0),setYr(y=>y+1)):setMo(m=>m+1)} style={cal.arr}><Text style={cal.arrT}>›</Text></TouchableOpacity>
      </View>
      <View style={cal.hdrs}>{DAY_HDRS.map(h=><Text key={h} style={[cal.hdr,{fontFamily:F}]}>{h}</Text>)}</View>
      <View style={cal.grid}>
        {Array.from({length:off},(_,i)=><View key={`p${i}`} style={cal.cell}/>)}
        {Array.from({length:days},(_,i)=>{
          const d=i+1,isTod=d===today.getDate()&&mo===today.getMonth()&&yr===today.getFullYear();
          const isSel=d===selDate.getDate()&&mo===selDate.getMonth()&&yr===selDate.getFullYear();
          return (
            <TouchableOpacity key={d} style={cal.cell} onPress={()=>onSelect(new Date(yr,mo,d))}>
              <View style={[cal.day,isTod&&{backgroundColor:accent},isSel&&!isTod&&{backgroundColor:accent+'30'}]}>
                <Text style={[cal.dayT,{fontFamily:F},isTod&&{color:'#FFF',fontFamily:FB},isSel&&!isTod&&{color:accent,fontFamily:FB}]}>{d}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {Array.from({length:tail},(_,i)=><View key={`n${i}`} style={cal.cell}/>)}
      </View>
    </View>
  );
}

// ── Sticker — saves absolute position on release ──────────────────────────────
function Sticker({sp,onCommit,onDelete,setActive,setArmed,setOverTrash}:{sp:StickerPlacement;onCommit:(id:string,x:number,y:number,scale:number)=>void;onDelete:(id:string)=>void;setActive:(v:boolean)=>void;setArmed:(v:boolean)=>void;setOverTrash:(v:boolean)=>void}) {
  const tx=useSharedValue(sp.x), ty=useSharedValue(sp.y), sc=useSharedValue(sp.scale??1);
  const ox=useSharedValue(0), oy=useSharedValue(0), os=useSharedValue(1);
  const count=useSharedValue(0);
  const armed=useSharedValue(0);
  const begin=()=>{ 'worklet'; count.value+=1; if(count.value===1) runOnJS(setActive)(true); };
  const finalize=()=>{ 'worklet'; count.value-=1; if(count.value<=0){ count.value=0; runOnJS(setActive)(false); runOnJS(setOverTrash)(false); } };
  // Hold ~0.7s to grab (arm delete); the sticker lifts and the trash appears.
  const hold=Gesture.LongPress().minDuration(700).maxDistance(18)
    .onStart(()=>{ armed.value=1; runOnJS(setArmed)(true); });
  // quick tap on an armed sticker cancels delete mode
  const tap=Gesture.Tap().maxDuration(300)
    .onEnd(()=>{ if(armed.value===1){ armed.value=0; runOnJS(setArmed)(false); runOnJS(setOverTrash)(false); } });
  // 1-finger drag — reposition; once armed, drop on the trash to delete
  const pan=Gesture.Pan().maxPointers(1)
    .onBegin(begin)
    .onStart(()=>{ ox.value=tx.value; oy.value=ty.value; })
    .onUpdate(e=>{ tx.value=ox.value+e.translationX; ty.value=oy.value+e.translationY; if(armed.value===1){ runOnJS(setOverTrash)(e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW/2) < 90); } })
    .onEnd(e=>{ if(armed.value===1 && e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW/2) < 90){ armed.value=0; runOnJS(onDelete)(sp.id); runOnJS(setArmed)(false); } else { runOnJS(onCommit)(sp.id,tx.value,ty.value,sc.value); } runOnJS(setOverTrash)(false); })
    .onFinalize(finalize);
  // 2-finger pinch to resize
  const pinch=Gesture.Pinch()
    .onBegin(begin)
    .onStart(()=>{ os.value=sc.value; })
    .onUpdate(e=>{ sc.value=Math.max(0.4,Math.min(4,os.value*e.scale)); })
    .onEnd(()=>{ runOnJS(onCommit)(sp.id,tx.value,ty.value,sc.value); })
    .onFinalize(finalize);
  const g=Gesture.Simultaneous(hold,tap,pan,pinch);
  const aStyle=useAnimatedStyle(()=>({transform:[{translateX:tx.value},{translateY:ty.value},{scale:sc.value*(1+armed.value*0.12)}]}));
  return (
    <GestureDetector gesture={g}>
      <Reanimated.View style={[stk.wrap,aStyle]} hitSlop={22}>
        <StickerGlyph sp={sp} />
      </Reanimated.View>
    </GestureDetector>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function WriteEntryScreen({navigation,route}:Props) {
  const dispatch=useDispatch();
  const entries=useSelector((s:RootState)=>s.journal.entries);
  const drafts=useSelector((s:RootState)=>s.journal.drafts);
  const unsaved=drafts.filter(d=>d.isDraft);
  const existing=route.params?.entryId
    ?(entries.find(e=>e.id===route.params.entryId)??drafts.find(d=>d.id===route.params.entryId))
    :undefined;

  const gid=()=>`${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const [eid]=useState(existing?.id??gid());
  const [title,setTitle]=useState(existing?.title??'');
  const [body,setBody]=useState(existing?.body??'');
  const [mood,setMood]=useState<Mood>(existing?.mood??'happy');
  const [moodDone,setMoodDone]=useState(!!existing || !!route.params?.skipMood);
  const [tags,setTags]=useState<string[]>(existing?.tags??[]);
  const [stickers,setStickers]=useState<StickerPlacement[]>(existing?.stickerPlacements??[]);
  const [priv,setPriv]=useState(existing?.isPrivate ?? route.params?.private ?? false);
  // Pin toggle in the header, same as Notes' pinned flag — Quotes/Ideas/
  // Affirmation entries didn't have a way to mark themselves important
  // before this, so it reuses the existing isImportant field.
  const [important,setImportant]=useState(existing?.isImportant ?? false);
  const [theme,setTheme]=useState<JournalTheme>(existing?.theme??'default');
  const [tColor,setTColor]=useState(existing?.textColor??'#111111');
  const [fSize,setFSize]=useState(existing?.fontSize??16);
  const [media,setMedia]=useState<string[]>(existing?.mediaUrls??[]);
  const [voice,setVoice]=useState(existing?.voiceNoteUrl??'');
  const [recording,setRecording]=useState(false);
  const [panel,setPanel]=useState<Panel>('none');
  const [moodModal,setMoodModal]=useState(false);
  const [date,setDate]=useState(existing?new Date(existing.createdAt):new Date());
  const [preview,setPreview]=useState<{url:string;isVid:boolean}|null>(null);
  const [bodyFocus,setBodyFocus]=useState(false);
  const [saving,setSaving]=useState(false);
  const recRef=useRef<Audio.Recording|null>(null);
  // Reactive window size — used for grid/preview sizing below so layout
  // stays correct if the window itself changes (Android split-screen,
  // foldables, iPad multitasking), unlike the module-level SW/SH above
  // (which only reflect the size at first launch and are only used for the
  // sticker-drag-to-trash gesture math, not layout).
  const { width: winW, height: winH } = useWindowDimensions();
  const th=JOURNAL_THEMES.find(t=>t.id===theme)??JOURNAL_THEMES[0];
  const selMood=MOOD_OPTIONS.find(m=>m.value===mood)??MOOD_OPTIONS[0];
  const detected=detectHashtags(body);
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const { saveEntry } = useOfflineJournal();
  const persistDraft = () => {
    const d = build(true);
    dispatch(saveDraft(d));
    if (userId) saveDraftToFirestore(userId, d).catch(() => {});
  };
  const liveScribbles = drafts.find(d=>d.id===eid)?.scribblePages ?? existing?.scribblePages ?? [];

  const build=(isDraft:boolean):JournalEntry=>({
    id:eid,title:title.trim()||'Untitled',body,detectedHashtags:detected,mood,tags,
    stickers:stickers.map(s=>s.asset??s.emoji??''),stickerPlacements:stickers,
    scribblePages:liveScribbles,
    isPrivate:priv,isImportant:important,theme,category:(existing?.category ?? (route.params?.category as any)),textColor:tColor,fontSize:fSize,mediaUrls:media,
    voiceNoteUrl:voice||undefined,
    createdAt:existing?.createdAt??date.toISOString(),
    updatedAt:new Date().toISOString(),isDraft,
    mode: existing?.mode ?? 'freestyle',
  });

  useEffect(()=>{
    const t=setInterval(()=>{if(title.trim()||body.trim())persistDraft();},15000);
    return ()=>clearInterval(t);
  },[title,body,mood,theme,stickers,media,voice,priv,important,tColor,fSize,tags]);

  const save=async()=>{
    if(!title.trim()&&!body.trim()){Alert.alert('Empty','Write something first.');return;}
    if(!userId){Alert.alert('Error','You must be logged in to save entries.');return;}

    setSaving(true);
    try {
      // Offline-first: build the entry with LOCAL media URIs and commit it
      // through the single write path. It's written to the local store and the
      // UI instantly; media upload + Firestore write happen in the background
      // (and auto-retry when offline), so saving never blocks on the network.
      const isNew = !entries.some(e => e.id === eid);
      const entry: JournalEntry = build(false);
      saveEntry(entry, isNew);

      // Clear the in-progress draft.
      dispatch(deleteDraft(eid)); deleteDraftFromFirestore(eid).catch(() => {});
      navigation.navigate('Journal');
    } catch (e: any) {
      console.error(e);
      const detail = `${e?.code ? '[' + e.code + '] ' : ''}${e?.message ?? 'Unknown error'}`;
      Alert.alert('Save Failed', detail);
    } finally {
      setSaving(false);
    }
  };

  const tp=(p:Panel)=>setPanel(prev=>prev===p?'none':p);
  const [stickerActive,setStickerActive]=useState(false);
  const [overTrash,setOverTrash]=useState(false);
  const [armed,setArmed]=useState(false);
  const onStickerCommit=(id:string,x:number,y:number,scale:number)=>setStickers(p=>p.map(s=>s.id===id?{...s,x,y,scale}:s));
  const addSticker=(key:string)=>{setStickers(p=>[...p,{id:gid(),asset:key,x:60,y:60,scale:1,rotation:0}]);setPanel('none');};
  const isVid=(u:string)=>['.mp4','.mov','.avi','.mkv'].some(x=>u.toLowerCase().endsWith(x))||u.includes('video');

  const pickPhoto=async()=>{
    Alert.alert('Add Photo','Choose source',[
      {text:'Take Photo',onPress:async()=>{
        const cp=await ImagePicker.requestCameraPermissionsAsync();
        if(!cp.granted){Alert.alert('Camera permission needed','Please allow camera access in Settings.');return;}
        const r=await ImagePicker.launchCameraAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,quality:0.85,allowsEditing:false});
        if(!r.canceled)setMedia(m=>[...m,...r.assets.map(a=>a.uri)]);
      }},
      {text:'Choose from Gallery',onPress:async()=>{
        const lp=await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(!lp.granted){Alert.alert('Gallery permission needed');return;}
        const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsMultipleSelection:true,quality:0.85});
        if(!r.canceled)setMedia(m=>[...m,...r.assets.map(a=>a.uri)]);
      }},
      {text:'Cancel',style:'cancel'},
    ]);
  };
  const pickVid=async()=>{
    Alert.alert('Add Video','Choose source',[
      {text:'Record Video',onPress:async()=>{
        const cp=await ImagePicker.requestCameraPermissionsAsync();
        if(!cp.granted){Alert.alert('Camera permission needed','Please allow camera access in Settings.');return;}
        const r=await ImagePicker.launchCameraAsync({mediaTypes:ImagePicker.MediaTypeOptions.Videos,videoMaxDuration:120,allowsEditing:false});
        if(!r.canceled)setMedia(m=>[...m,...r.assets.map(a=>a.uri)]);
      }},
      {text:'Choose from Gallery',onPress:async()=>{
        const lp=await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(!lp.granted){Alert.alert('Gallery permission needed');return;}
        const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Videos,allowsMultipleSelection:true});
        if(!r.canceled)setMedia(m=>[...m,...r.assets.map(a=>a.uri)]);
      }},
      {text:'Cancel',style:'cancel'},
    ]);
  };

  const startRec=async()=>{
    try {
      const p=await Audio.requestPermissionsAsync();
      if(!p.granted){Alert.alert('Mic needed');return;}
      await Audio.setAudioModeAsync({allowsRecordingIOS:true,playsInSilentModeIOS:true});
      const {recording:r}=await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recRef.current=r;setRecording(true);
    } catch(e){Alert.alert('Error','Cannot record');}
  };
  const stopRec=async()=>{
    if(!recRef.current)return;
    setRecording(false);
    await recRef.current.stopAndUnloadAsync();
    const u=recRef.current.getURI();
    if(u)setVoice(u);
    recRef.current=null;
  };

  const openScribble=()=>{
    persistDraft();
    navigation.navigate('Scribble',{entryId:eid,pageId:`scribble_${eid}_1`});
  };

  // ── Mood screen ────────────────────────────────────────────────────────────
  if (!moodDone) {
    return (
      <SafeAreaView style={{flex:1,backgroundColor:'#F7F7F7'}}>
        <View style={ms.hdr}>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Text style={ms.x}>✕</Text></TouchableOpacity>
          <Text style={[ms.title,{fontFamily:FB}]}>How are you feeling?</Text>
        </View>
        <ScrollView contentContainerStyle={ms.grid}>
          {MOOD_OPTIONS.map(m=>(
            <TouchableOpacity key={m.value} style={[ms.card,mood===m.value&&{borderColor:'#2979FF',borderWidth:2.5}]} onPress={()=>setMood(m.value as Mood)}>
              <View style={[ms.circle,{backgroundColor:m.color}]}><Text style={{fontSize:28}}>{m.emoji}</Text></View>
              <Text style={[ms.lbl,{fontFamily:F},mood===m.value&&{color:'#2979FF',fontFamily:FB}]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={[ms.btn,{backgroundColor:'#2979FF'}]} onPress={()=>setMoodDone(true)}>
          <Text style={[ms.btnT,{fontFamily:FB}]}>Continue with {selMood.label} {selMood.emoji}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Write screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe,{backgroundColor:th.bg}]}>
      {/* Preview modal — only closes on ✕ */}
      <Modal visible={!!preview} transparent animationType="fade">
        <View style={s.prevOver}>
          {preview ? (
            preview.isVid
              ?<Video source={{uri:preview.url}} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode={ResizeMode.CONTAIN} shouldPlay useNativeControls/>
              :<Image source={{uri:preview.url}} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode="contain"/>
          ) : null}
          <TouchableOpacity style={s.prevClose} onPress={()=>setPreview(null)}>
            <Text style={s.prevCloseT}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Mood change modal */}
      <Modal visible={moodModal} transparent animationType="slide">
        <View style={s.moodOver}>
          <View style={s.moodSheet}>
            <Text style={[s.moodSheetT,{fontFamily:FB}]}>Change Mood</Text>
            <View style={s.moodGrid}>
              {MOOD_OPTIONS.map(m=>(
                <TouchableOpacity key={m.value} style={[s.moodOpt,{width:(winW-80)/5},mood===m.value&&{backgroundColor:m.color+'30'}]}
                  onPress={()=>{setMood(m.value as Mood);setMoodModal(false);}}>
                  <View style={[s.moodCirc,{backgroundColor:m.color}]}><Text style={{fontSize:22}}>{m.emoji}</Text></View>
                  <Text style={[s.moodLbl,{fontFamily:F}]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={()=>setMoodModal(false)} style={s.moodCancel}>
              <Text style={[{color:'#888',fontFamily:F}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>
        {/* Top bar */}
        <View style={[s.topBar,{backgroundColor:th.card}]}>
          <TouchableOpacity onPress={()=>{persistDraft();navigation.goBack();}} style={s.backBtn}>
            <Text style={s.backArr}>←</Text>
          </TouchableOpacity>
          {/* Pin + Save, same icons/layout as Notes' header (PinLogo/CheckLogo). */}
          <TouchableOpacity style={[s.pinBtn,{borderColor:important?th.accent:'#E0E0E0'}]} activeOpacity={0.7} onPress={()=>setImportant(p=>!p)}>
            <PinLogo width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtn,{backgroundColor:th.accent}]} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <CheckLogo width={18} height={18} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" scrollEnabled={!stickerActive} style={{flex:1}}>
          {/* Date + Mood emoji on same row */}
          <View style={[s.dateRow,{backgroundColor:th.card}]}>
            <TouchableOpacity style={s.dateLeft} onPress={()=>tp('calendar')}>
              <Text style={[s.dateDay,{color:th.accent,fontFamily:FB}]}>{date.getDate()}</Text>
              <Text style={[s.dateMon,{color:th.accent,fontFamily:F}]}>
                {' '}{date.toLocaleString('en',{month:'long'})} {date.getFullYear()} ▾
              </Text>
            </TouchableOpacity>
            {/* Mood emoji — tap to change */}
            <TouchableOpacity onPress={()=>setMoodModal(true)} style={[s.moodBubble,{backgroundColor:selMood.color}]}>
              <Text style={{fontSize:20}}>{selMood.emoji}</Text>
            </TouchableOpacity>
          </View>

          {panel==='calendar'&&(
            <View style={[s.panel,{backgroundColor:th.card}]}>
              <FullCalendar selDate={date} accent={th.accent} onSelect={d=>{setDate(d);setPanel('none');}}/>
            </View>
          )}

          {/* Tag chips */}
          {tags.length>0&&(
            <View style={s.tagsRow}>
              {tags.map(t=>(
                <View key={t} style={[s.tagChip,{backgroundColor:th.accent+'25'}]}>
                  <Text style={[s.tagT,{color:th.accent,fontFamily:F}]}>#{t}</Text>
                  <TouchableOpacity onPress={()=>setTags(p=>p.filter(x=>x!==t))}><Text style={[s.tagX,{color:th.accent}]}>✕</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Write area */}
          <View style={[s.writeArea,{backgroundColor:th.card}]}>
            <TextInput
              style={[s.titleInput,{color:tColor,fontSize:Math.max(fSize+4,22),fontFamily:FB}]}
              placeholder="Title your journal"
              placeholderTextColor="#AAAAAA"
              value={title} onChangeText={setTitle} maxLength={120}
            />
            <View style={s.divider}/>
            {/* Body + stickers */}
            <View style={{minHeight:200,position:'relative'}}>
              {bodyFocus
                ?<TextInput
                    style={[s.bodyInput,{color:tColor,fontSize:fSize,fontFamily:F,lineHeight:fSize*1.65}]}
                    placeholder={"Write your journal...\nType #hashtags to auto-tag"}
                    placeholderTextColor="#AAAAAA"
                    value={body} onChangeText={setBody}
                    multiline textAlignVertical="top"
                    onBlur={()=>setBodyFocus(false)}
                  />
                :<TouchableOpacity activeOpacity={1} onPress={()=>setBodyFocus(true)} style={{minHeight:200}}>
                    {body
                      ?<HighlightedText text={body} color={tColor} fs={fSize} accent={th.accent}/>
                      :<Text style={[s.bodyInput,{color:'#AAAAAA',fontFamily:F}]}>{"Write your journal...\nType #hashtags to auto-tag"}</Text>
                    }
                  </TouchableOpacity>
              }
              {/* Stickers over body */}
              {stickers.map(sp=>(
                <Sticker key={sp.id} sp={sp}
                  onCommit={onStickerCommit} setActive={setStickerActive}
                  onDelete={(id)=>setStickers(p=>p.filter(x=>x.id!==id))}
                  setArmed={setArmed} setOverTrash={setOverTrash}/>
              ))}
            </View>

            {/* Detected hashtags */}
            {detected.length>0&&(
              <View style={s.detRow}>
                <Text style={[s.detLbl,{color:th.accent,fontFamily:F}]}>Auto-tagged: </Text>
                {detected.map(t=>(
                  <View key={t} style={[s.detChip,{backgroundColor:th.accent+'20'}]}>
                    <Text style={[s.detT,{color:th.accent,fontFamily:F}]}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Scribble thumbnails — shown as image-like cards */}
          {liveScribbles.length>0&&(
            <View style={s.scribSection}>
              <Text style={[s.scribLabel,{fontFamily:FB}]}>Scribbles</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {liveScribbles.map(pg=>(
                  <TouchableOpacity key={pg.id} style={s.scribThumb}
                    onPress={()=>navigation.navigate('Scribble',{entryId:eid,pageId:pg.id})}>
                    <Svg width={120} height={90}>
                      {pg.paths.map((p,i)=>
                        <SvgPath key={i} d={p.d} stroke={p.color} strokeWidth={p.width}
                          strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      )}
                    </Svg>
                    <View style={s.scribEdit}><Text style={{fontSize:11,color:'#555',fontFamily:'DMSans-Regular'}}>Tap to edit</Text></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Media */}
          {media.length>0&&(
            <View style={s.mediaRow}>
              {media.map((u,i)=>{
                const vid=isVid(u);
                return (
                  <View key={i} style={s.mediaItem}>
                    {vid
                      ?<View style={[s.mediaTh,{backgroundColor:'#111',alignItems:'center',justifyContent:'center'}]}>
                          <Text style={{fontSize:22,color:'#FFF'}}>▶</Text>
                          <Text style={{fontSize:8,color:'#FFF',marginTop:2,fontFamily:F}}>VIDEO</Text>
                        </View>
                      :<Image source={{uri:u}} style={s.mediaTh}/>
                    }
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={()=>setPreview({url:u,isVid:vid})}/>
                    <TouchableOpacity style={s.mediaClose} onPress={()=>setMedia(p=>p.filter((_,j)=>j!==i))}>
                      <Text style={s.mediaCloseT}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Voice — recording widget or playback widget, floats above toolbar */}
          {recording&&<RecordingWidget accent={th.accent} onStop={stopRec}/>}
          {!!voice&&!recording&&<VoiceWidget uri={voice} accent={th.accent} onDelete={()=>setVoice('')}/>}

          {/* Panels */}
          {panel==='theme'&&(
            <View style={[s.panel,{backgroundColor:th.card}]}>
              <Text style={[s.panelT,{fontFamily:FB}]}>Choose Theme</Text>
              <View style={s.themeGrid}>
                {JOURNAL_THEMES.map(t=>(
                  <TouchableOpacity key={t.id}
                    style={[s.themeOpt,{width:(winW-28-32-20)/4},{backgroundColor:t.bg,borderColor:theme===t.id?t.accent:'#DDD',borderWidth:theme===t.id?2.5:1}]}
                    onPress={()=>{setTheme(t.id);setPanel('none');}}>
                    <View style={[s.thDot,{backgroundColor:t.accent}]}/>
                    <Text style={[s.thLbl,{fontFamily:F,color:t.id==='night'?'#FFF':'#333'}]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {panel==='textStyle'&&(
            <View style={[s.panel,{backgroundColor:th.card}]}>
              <Text style={[s.panelT,{fontFamily:FB}]}>Text Style</Text>
              <Text style={[s.panelSub,{fontFamily:F}]}>Size</Text>
              <View style={s.fsRow}>
                {FONT_SIZES.map(sz=>(
                  <TouchableOpacity key={sz} style={[s.fsBtn,fSize===sz&&{backgroundColor:th.accent}]} onPress={()=>setFSize(sz)}>
                    <Text style={[s.fsBtnT,{fontFamily:F},fSize===sz&&{color:'#FFF'}]}>{sz}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.panelSub,{fontFamily:F}]}>Color</Text>
              <View style={s.colorRow}>
                {TEXT_COLORS.map(c=>(
                  <TouchableOpacity key={c} style={[s.colorDot,{backgroundColor:c},tColor===c&&s.colorActive]} onPress={()=>setTColor(c)}/>
                ))}
              </View>
              <TouchableOpacity onPress={()=>setPanel('none')} style={[s.doneBtn,{backgroundColor:th.accent}]}>
                <Text style={[s.doneBtnT,{fontFamily:FB}]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          {panel==='sticker'&&(
            <View style={[s.panel,{backgroundColor:th.card}]}>
              <Text style={[s.panelT,{fontFamily:FB}]}>Stickers</Text>
              <Text style={[s.panelSub,{fontFamily:F}]}>Tap to place · Drag to move</Text>
              <View style={s.stickerGrid}>
                {STICKER_ASSETS.map(st=>(
                  <TouchableOpacity key={st.key} onPress={()=>addSticker(st.key)} style={s.stickerBtn}>
                    <Image source={st.source} style={{width:34,height:34}} resizeMode="contain"/>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{height:90}}/>
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={[s.toolbar,{backgroundColor:th.card}]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolbarInner}>
            <TouchableOpacity style={s.toolBtn} onPress={pickPhoto}>
              <PhotoIcon width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={pickVid}>
              <VideoLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={()=>tp('theme')}>
              <ThemeLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Theme</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={()=>tp('textStyle')}>
              <TextLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Style</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={()=>tp('sticker')}>
              <StickerLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Sticker</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={openScribble}>
              <ScribleLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>Scribble</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={()=>setPriv(v=>!v)}>
              <PrivateLogo width={22} height={22}/><Text style={[s.toolLbl,{fontFamily:F}]}>{priv?'Private':'Public'}</Text>
            </TouchableOpacity>
          </ScrollView>
          {/* Mic button */}
          <TouchableOpacity
            style={[s.micBtn,{borderColor:th.accent,backgroundColor:recording?th.accent:'transparent'}]}
            onPress={recording?stopRec:startRec}>
            <MicLogo width={22} height={22}/>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {armed && (
        <View pointerEvents="none" style={s.trashZone}>
          <View style={[s.trashCircle, overTrash && s.trashCircleActive]}>
            <Text style={s.trashIcon}>🗑️</Text>
          </View>
          <Text style={[s.trashLabel,{fontFamily:F}]}>{overTrash ? 'Release to delete' : 'Drag sticker here · tap sticker to cancel'}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ms=StyleSheet.create({
  hdr:{flexDirection:'row',alignItems:'center',padding:16,paddingBottom:8,gap:12},
  x:{fontSize:20,color:'#555'},title:{fontSize:20,color:'#111',flex:1},
  grid:{flexDirection:'row',flexWrap:'wrap',padding:16,justifyContent:'space-between',paddingBottom:100},
  card:{width:(SW-48)/3,marginBottom:16,borderRadius:16,backgroundColor:'#FFF',padding:14,alignItems:'center',gap:8,borderWidth:1.5,borderColor:'transparent',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.07,shadowRadius:6,elevation:2},
  circle:{width:52,height:52,borderRadius:26,alignItems:'center',justifyContent:'center'},
  lbl:{fontSize:12,color:'#555'},
  btn:{margin:16,borderRadius:24,paddingVertical:16,alignItems:'center',position:'absolute',bottom:12,left:16,right:16},
  btnT:{fontSize:16,color:'#FFF'},
});
const cal=StyleSheet.create({
  wrap:{padding:8},nav:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  arr:{padding:8},arrT:{fontSize:22,color:'#555'},title:{fontSize:15,color:'#111'},
  hdrs:{flexDirection:'row',marginBottom:4},hdr:{flex:1,textAlign:'center',fontSize:11,color:'#999'},
  grid:{flexDirection:'row',flexWrap:'wrap'},cell:{width:`${100/7}%` as any,alignItems:'center',paddingVertical:5},
  day:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},dayT:{fontSize:13,color:'#333'},
});
const stk=StyleSheet.create({
  wrap:{position:'absolute',zIndex:100},
  del:{position:'absolute',top:-8,right:-8,width:20,height:20,borderRadius:10,backgroundColor:'#EF5350',alignItems:'center',justifyContent:'center'},
  delT:{fontSize:13,color:'#FFF',lineHeight:18},
});
const s=StyleSheet.create({
  safe:{flex:1},
  prevOver:{flex:1,backgroundColor:'rgba(0,0,0,0.95)',alignItems:'center',justifyContent:'center'},
  prevImg:{},
  prevClose:{position:'absolute',top:50,right:20,width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.25)',alignItems:'center',justifyContent:'center'},
  prevCloseT:{fontSize:18,color:'#FFF'},
  moodOver:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  moodSheet:{backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:36},
  moodSheetT:{fontSize:17,color:'#111',marginBottom:16,textAlign:'center'},
  moodGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center'},
  moodOpt:{alignItems:'center',gap:4,padding:8,borderRadius:12},
  moodCirc:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  moodLbl:{fontSize:10,color:'#555'},
  moodCancel:{alignItems:'center',marginTop:16},
  topBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:'#E8E8E8',gap:10},
  backBtn:{padding:6},backArr:{fontSize:22,color:'#111'},
  pinBtn:{width:40,height:40,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center',marginLeft:'auto'},
  saveBtn:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  dateRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12},
  dateLeft:{flexDirection:'row',alignItems:'baseline',flex:1},
  dateDay:{fontSize:32},dateMon:{fontSize:14},
  moodBubble:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  tagsRow:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingHorizontal:16,paddingBottom:8},
  tagChip:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:5,borderRadius:16,gap:4},
  tagT:{fontSize:13},tagX:{fontSize:12,fontWeight:'700',marginLeft:2},
  writeArea:{paddingHorizontal:20,paddingTop:14,paddingBottom:14},
  titleInput:{marginBottom:12,paddingVertical:0},
  divider:{height:0.5,backgroundColor:'#E0E0E0',marginBottom:10},
  bodyInput:{lineHeight:24,minHeight:160,paddingTop:0},
  detRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6,marginTop:10,paddingTop:8,borderTopWidth:0.5,borderTopColor:'#EEE'},
  detLbl:{fontSize:11},detChip:{paddingHorizontal:8,paddingVertical:3,borderRadius:10},detT:{fontSize:11},
  scribSection:{paddingHorizontal:16,paddingVertical:10},
  scribLabel:{fontSize:14,color:'#333',marginBottom:8},
  scribThumb:{width:130,height:110,borderRadius:12,backgroundColor:'#F5F5F5',marginRight:10,overflow:'hidden',borderWidth:1,borderColor:'#E0E0E0'},
  scribEdit:{position:'absolute',bottom:4,left:0,right:0,alignItems:'center'},
  scribAdd:{width:90,height:110,borderRadius:12,backgroundColor:'#F0F4FF',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#C5D8FF',borderStyle:'dashed'},
  mediaRow:{flexDirection:'row',flexWrap:'wrap',gap:10,paddingHorizontal:16,paddingBottom:8},
  mediaItem:{position:'relative'},mediaTh:{width:90,height:75,borderRadius:10},
  mediaClose:{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:10,backgroundColor:'#EF5350',alignItems:'center',justifyContent:'center'},
  mediaCloseT:{fontSize:14,color:'#FFF',lineHeight:18,fontWeight:'700'},
  panel:{marginHorizontal:14,marginTop:6,marginBottom:4,borderRadius:18,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:8,elevation:4},
  panelT:{fontSize:15,color:'#111',marginBottom:8},panelSub:{fontSize:12,color:'#666',marginBottom:8,marginTop:6},
  themeGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  themeOpt:{borderRadius:12,padding:10,alignItems:'center',gap:6},
  thDot:{width:20,height:20,borderRadius:10},thLbl:{fontSize:11},
  fsRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  fsBtn:{width:44,height:44,borderRadius:10,backgroundColor:'#F0F0F0',alignItems:'center',justifyContent:'center'},
  fsBtnT:{fontSize:14,color:'#333'},
  colorRow:{flexDirection:'row',gap:12,flexWrap:'wrap'},
  colorDot:{width:34,height:34,borderRadius:17,borderWidth:2,borderColor:'transparent'},
  colorActive:{borderColor:'#2979FF',transform:[{scale:1.15}]},
  doneBtn:{borderRadius:14,paddingVertical:12,alignItems:'center',marginTop:14},doneBtnT:{fontSize:15,color:'#FFF'},
  stickerGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  stickerBtn:{width:44,height:44,alignItems:'center',justifyContent:'center',backgroundColor:'#F5F5F5',borderRadius:10},
  trashZone:{ position:'absolute', bottom:56, left:0, right:0, alignItems:'center' },
  trashCircle:{ width:64, height:64, borderRadius:32, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  trashCircleActive:{ backgroundColor:'#EF5350', transform:[{scale:1.18}] },
  trashIcon:{ fontSize:26 },
  trashLabel:{ marginTop:6, fontSize:12, color:'#888' },
  toolbar:{borderTopWidth:0.5,borderTopColor:'#E8E8E8',paddingVertical:8,flexDirection:'row',alignItems:'center',paddingRight:8},
  toolbarInner:{paddingHorizontal:6,gap:2,alignItems:'center'},
  toolBtn:{alignItems:'center',justifyContent:'center',paddingHorizontal:8,paddingVertical:4,gap:2},
  toolLbl:{fontSize:9,color:'#888'},
  micBtn:{width:44,height:44,borderRadius:22,borderWidth:2,alignItems:'center',justifyContent:'center',marginLeft:4},
});
