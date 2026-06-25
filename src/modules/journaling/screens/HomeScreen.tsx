import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import Svg, { Path, Circle } from 'react-native-svg';
import { RootState } from '../../../store';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { JournalEntry, MOOD_OPTIONS, MOOD_BG, JOURNAL_THEMES } from '../types';
import { ModuleRow, ModuleName } from '../../../shared/components/ModuleRow';
import GiftLogo from '../../../../assets/GiftLogo';
import NotificationLogo from '../../../../assets/NotificationLogo';

const C = {
  blue:    '#2979FF',
  blueBg:  '#E8F0FF',
  white:   '#FFFFFF',
  bg:      '#F4F5F7',
  black:   '#101114',
  grey:    '#8A8F98',
  lgrey:   '#AEB3BB',
  amber:   '#F5A623',
};
const F  = 'DMSans-Regular';
const FM = 'DMSans-Medium';
const FB = 'DMSans-Bold';

// "Top" pill with circled up-arrow — shown on the most recent card
function TopPill() {
  return (
    <View style={s.topPill}>
      <Text style={[s.topPillTxt, { fontFamily: FB }]}>Top</Text>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Circle cx={7} cy={7} r={6.25} stroke={C.blue} strokeWidth={1.2} fill="none" />
        <Path d="M7 4.2 L7 9.8 M4.6 6.4 L7 4 L9.4 6.4" stroke={C.blue} strokeWidth={1.2}
          fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function MoodCircle({ mood, size = 36 }: { mood: string; size?: number }) {
  const opt = MOOD_OPTIONS.find(m => m.value === mood);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MOOD_BG(mood as any), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{opt?.emoji ?? '😊'}</Text>
    </View>
  );
}

function EntryCard({ entry, isTop, onPress }: { entry: JournalEntry; isTop: boolean; onPress: () => void }) {
  const date    = new Date(entry.createdAt);
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = date.toLocaleString('en', { month: 'short' });
  const isToday = new Date().toDateString() === date.toDateString();
  const isYest  = new Date(Date.now() - 86400000).toDateString() === date.toDateString();
  const suffix  = isToday ? ', Today' : isYest ? ', Yesterday' : '';
  const time    = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  const th      = JOURNAL_THEMES.find(t => t.id === entry.theme) ?? JOURNAL_THEMES[0];
  const hasMedia = entry.mediaUrls.length > 0;

  return (
    <TouchableOpacity style={[s.card, { backgroundColor: th.card }]} onPress={onPress} activeOpacity={0.85}>
      {isTop && <TopPill />}

      <View style={s.cardTop}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
          <Text style={[s.cardDay, { color: C.black, fontFamily: FB }]}>{day}</Text>
          <Text style={[s.cardMon, { fontFamily: FM }]}>{month}{suffix}</Text>
        </View>
        <MoodCircle mood={entry.mood} />
      </View>

      {!!entry.title && (
        <Text style={[s.cardTitle, { color: entry.textColor || C.black, fontFamily: FB }]} numberOfLines={1}>
          {entry.title}
        </Text>
      )}

      <Text style={[s.cardBody, { fontFamily: F }]} numberOfLines={3}>{entry.body}</Text>

      {entry.tags.length > 0 && (
        <View style={s.tagsRow}>
          {entry.tags.slice(0, 3).map(t => (
            <View key={t} style={[s.tagChip, { backgroundColor: th.accent + '18' }]}>
              <Text style={[s.tagTxt, { color: th.accent, fontFamily: FM }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      {hasMedia && (
        <View style={s.mediaRow}>
          {entry.mediaUrls.slice(0, 2).map((u, i) => (
            <Image key={i} source={{ uri: u }} style={s.thumb} />
          ))}
          {entry.mediaUrls.length > 2 && (
            <View style={[s.thumb, s.moreMedia]}>
              <Text style={[s.moreMediaTxt, { fontFamily: FB }]}>+{entry.mediaUrls.length - 2}</Text>
            </View>
          )}
        </View>
      )}

      {!!entry.voiceNoteUrl && (
        <View style={s.voiceRow}>
          <Text style={{ fontSize: 12 }}>🎤</Text>
          <Text style={[s.voiceTxt, { fontFamily: F }]}>Voice note</Text>
        </View>
      )}

      {!hasMedia && (
        <Text style={[s.cardTime, { fontFamily: FM }]}>{time}</Text>
      )}
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const user       = useSelector((st: RootState) => st.auth?.user ?? null);
  const allEntries = useSelector((st: RootState) => st.journal.entries);
  const entries    = useMemo(() => allEntries.filter(e => !e.isPrivate && !e.isDraft), [allEntries]);
  const now        = new Date();
  const [activeModule, setActiveModule] = useState<ModuleName>('Note');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} activeOpacity={0.7} onPress={() => navigation.navigate('Profile')}>
          {user?.avatarUrl
            ? <Image source={{ uri: user.avatarUrl }} style={s.avatarImg} />
            : <View style={s.avatar}><Text style={{ fontSize: 20 }}>👩</Text></View>}
          <Text style={[s.greeting, { fontFamily: FB }]}>Hi {user?.name || 'there'}!</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={s.giftBtn} activeOpacity={0.8}>
            <GiftLogo width={18} height={18} />
            <Text style={[s.giftTxt, { fontFamily: FM }]}>Giftable</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bellBtn} activeOpacity={0.8}>
            <NotificationLogo width={22} height={22} />
            <View style={s.bellDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Module Row */}
      <ModuleRow activeModule={activeModule} onSelect={setActiveModule} />

      {/* Month / Year */}
      <View style={s.monthRow}>
        <Text style={[s.monthTxt, { fontFamily: FM }]}>{now.toLocaleString('en', { month: 'short' })}</Text>
        <Text style={[s.yearTxt, { fontFamily: FM }]}>{now.getFullYear()}</Text>
      </View>

      {/* Entry list */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4 }}>
        {entries.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyImgCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=700&q=80' }}
                style={s.emptyImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[s.emptyTitle, { fontFamily: FB }]}>Every Day is a{'\n'}fresh page</Text>
            <Text style={[s.emptySub, { fontFamily: F }]}>
              Capture your thoughts, feelings, and{'\n'}memories. Your first entry is waiting.
            </Text>
            <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('WriteEntry', {})} activeOpacity={0.85}>
              <Text style={[s.startBtnTxt, { fontFamily: FB }]}>Start Journaling</Text>
            </TouchableOpacity>
          </View>
        ) : (
          entries.map((e, i) => (
            <EntryCard
              key={e.id}
              entry={e}
              isTop={i === 0}
              onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })}
            />
          ))
        )}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, backgroundColor: C.white },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7B1FA2', alignItems: 'center', justifyContent: 'center' },
  avatarImg:   { width: 44, height: 44, borderRadius: 22 },
  greeting:    { fontSize: 21, color: C.black },
  giftBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderColor: C.blue, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8 },
  giftTxt:     { fontSize: 15, color: C.blue },
  bellBtn:     { width: 42, height: 42, borderRadius: 11, borderWidth: 1.5, borderColor: '#F5C24B', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  bellDot:     { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71', borderWidth: 1.5, borderColor: C.white },

  monthRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 8, marginTop: 14 },
  monthTxt:    { fontSize: 13, color: C.grey },
  yearTxt:     { fontSize: 13, color: C.grey },

  card:        { marginHorizontal: 14, marginBottom: 14, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  topPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.blueBg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginBottom: 12 },
  topPillTxt:  { fontSize: 12, color: C.blue },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardDay:     { fontSize: 32, lineHeight: 36 },
  cardMon:     { fontSize: 15, color: C.black },
  cardTitle:   { fontSize: 18, marginBottom: 6 },
  cardBody:    { fontSize: 14.5, color: C.grey, lineHeight: 22 },
  tagsRow:     { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tagChip:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  tagTxt:      { fontSize: 11 },
  mediaRow:    { flexDirection: 'row', gap: 10, marginTop: 12 },
  thumb:       { flex: 1, height: 112, borderRadius: 12, backgroundColor: '#EDEFF2' },
  moreMedia:   { alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000022' },
  moreMediaTxt:{ fontSize: 18, color: C.white },
  voiceRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  voiceTxt:    { fontSize: 12, color: C.grey },
  cardTime:    { fontSize: 13, color: C.lgrey, textAlign: 'right', marginTop: 10 },

  emptyWrap:   { alignItems: 'center' },
  emptyImgCard:{ marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: 'hidden', alignSelf: 'stretch' },
  emptyImage:  { width: '100%', height: 230 },
  emptyTitle:  { fontSize: 26, color: C.black, textAlign: 'center', lineHeight: 33, marginTop: 28 },
  emptySub:    { fontSize: 14.5, color: C.grey, textAlign: 'center', lineHeight: 22, marginTop: 14 },
  startBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.blue, paddingHorizontal: 32, paddingVertical: 17,
    borderRadius: 16, marginTop: 28, width: '85%',
  },
  startBtnTxt: { fontSize: 16, color: C.white },
});
