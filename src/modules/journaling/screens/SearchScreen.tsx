/**
 * SearchScreen — Fixed version
 * Fix: Recent searches are shown based on actual recent searches (not default list).
 * Fix: Entered #tags only shown in "Top Tags" section (not in general search context).
 */
import React,{useState,useMemo} from 'react';
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet,Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootState} from '../../../store';
import {JournalStackParamList} from '../../../navigation/JournalNavigator';
import {MOOD_OPTIONS,MOOD_BG,Mood,JOURNAL_THEMES} from '../types';

const C={blue:'#2979FF',white:'#FFFFFF',bg:'#FFFFFF',black:'#111111',grey:'#888888',lgrey:'#DDDDDD',orange:'#FFA726'};
const DISCOVER_MOODS=[{emoji:'😊',mood:'happy'},{emoji:'😟',mood:'anxious'},{emoji:'😡',mood:'angry'},{emoji:'😰',mood:'anxious'},{emoji:'😐',mood:'neutral'},{emoji:'😔',mood:'sad'},{emoji:'🥰',mood:'loved'},{emoji:'😌',mood:'calm'},{emoji:'🤩',mood:'excited'},{emoji:'🙏',mood:'grateful'}];

export function SearchScreen() {
  const navigation=useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const allEntries=useSelector((s:RootState)=>s.journal.entries.filter(e=>!e.isPrivate));
  const [query,setQuery]=useState('');
  // Recent searches start EMPTY — only populated by actual searches
  const [recent,setRecent]=useState<string[]>([]);
  const [moodFilter,setMoodFilter]=useState<string|null>(null);

  // Derive top tags from actual entries
  const topTagsMap = useMemo(() => {
    const map: Record<string,number> = {};
    allEntries.forEach(e => e.tags.forEach(t => { map[t] = (map[t] ?? 0) + 1; }));
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  }, [allEntries]);

  // Tag filter — only for top tags section
  const [tagFilter,setTagFilter]=useState<string|null>(null);

  const results=useMemo(()=>{
    let list=allEntries;
    if(moodFilter)list=list.filter(e=>e.mood===moodFilter);
    if(tagFilter){const clean=tagFilter.toLowerCase();list=list.filter(e=>e.tags.some(t=>t.toLowerCase()===clean));}
    if(query.trim()){const q=query.toLowerCase();list=list.filter(e=>e.title.toLowerCase().includes(q)||e.body.toLowerCase().includes(q)||e.tags.some(t=>t.toLowerCase().includes(q)));}
    return list;
  },[allEntries,query,moodFilter,tagFilter]);

  const isSearching=query.trim().length>0||!!moodFilter||!!tagFilter;

  const handleSearch=(text:string)=>{
    setQuery(text);
    // Add to recent only when user submits (not on every keystroke)
  };

  const handleSubmit=()=>{
    const t=query.trim();
    if(t&&!recent.includes(t)) setRecent(prev=>[t,...prev.slice(0,7)]);
  };

  const renderCard=(e:typeof allEntries[0])=>{
    const date=new Date(e.createdAt);
    const day=date.getDate();
    const mon=date.toLocaleString('en',{month:'short'});
    const isT=new Date().toDateString()===date.toDateString();
    const time=date.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false});
    const th=JOURNAL_THEMES.find(t=>t.id===e.theme)??JOURNAL_THEMES[0];
    return (
      <TouchableOpacity key={e.id} style={[s.card,{backgroundColor:th.card}]} onPress={()=>navigation.navigate('EntryDetail',{entryId:e.id})}>
        <View style={s.cardTop}>
          <View style={{flexDirection:'row',alignItems:'baseline',gap:4}}>
            <Text style={[s.cardDay,{color:th.accent}]}>{day}</Text>
            <Text style={s.cardMon}>{mon}{isT?', Today':''}</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Text style={s.cardTime}>{time}</Text>
            <View style={{width:32,height:32,borderRadius:16,backgroundColor:MOOD_BG(e.mood as Mood),alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:16}}>{MOOD_OPTIONS.find(m=>m.value===e.mood)?.emoji??'😊'}</Text>
            </View>
          </View>
        </View>
        {!!e.title&&<Text style={[s.cardTitle,{color:e.textColor}]}>{e.title}</Text>}
        <Text style={s.cardBody} numberOfLines={2}>{e.body}</Text>
        {e.tags.length>0&&<View style={s.tagsRow}>{e.tags.slice(0,3).map(t=><View key={t} style={[s.tagChip,{backgroundColor:th.accent+'20'}]}><Text style={[s.tagTxt,{color:th.accent}]}>#{t}</Text></View>)}</View>}
        {e.mediaUrls.length>0&&<View style={s.mediaRow}>{e.mediaUrls.slice(0,2).map((u,i)=><Image key={i} source={{uri:u}} style={s.thumb}/>)}</View>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.pageTitle}>Search</Text>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Text style={s.searchIco}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search journals, moods, tags..."
            placeholderTextColor={C.grey}
            value={query}
            onChangeText={handleSearch}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
          {query.length>0&&<TouchableOpacity onPress={()=>setQuery('')}><Text style={{color:C.grey,fontSize:16}}>✕</Text></TouchableOpacity>}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={()=>{setMoodFilter(null);setTagFilter(null);}}><Text style={s.filterIco}>☰</Text></TouchableOpacity>
      </View>

      {(moodFilter||tagFilter)&&(
        <View style={s.activeFilters}>
          {moodFilter&&<TouchableOpacity style={[s.filterChip,{backgroundColor:'#FFA72630'}]} onPress={()=>setMoodFilter(null)}><Text style={s.filterChipTxt}>{MOOD_OPTIONS.find(m=>m.value===moodFilter)?.emoji} {moodFilter} ✕</Text></TouchableOpacity>}
          {tagFilter&&<TouchableOpacity style={[s.filterChip,{backgroundColor:'#2979FF20'}]} onPress={()=>setTagFilter(null)}><Text style={[s.filterChipTxt,{color:C.blue}]}>#{tagFilter} ✕</Text></TouchableOpacity>}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recent searches — only shown if user has actually searched something */}
        {!isSearching&&recent.length>0&&(
          <>
            <View style={s.recentHeader}>
              <Text style={s.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={()=>setRecent([])}><Text style={s.clearAll}>Clear all</Text></TouchableOpacity>
            </View>
            <View style={s.tagsWrap}>
              {recent.map(t=>(
                <TouchableOpacity key={t} style={s.recentTag} onPress={()=>setQuery(t)}>
                  <Text style={s.recentTagTxt}>🕐 {t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {!isSearching&&(
          <>
            <Text style={s.sectionTitle2}>Discover by Mood</Text>
            <View style={s.discoverCard}>
              <Text style={s.discoverSub}>Tap a mood to filter entries</Text>
              <View style={s.moodGrid}>
                {DISCOVER_MOODS.map((m,i)=>(
                  <TouchableOpacity key={i} onPress={()=>setMoodFilter(prev=>prev===m.mood?null:m.mood)}
                    style={[s.discoverMoodBtn,moodFilter===m.mood&&{backgroundColor:'#00000015',borderRadius:24}]}>
                    <View style={[s.discoverMood,{backgroundColor:MOOD_OPTIONS.find(o=>o.value===m.mood)?.color??C.orange}]}>
                      <Text style={{fontSize:22}}>{m.emoji}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Top tags — only from user's actual tag usage */}
              {topTagsMap.length>0&&(
                <>
                  <Text style={s.topTagsLabel}>TOP TAGS FROM YOUR ENTRIES</Text>
                  {topTagsMap.map(([tag,count])=>(
                    <TouchableOpacity key={tag} style={[s.topTagRow,tagFilter===tag&&{backgroundColor:'#2979FF10'}]}
                      onPress={()=>setTagFilter(prev=>prev===tag?null:tag)}>
                      <Text style={[s.topTagName,tagFilter===tag&&{color:C.blue}]}>#{tag}</Text>
                      <Text style={s.topTagCount}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            <Text style={s.sectionTitle2}>Suggested for you</Text>
            {allEntries.slice(0,2).map(renderCard)}
          </>
        )}

        {isSearching&&(
          <>
            <Text style={s.sectionTitle2}>{results.length>0?`${results.length} result${results.length===1?'':'s'}`:'No results'}</Text>
            {results.length===0&&<View style={s.noResults}><Text style={{fontSize:42,marginBottom:10}}>🔍</Text><Text style={s.noResultsTxt}>No journals found</Text><Text style={s.noResultsSub}>Try a different search</Text></View>}
            {results.map(renderCard)}
          </>
        )}
        <View style={{height:100}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  pageTitle:{fontSize:26,fontWeight:'700',color:C.black,paddingHorizontal:16,paddingTop:12,paddingBottom:8},
  searchRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingBottom:10},
  searchBox:{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:'#F5F5F5',borderRadius:14,paddingHorizontal:12,height:46,gap:8},
  searchIco:{fontSize:16,color:C.grey},searchInput:{flex:1,fontSize:15,color:C.black},
  filterBtn:{width:42,height:42,backgroundColor:'#F5F5F5',borderRadius:12,alignItems:'center',justifyContent:'center'},filterIco:{fontSize:18,color:C.grey},
  activeFilters:{flexDirection:'row',gap:8,paddingHorizontal:16,paddingBottom:8,flexWrap:'wrap'},
  filterChip:{paddingHorizontal:12,paddingVertical:6,borderRadius:16},filterChipTxt:{fontSize:13,fontWeight:'600',color:C.orange},
  recentHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,marginTop:6,marginBottom:10},
  sectionTitle:{fontSize:15,fontWeight:'600',color:C.black},sectionTitle2:{fontSize:18,fontWeight:'700',color:C.black,paddingHorizontal:16,marginTop:14,marginBottom:10},
  clearAll:{fontSize:13,color:C.blue,fontWeight:'500'},
  tagsWrap:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingHorizontal:16,marginBottom:6},
  recentTag:{backgroundColor:'#F2F2F2',borderRadius:20,paddingHorizontal:14,paddingVertical:7},recentTagTxt:{fontSize:13,color:C.black,fontWeight:'500'},
  discoverCard:{marginHorizontal:14,backgroundColor:C.white,borderRadius:18,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2,marginBottom:4},
  discoverSub:{fontSize:13,color:C.grey,marginBottom:14},
  moodGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:16},
  discoverMoodBtn:{padding:2},discoverMood:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  topTagsLabel:{fontSize:11,fontWeight:'700',color:C.grey,letterSpacing:0.8,textTransform:'uppercase',marginBottom:8,marginTop:4},
  topTagRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,paddingHorizontal:8,borderRadius:8},
  topTagName:{fontSize:15,color:C.black,fontWeight:'500'},topTagCount:{fontSize:15,color:C.grey},
  card:{marginHorizontal:14,marginBottom:10,borderRadius:18,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2},
  cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  cardDay:{fontSize:28,fontWeight:'900',lineHeight:32},cardMon:{fontSize:14,fontWeight:'600',color:C.black},cardTime:{fontSize:12,color:C.grey},
  cardTitle:{fontSize:16,fontWeight:'700',marginBottom:5},cardBody:{fontSize:14,color:C.grey,lineHeight:21},
  tagsRow:{flexDirection:'row',gap:6,marginTop:8,flexWrap:'wrap'},tagChip:{paddingHorizontal:8,paddingVertical:3,borderRadius:12},tagTxt:{fontSize:11,fontWeight:'600'},
  mediaRow:{flexDirection:'row',gap:8,marginTop:10},thumb:{width:100,height:80,borderRadius:10},
  noResults:{alignItems:'center',paddingVertical:40},noResultsTxt:{fontSize:16,fontWeight:'700',color:C.black,marginBottom:6},noResultsSub:{fontSize:14,color:C.grey},
});
