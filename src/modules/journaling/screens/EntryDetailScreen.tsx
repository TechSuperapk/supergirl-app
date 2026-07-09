import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Video, Audio, ResizeMode } from 'expo-av';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { RootState } from '../../../store';
import { deleteEntry, moveToPrivate, moveToPublic, setFavorite } from '../store/journalSlice';
import { deleteJournalEntry, updateJournalEntryFields } from '../services/journalDbService';
import { useOfflineJournal } from '../offline/useOfflineJournal';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { JOURNAL_THEMES } from '../types';
import { blocksFromEntry } from '../contentBlocks';
import { JournalCanvas } from '../components/guided';
import { ALL_TYPES, JOURNAL_TYPE_ICONS } from '../components/home';
import { Image as ExpoImage } from 'expo-image';
import { mergeAttachments } from '../attachmentOrder';
import { SCRIBBLE_VIEW_BOX } from '../scribbleConstants';
import CalendarLogo from '../../../../assets/images/CalenderTopLogo';

// Read-only canvas needs a `colors` shape ({border, textMuted}) the same way
// GuidedEntryScreen gets it from useTheme() — this screen never used
// useTheme (all hardcoded literals), so this mirrors the same values that
// were already hardcoded in the old canvas styles (divider '#E0E0E0',
// auto-tag row border '#EEE', placeholder-ish muted text '#888').
const detailColors = { border: '#E0E0E0', textMuted: '#888' };

