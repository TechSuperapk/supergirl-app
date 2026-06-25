import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Video, Audio, ResizeMode } from 'expo-av';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { RootState } from '../../../store';
import { deleteEntry, moveToPrivate, moveToPublic } from '../store/journalSlice';
import { deleteJournalEntry, updateJournalEntryFields } from '../services/journalDbService';
import { useOfflineJournal } from '../offline/useOfflineJournal';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { MOOD_OPTIONS, JOURNAL_THEMES, StickerPlacement, detectHashtags } from '../types';
import { StickerGlyph } from '../components/StickerGlyph';

type Props = NativeStackScreenProps<JournalStackParamList, 'EntryDetail'>;
const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';

// ── Hashtag highlight ─────────────────────────────────────────────────────────
function HighlightedText({text,color,fs,accent}:{text:string;color:string;fs:number;accent:string}) {
  if(!text) return null;
  return (
    <Text style={{color,fontSize:fs,fontFamily:F,lineHeight:fs*1.65}}>
      {text.split(/(#\w+)/g).map((p,i)=>
        /^#\w+$/.test(p)
          ?<Text key={i} style={{color:accent,fontFamily:FB,backgroundColor:accent+'20'}}>{p}</Text>
          :<Text key={i}>{p}</Text>
      )}
    </Text>
  );
}

// ── Voice playback — Telegram style ──────────────────────────────────────────
function VoiceWidget({uri,accent}:{uri:string;accent:string}) {
  const [playing,setPlaying]=useState(false);
  const [pos,setPos]=useState(0);
  const soundRef=useRef<Audio.Sound|null>(null);
  const play=async()=>{
    try {
      if(soundRef.current){await soundRef.current.unloadAsync();soundRef.current=null;}
      const {sound}=await Audio.Sound.createAsync({uri});
      soundRef.current=sound;setPlaying(true);
      sound.setOnPlaybackStatusUpdate(st=>{
        if(!st.isLoaded)return;
        if(st.durationMillis)setPos(st.positionMillis/st.durationMillis);
        if(st.didJustFinish){setPlaying(false);setPos(0);}
      });
      await sound.playAsync();
    }catch(e){}
  };
  const stop=async()=>{if(soundRef.current){await soundRef.current.stopAsync();setPlaying(false);}};
  const bars=Array.from({length:28},(_,i)=>Math.sin(i*0.7)*0.4+0.3+((i*13)%5)*0.05);
  const filled=Math.round(pos*bars.length);
  return (
    <View style={vw.wrap}>
      <TouchableOpacity onPress={playing?stop:play} style={[vw.playBtn,{backgroundColor:accent}]}>
        <Text style={vw.playIco}>{playing?'⏹':'▶'}</Text>
      </TouchableOpacity>
      <View style={vw.wave}>
        {bars.map((h,i)=>(
          <View key={i} style={[vw.bar,{height:Math.max(4,h*28),backgroundColor:i<filled?accent:'#DDD'}]}/>
        ))}
      </View>
    </View>
  );
}

export function EntryDetailScreen({navigation,route}:Props) {
  const dispatch=useDispatch();
  const { removeEntry }=useOfflineJournal();
  const entry=useSelector((s:RootState)=>s.journal.entries.find(e=>e.id===route.params.entryId));
  const vaultPin=useSelector((s:RootState)=>s.journal.vaultPin);
  const [preview,setPreview]=useState<{url:string;isVid:boolean}|null>(null);
  const [scribPreview,setScribPreview]=useState<any|null>(null);
  const [pinModal,setPinModal]=useState(false);
  const [pinAction,setPinAction]=useState<'toPrivate'|'toPublic'|null>(null);
  const [pin,setPin]=useState('');
  const [pinErr,setPinErr]=useState('');

  if(!entry) return (
    <SafeAreaView style={{flex:1,backgroundColor:'#F5F5F5'}}>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={{padding:16}}>
        <Text style={{color:'#2979FF',fontSize:16,fontFamily:F}}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const moodOpt=MOOD_OPTIONS.find(m=>m.value===entry.mood);
  const th=JOURNAL_THEMES.find(t=>t.id===entry.theme)??JOURNAL_THEMES[0];
  const date=new Date(entry.createdAt);
  const time=date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false});
  const isVid=(u:string)=>['.mp4','.mov','.avi','.mkv'].some(x=>u.toLowerCase().endsWith(x))||u.includes('video');

  const handleDelete=()=>Alert.alert('Delete','This cannot be undone.',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:()=>{
      // Offline-first: removes locally + from the UI instantly and queues the
      // Firestore delete (auto-retries if offline).
      removeEntry(entry.id);
      navigation.goBack();
    }},
  ]);

  const handlePinConfirm=async()=>{
    if(pin===vaultPin){
      try {
        const toPrivate = pinAction==='toPrivate';
        await updateJournalEntryFields(entry.id, { isPrivate: toPrivate });
        if(toPrivate) dispatch(moveToPrivate(entry.id));
        else dispatch(moveToPublic(entry.id));
        setPinModal(false);setPin('');setPinErr('');
        Alert.alert('Done', toPrivate?'Moved to Private Journal':'Moved to Public Journal');
        navigation.goBack();
      } catch (e) {
        Alert.alert('Error', 'Failed to update visibility in database.');
      }
    } else {
      setPinErr('Wrong PIN'); setPin('');
    }
  };

  return (
    <SafeAreaView style={[s.safe,{backgroundColor:th.bg}]}>
      {/* Media preview modal */}
      <Modal visible={!!preview} transparent animationType="fade">
        <View style={s.prevOver}>
          {preview ? (
            preview.isVid
              ?<Video source={{uri:preview.url}} style={s.prevImg} resizeMode={ResizeMode.CONTAIN} shouldPlay useNativeControls/>
              :<Image source={{uri:preview.url}} style={s.prevImg} resizeMode="contain"/>
          ) : null}
          <TouchableOpacity style={s.prevClose} onPress={()=>setPreview(null)}>
            <Text style={s.prevCloseT}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scribble preview modal */}
      <Modal visible={!!scribPreview} transparent animationType="fade">
        <View style={s.prevOver}>
          <View style={s.scribPrevCard}>
            <Svg width={SW-48} height={(SW-48)*0.75}>
              {(scribPreview?.paths??[]).map((p:any,i:number)=>(
                <SvgPath key={i} d={p.d} stroke={p.color} strokeWidth={p.width}
                  strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              ))}
            </Svg>
          </View>
          <TouchableOpacity style={s.prevClose} onPress={()=>setScribPreview(null)}>
            <Text style={s.prevCloseT}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* PIN modal for private toggle */}
      <Modal visible={pinModal} transparent animationType="fade">
        <View style={s.pinOver}>
          <View style={s.pinSheet}>
            <Text style={[s.pinTitle,{fontFamily:FB}]}>Enter PIN</Text>
            <Text style={[s.pinSub,{fontFamily:F}]}>
              {pinAction==='toPrivate'?'Move to Private Journal':'Move to Public Journal'}
            </Text>
            <View style={s.pinDots}>
              {Array.from({length:4},(_,i)=>(
                <View key={i} style={[s.pinDot,i<pin.length&&{backgroundColor:th.accent,borderColor:th.accent}]}>{i<pin.length&&<Text style={s.pinStar}>*</Text>}</View>
              ))}
            </View>
            {!!pinErr&&<Text style={[s.pinErr,{fontFamily:F}]}>{pinErr}</Text>}
            <View style={s.pinKeypad}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((k,i)=>(
                <TouchableOpacity key={i}
                  style={[s.pinKey,k==='.'&&{opacity:0}]}
                  disabled={k==='.'}
                  onPress={()=>{
                    if(k==='⌫'){setPin(p=>p.slice(0,-1));setPinErr('');return;}
                    const next=pin+k;setPin(next);setPinErr('');
                    if(next.length===4) setTimeout(()=>{ if(next===vaultPin){handlePinConfirm();}else{setPinErr('Wrong PIN');setPin('');} },100);
                  }}>
                  <Text style={[s.pinKeyT,{fontFamily:F}]}>{k==='.'?'':k==='⌫'?'⌫':k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={()=>{setPinModal(false);setPin('');setPinErr('');}}>
              <Text style={[s.pinCancel,{fontFamily:F}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Top bar */}
      <View style={[s.topBar,{backgroundColor:th.card}]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArr}>←</Text>
        </TouchableOpacity>
        <Text style={[s.topTitle,{color:th.accent,fontFamily:FB}]} numberOfLines={1}>{entry.title||'Journal'}</Text>
        <View style={s.actions}>
          <TouchableOpacity onPress={()=>{setPinAction(entry.isPrivate?'toPublic':'toPrivate');setPinModal(true);}} style={[s.privBtn,{backgroundColor:entry.isPrivate?'#F3E5F5':'#E3EEFF'}]}>
            <Text style={{fontSize:14}}>{entry.isPrivate?'🔒':'🔓'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>navigation.navigate('WriteEntry',{entryId:entry.id})} style={[s.editBtn,{backgroundColor:th.accent+'20'}]}>
            <Text style={[s.editT,{color:th.accent,fontFamily:F}]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}><Text style={{fontSize:20}}>🗑️</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Date + mood */}
        <View style={s.dateHdr}>
          <Text style={[s.dateDay,{color:th.accent,fontFamily:FB}]}>{date.getDate()}</Text>
          <View style={{flex:1}}>
            <Text style={[s.dateMonYr,{fontFamily:FB}]}>{date.toLocaleString('en',{month:'short'})} {date.getFullYear()}</Text>
            <Text style={[s.dateWd,{fontFamily:F}]}>{date.toLocaleString('en',{weekday:'long'})} · {time}</Text>
          </View>
          {moodOpt&&<View style={[s.moodCirc,{backgroundColor:moodOpt.color}]}><Text style={{fontSize:22}}>{moodOpt.emoji}</Text></View>}
        </View>

        {entry.isPrivate&&(
          <View style={s.privBadge}><Text style={[s.privBadgeT,{fontFamily:FB}]}>🔒 Private</Text></View>
        )}

        {/* Title */}
        {!!entry.title&&(
          <Text style={[s.title,{color:entry.textColor,fontSize:Math.max(entry.fontSize+4,22),fontFamily:FB}]}>{entry.title}</Text>
        )}

        {/* Body with highlights — matches editor layout (pad 20, stickers over body) */}
        <View style={{marginHorizontal:20,marginBottom:10,position:'relative',minHeight:80}}>
          <HighlightedText text={entry.body} color={entry.textColor} fs={entry.fontSize} accent={th.accent}/>
          {/* Stickers at saved positions */}
          {(entry.stickerPlacements??[]).map((sp:StickerPlacement)=>(
            <View key={sp.id} style={{position:'absolute',left:sp.x,top:sp.y,transform:[{scale:sp.scale??1}],zIndex:10}}>
              <StickerGlyph sp={sp} />
            </View>
          ))}
        </View>

        {/* Detected hashtags */}
        {(entry.detectedHashtags??[]).length>0&&(
          <View style={s.tagsRow}>
            {(entry.detectedHashtags??[]).map((t:string)=>(
              <View key={t} style={[s.tagChip,{backgroundColor:th.accent+'20'}]}>
                <Text style={[s.tagT,{color:th.accent,fontFamily:F}]}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Scribble thumbnails */}
        {(entry.scribblePages??[]).length>0&&(
          <View style={s.scribSection}>
            <Text style={[s.scribLabel,{fontFamily:FB}]}>Scribbles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(entry.scribblePages??[]).map(pg=>(
                <TouchableOpacity key={pg.id} style={s.scribThumb} onPress={()=>setScribPreview(pg)}>
                  <Svg width={130} height={100}>
                    {pg.paths.map((p:any,i:number)=>(
                      <SvgPath key={i} d={p.d} stroke={p.color} strokeWidth={p.width}
                        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    ))}
                  </Svg>
                  <View style={s.scribViewHint}><Text style={[{fontSize:10,color:'#888'},]}>Tap to view</Text></View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Media */}
        {entry.mediaUrls.length>0&&(
          <View style={s.mediaGrid}>
            {entry.mediaUrls.map((u,i)=>{
              const vid=isVid(u);
              return (
                <TouchableOpacity key={i} onPress={()=>setPreview({url:u,isVid:vid})}>
                  {vid
                    ?<View style={[s.mediaImg,{backgroundColor:'#111',alignItems:'center',justifyContent:'center'}]}>
                        <Text style={{fontSize:24,color:'#FFF'}}>▶</Text>
                        <Text style={{fontSize:9,color:'#FFF',fontFamily:F}}>VIDEO</Text>
                      </View>
                    :<Image source={{uri:u}} style={s.mediaImg}/>
                  }
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Voice note */}
        {!!entry.voiceNoteUrl&&<VoiceWidget uri={entry.voiceNoteUrl} accent={th.accent}/>}

        <View style={{height:60}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const vw=StyleSheet.create({
  wrap:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:16,marginVertical:8,padding:12,backgroundColor:'#F0F4FF',borderRadius:20},
  playBtn:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  playIco:{fontSize:14,color:'#FFF'},
  wave:{flex:1,flexDirection:'row',alignItems:'center',gap:2,height:32},
  bar:{width:3,borderRadius:2},
});
const { width:SW } = require('react-native').Dimensions.get('window');
const { height:SH } = require('react-native').Dimensions.get('window');
const s=StyleSheet.create({
  safe:{flex:1},
  prevOver:{flex:1,backgroundColor:'rgba(0,0,0,0.95)',alignItems:'center',justifyContent:'center'},
  prevImg:{width:SW,height:SH*0.8},
  prevClose:{position:'absolute',top:50,right:20,width:38,height:38,borderRadius:19,backgroundColor:'rgba(255,255,255,0.25)',alignItems:'center',justifyContent:'center'},
  prevCloseT:{fontSize:18,color:'#FFF'},
  scribPrevCard:{backgroundColor:'#FAFAFA',borderRadius:16,padding:8},
  pinOver:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  pinSheet:{backgroundColor:'#FFF',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40,alignItems:'center',gap:14},
  pinTitle:{fontSize:20,color:'#111'},pinSub:{fontSize:14,color:'#888'},
  pinDots:{flexDirection:'row',gap:16},
  pinDot:{width:48,height:48,borderRadius:12,borderWidth:1.5,borderColor:'#DDD',backgroundColor:'#F5F5F5',alignItems:'center',justifyContent:'center'},
  pinStar:{color:'#FFFFFF',fontSize:26,lineHeight:30,fontWeight:'700'},
  pinErr:{fontSize:13,color:'#EF5350'},
  pinKeypad:{flexDirection:'row',flexWrap:'wrap',width:SW-48,gap:10},
  pinKey:{width:(SW-48-20)/3,height:56,backgroundColor:'#F5F5F5',borderRadius:14,alignItems:'center',justifyContent:'center'},
  pinKeyT:{fontSize:22,color:'#111'},
  pinCancel:{fontSize:15,color:'#888'},
  topBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:'#E8E8E8',gap:8},
  backBtn:{padding:4},backArr:{fontSize:22,color:'#111'},
  topTitle:{flex:1,fontSize:15,color:'#111'},
  actions:{flexDirection:'row',gap:8,alignItems:'center'},
  privBtn:{paddingHorizontal:10,paddingVertical:6,borderRadius:12},
  editBtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:14},editT:{fontSize:14},
  scroll:{flex:1},
  dateHdr:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingTop:20,marginBottom:14},
  dateDay:{fontSize:52,lineHeight:56},
  dateMonYr:{fontSize:18,color:'#111'},dateWd:{fontSize:13,color:'#888',marginTop:2},
  moodCirc:{width:46,height:46,borderRadius:23,alignItems:'center',justifyContent:'center'},
  privBadge:{backgroundColor:'#F3E5F5',borderRadius:12,paddingHorizontal:12,paddingVertical:5,alignSelf:'flex-start',marginHorizontal:20,marginBottom:10},
  privBadgeT:{fontSize:13,color:'#7B1FA2'},
  title:{marginHorizontal:20,marginBottom:10},
  tagsRow:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingHorizontal:20,marginBottom:12},
  tagChip:{paddingHorizontal:10,paddingVertical:4,borderRadius:14},tagT:{fontSize:13},
  scribSection:{paddingHorizontal:20,paddingVertical:10},
  scribLabel:{fontSize:14,color:'#333',marginBottom:8},
  scribThumb:{width:140,height:120,borderRadius:12,backgroundColor:'#F5F5F5',marginRight:10,overflow:'hidden',borderWidth:1,borderColor:'#E0E0E0'},
  scribViewHint:{position:'absolute',bottom:4,left:0,right:0,alignItems:'center'},
  mediaGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingHorizontal:20,marginBottom:14},
  mediaImg:{width:150,height:120,borderRadius:12},
});