type Props = NativeStackScreenProps<JournalStackParamList, 'EntryDetail'>;
const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// Same set as GuidedEntryScreen's GUIDED_TYPES — these categories are edited
// on the Guided/Freestyle screen; everything else uses the plain editor.
const GUIDED_TYPES = new Set(['morning', 'night', 'dream', 'vent']);

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
  const allEntries=useSelector((s:RootState)=>s.journal.entries);
  const entry=allEntries.find(e=>e.id===route.params.entryId);
  const vaultPin=useSelector((s:RootState)=>s.journal.vaultPin);
  const [preview,setPreview]=useState<{url:string;isVid:boolean}|null>(null);
  const [scribPreview,setScribPreview]=useState<any|null>(null);
  const [pinModal,setPinModal]=useState(false);
  const [pinAction,setPinAction]=useState<'toPrivate'|'toPublic'|null>(null);
  const [pin,setPin]=useState('');
  const [pinErr,setPinErr]=useState('');
  // Reactive window size (replaces the module-level Dimensions.get('window')
  // snapshot below, which never updates if the window itself changes —
  // Android split-screen, foldables, iPad multitasking).
  const { width: winW, height: winH } = useWindowDimensions();

  // Previous/Next — flip between diary entries in chronological order
  // (oldest → newest), like turning pages forward in a physical diary.
  const sortedEntries=useMemo(
    ()=>[...allEntries].filter(e=>!e.isDraft).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)),
    [allEntries],
  );
  const entryIdx=entry?sortedEntries.findIndex(e=>e.id===entry.id):-1;
  const prevEntry=entryIdx>0?sortedEntries[entryIdx-1]:null;
  const nextEntry=entryIdx>=0&&entryIdx<sortedEntries.length-1?sortedEntries[entryIdx+1]:null;
  const goPrev=()=>{ if(prevEntry) navigation.replace('EntryDetail',{entryId:prevEntry.id}); };
  const goNext=()=>{ if(nextEntry) navigation.replace('EntryDetail',{entryId:nextEntry.id}); };

  if(!entry) return (
    <SafeAreaView style={{flex:1,backgroundColor:'#F5F5F5'}}>
      <TouchableOpacity onPress={()=>navigation.goBack()} style={{padding:16}}>
        <Text style={{color:'#2979FF',fontSize:16,fontFamily:F}}>← Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const th=JOURNAL_THEMES.find(t=>t.id===entry.theme)??JOURNAL_THEMES[0];
  const date=new Date(entry.createdAt);
  const dateLabel=date.toLocaleDateString('en',{day:'numeric',month:'short',year:'numeric'});
  // Same "icon + category Journal" header as the editor's GuidedHeader, so
  // the view screen reads like a continuation of the edit screen.
  const categoryIcon=ALL_TYPES.find(t=>t.key===entry.category)?.emoji;
  const categoryIconGif=entry.category?JOURNAL_TYPE_ICONS[entry.category]:undefined;
  const categoryLabel=entry.category?`${cap(entry.category)} Journal`:'Journal';

  // Ordered text/image blocks — prefers entry.contentBlocks (written by the
  // current WYSIWYG editor); entries saved before inline images existed get
  // migrated into a single text block plus one image block per legacy
  // freeform placement, so their photos still show, just in reading order
  // instead of at their old x/y position.
  const blocks = blocksFromEntry(entry);

  // Photos/videos/scribbles not already placed inline (as a block) — same
  // position and small-tile layout as the editor's AttachmentGrid. Scribble
  // pages referenced by an inline block must be excluded here, or they'd
  // show up twice: once inline, once again via mergeAttachments' fallback
  // (which shows any scribblePage missing an attachmentOrder token, so
  // entries from before this existed don't silently lose anything).
  const inlineScribbleIds = new Set(blocks.filter(b => b.type === 'scribble').map(b => b.pageId));
  const legacyScribblePages = (entry.scribblePages ?? []).filter(p => !inlineScribbleIds.has(p.id));
  const allAttachments=mergeAttachments(entry.mediaUrls, legacyScribblePages, entry.attachmentOrder);

  const handleDelete=()=>Alert.alert('Delete','This cannot be undone.',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:()=>{
      // Offline-first: removes locally + from the UI instantly and queues the
      // Firestore delete (auto-retries if offline).
      removeEntry(entry.id);
      navigation.goBack();
    }},
  ]);

  const toggleFavorite=async()=>{
    if(!entry) return;
    const next=!entry.isFavorite;
    dispatch(setFavorite({id:entry.id,isFavorite:next})); // instant UI
    try {
      await updateJournalEntryFields(entry.id, { isFavorite: next });
    } catch {
      dispatch(setFavorite({id:entry.id,isFavorite:!next})); // revert if the sync fails
      Alert.alert('Error','Failed to update favorite status.');
    }
  };

  const openOptions=()=>{
    if(!entry) return;
    Alert.alert('Journal Options', undefined, [
      { text: entry.isFavorite?'Remove from Favorites':'Add to Favorites', onPress:toggleFavorite },
      { text: entry.isPrivate?'Move to Public Journal':'Move to Private Journal', onPress:()=>{ setPinAction(entry.isPrivate?'toPublic':'toPrivate'); setPinModal(true); } },
      { text:'Delete', style:'destructive', onPress:handleDelete },
      { text:'Cancel', style:'cancel' },
    ]);
  };

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
              ?<Video source={{uri:preview.url}} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode={ResizeMode.CONTAIN} shouldPlay useNativeControls/>
              :<Image source={{uri:preview.url}} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode="contain"/>
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
            <Svg width={winW-48} height={(winW-48)*0.75} viewBox={SCRIBBLE_VIEW_BOX}>
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
            <View style={[s.pinKeypad,{width:winW-48}]}>
              {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map((k,i)=>(
                <TouchableOpacity key={i}
                  style={[s.pinKey,{width:(winW-48-20)/3},k==='.'&&{opacity:0}]}
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

      {/* Header — mirrors GuidedHeader from the editor exactly: back arrow +
          date pill on top, icon + category name below. The edit/options
          icons ride alongside the date pill since a read-only view still
          needs a way in to those actions. */}
      <View style={[s.header,{backgroundColor:th.bg}]}>
        <View style={s.topRow}>
          <TouchableOpacity onPress={()=>navigation.goBack()} activeOpacity={0.7} hitSlop={{top:10,bottom:10,left:10,right:10}}>
            <Text style={[s.back,{color:th.accent}]}>‹</Text>
          </TouchableOpacity>
          <View style={s.topRight}>
            <View style={[s.datePill,{borderColor:th.accent+'40',backgroundColor:th.card}]}>
              <CalendarLogo width={18} height={20} />
              <Text style={[s.dateLabelT,{fontFamily:F}]}>{dateLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={()=>{
                // Morning/Night/Dream/Vent were written on the Guided/
                // Freestyle screen — edit them there too, so Save,
                // attachments, stickers etc. keep working exactly like they
                // did when the entry was first created, instead of dropping
                // into the older plain editor.
                if (GUIDED_TYPES.has(entry.category)) {
                  navigation.navigate('GuidedEntry', { entryId: entry.id, category: entry.category });
                } else {
                  navigation.navigate('WriteEntry', { entryId: entry.id });
                }
              }}
              style={s.iconBtn}
            >
              <Text style={{fontSize:18}}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openOptions} style={s.iconBtn}>
              <Text style={[s.moreDots,{color:th.accent}]}>•••</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.titleRow}>
          {categoryIconGif ? (
            <ExpoImage source={categoryIconGif} style={s.categoryIconGif} contentFit="contain" autoplay />
          ) : (
            !!categoryIcon&&<Text style={s.categoryIcon}>{categoryIcon}</Text>
          )}
          <Text style={[s.categoryLabel,{color:'#111',fontFamily:FB}]} numberOfLines={1}>{categoryLabel}</Text>
        </View>

        {(entry.isPrivate||entry.isImportant||entry.isFavorite)&&(
          <View style={s.badgeRow}>
            {entry.isFavorite&&(
              <View style={[s.privBadge,{backgroundColor:'#FFE9E9'}]}><Text style={[s.privBadgeT,{fontFamily:FB,color:'#C2185B'}]}>♥ Favorite</Text></View>
            )}
            {entry.isPrivate&&(
              <View style={s.privBadge}><Text style={[s.privBadgeT,{fontFamily:FB}]}>🔒 Private</Text></View>
            )}
            {entry.isImportant&&(
              <View style={[s.privBadge,{backgroundColor:'#FFF4D6'}]}><Text style={[s.privBadgeT,{fontFamily:FB,color:'#8A6100'}]}>⭐ Pinned to Calendar</Text></View>
            )}
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Renders through the exact same JournalCanvas component the editor
            uses, with editable=false — mood chip, tags, the write-area card,
            legacy attachments, freeform images and stickers all land at the
            exact saved position/style, pixel for pixel identical to
            GuidedEntryScreen. */}
        <JournalCanvas
          editable={false}
          th={th}
          colors={detailColors}
          title={entry.title}
          blocks={blocks}
          onPressImageBlock={id => {
            const b = blocks.find(x => x.id === id);
            if (b?.type === 'image' && b.uri) setPreview({ url: b.uri, isVid: !!b.isVideo });
          }}
          scribblePages={entry.scribblePages ?? []}
          onPressScribbleBlock={pageId => setScribPreview((entry.scribblePages ?? []).find(p => p.id === pageId))}
          textColor={entry.textColor}
          fontSize={entry.fontSize}
          bold={entry.bold}
          italic={entry.italic}
          underline={entry.underline}
          textAlign={entry.textAlign as any}
          mood={entry.mood}
          tags={entry.tags ?? []}
          detectedHashtags={entry.detectedHashtags ?? []}
          stickers={entry.stickerPlacements ?? []}
          legacyAttachments={allAttachments}
          onPressLegacyImage={uri => setPreview({ url: uri, isVid: false })}
          onPressLegacyVideo={uri => setPreview({ url: uri, isVid: true })}
          onPressLegacyScribble={pageId => setScribPreview((entry.scribblePages ?? []).find(p => p.id === pageId))}
        />

        {/* Voice note */}
        {!!entry.voiceNoteUrl&&<VoiceWidget uri={entry.voiceNoteUrl} accent={th.accent}/>}

        <View style={{height:16}}/>
      </ScrollView>

      {/* Previous / Next — pinned to the bottom of the screen (not part of
          the scrolling content) so it's always reachable without scrolling
          all the way down, like a footer bar. */}
      <View style={[s.pager,{backgroundColor:th.card,borderTopColor:'#0000000F'}]}>
        <TouchableOpacity onPress={goPrev} disabled={!prevEntry} style={{opacity:prevEntry?1:0.3}}>
          <Text style={[s.pagerT,{color:th.accent,fontFamily:F}]}>‹ Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} disabled={!nextEntry} style={{opacity:nextEntry?1:0.3}}>
          <Text style={[s.pagerT,{color:th.accent,fontFamily:F}]}>Next ›</Text>
        </TouchableOpacity>
      </View>
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
const s=StyleSheet.create({
  safe:{flex:1},
  prevOver:{flex:1,backgroundColor:'rgba(0,0,0,0.95)',alignItems:'center',justifyContent:'center'},
  prevImg:{},
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
  pinKeypad:{flexDirection:'row',flexWrap:'wrap',gap:10},
  pinKey:{height:56,backgroundColor:'#F5F5F5',borderRadius:14,alignItems:'center',justifyContent:'center'},
  pinKeyT:{fontSize:22,color:'#111'},
  pinCancel:{fontSize:15,color:'#888'},
  // Header — mirrors GuidedHeader.tsx exactly (back arrow + date pill on
  // top, icon + category name below), with the pencil/••• actions riding
  // alongside the date pill.
  header:{paddingHorizontal:20,paddingTop:4,paddingBottom:12},
  topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  back:{fontSize:32,marginTop:-4},
  topRight:{flexDirection:'row',alignItems:'center',gap:4},
  datePill:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:8},
  dateLabelT:{fontSize:13,color:'#111'},
  iconBtn:{width:38,height:38,alignItems:'center',justifyContent:'center'},
  moreDots:{fontSize:16,fontWeight:'700',letterSpacing:1,color:'#111'},
  titleRow:{flexDirection:'row',alignItems:'center',marginTop:8,gap:6,alignSelf:'flex-start',maxWidth:'100%'},
  categoryIcon:{fontSize:24},
  categoryIconGif:{width:28,height:28},
  categoryLabel:{fontSize:22,flexShrink:1},
  badgeRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10},
  privBadge:{backgroundColor:'#F3E5F5',borderRadius:12,paddingHorizontal:12,paddingVertical:5,alignSelf:'flex-start'},
  privBadgeT:{fontSize:13,color:'#7B1FA2'},
  scroll:{flex:1},
  // JournalCanvas renders flex:1 internally to fill available height (same
  // as the editor) — flexGrow:1 here gives it an actual growth context to
  // fill inside the ScrollView, instead of collapsing to content height.
  scrollContent:{flexGrow:1},
  pager:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:20,paddingTop:14,paddingBottom:14,borderTopWidth:StyleSheet.hairlineWidth},
  pagerT:{fontSize:15},
});
