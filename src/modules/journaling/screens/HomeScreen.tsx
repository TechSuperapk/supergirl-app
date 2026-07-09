// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen — Journal home (Figma: SuperBae-App-UI, node 103-157).
//
// Sections: app bar · module tabs · streak hero · journal-type grid ·
// recent journal list · quick notes grid. Tapping a journal type opens a chooser
// (Write your own vs Guided journal). All data is live from Redux + the
// quick-notes AsyncStorage store. Built with the shared theme + react-native-svg.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { JournalEntry } from '../types';
import { AppText } from '../../../shared/components/AppText';
import { AppTopNav } from '../../../shared/components/AppTopNav';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { TAB_CONTENT_H } from '../../../navigation/tabBarMetrics';
import { NoteCard, NoteCardData } from '../components/list';
import { loadNotes, stripHtml } from '../quickNotesStore';
import {
  SectionHeader,
  StreakHero,
  JournalTypeCard,
  RecentEntryCard,
  PRIMARY_TYPES,
  SECONDARY_TYPES,
  ALL_TYPES,
  JournalTypeDef,
} from '../components/home';

const RECENT_LIMIT = 3;
const NOTES_LIMIT = 4;
// Only these journal types offer the guided flow; the rest open the editor directly.
const GUIDED_TYPES = new Set(['morning', 'night', 'dream', 'vent']);

// ── Streak: consecutive days (ending today or yesterday) with an entry ─────────
function computeStreak(entries: JournalEntry[]): number {
  const days = new Set(entries.map(e => e.createdAt.slice(0, 10)));
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Real tab-bar height for this device (content height + its own safe-area
  // bottom inset) plus a little breathing room, so the last card never sits
  // under the floating FAB/tab bar on any screen size or OS.
  const scrollBottomPad = TAB_CONTENT_H + Math.max(insets.bottom, 8) + Spacing.lg;

  const allEntries = useSelector((st: RootState) => st.journal.entries);
  const entries = useMemo(
    () => allEntries.filter(e => !e.isPrivate && !e.isDraft),
    [allEntries],
  );
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const recent = useMemo(() => entries.slice(0, RECENT_LIMIT), [entries]);

  // Percentage of entries per journal type, for the banner breakdown.
  const breakdown = useMemo(() => {
    const total = entries.length || 1;
    const counts: Record<string, number> = {};
    entries.forEach(e => { const c = e.category ?? 'other'; counts[c] = (counts[c] ?? 0) + 1; });
    return ALL_TYPES.map(t => ({
      key: t.key, short: t.short, dot: t.dot,
      pct: Math.round(((counts[t.key] ?? 0) / total) * 100),
    }));
  }, [entries]);

  const [notes, setNotes] = useState<NoteCardData[]>([]);

  // Refresh quick notes whenever the tab regains focus. Loaded through the
  // same store QuickNotesScreen uses, so the tag + plain-text preview match
  // exactly (bodies are stored as HTML and need stripping for the preview).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadNotes()
        .then(list => {
          if (!alive) return;
          setNotes(list.map(n => ({ id: n.id, title: n.title, body: stripHtml(n.body), tag: n.tag })));
        })
        .catch(() => {});
      return () => { alive = false; };
    }, []),
  );

  // ── Navigation helpers ───────────────────────────────────────────────────────
  // Morning/Night/Dream/Vent land straight on the guided-style entry screen
  // (it opens on its own "Freestyle" tab by default — no more up-front "manual
  // vs guided" chooser). Quotes/Ideas/Affirmation are note-style: the plain
  // editor only, no mood step.
  const openType = (t: JournalTypeDef) => {
    if (GUIDED_TYPES.has(t.key)) {
      navigation.navigate('GuidedEntry', { title: t.label, theme: t.theme, category: t.key });
      return;
    }
    navigation.navigate('WriteEntry', { title: t.label, theme: t.theme, category: t.key, skipMood: true });
  };
  const openEntry = (id: string) => navigation.navigate('EntryDetail', { entryId: id });
  const goEntries = () => (navigation as any).navigate('Entries');
  const goNotes   = () => (navigation as any).navigate('Notes');
  const openProfile = () => navigation.navigate('Profile');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgApp }]} edges={['top']}>
      {/* Top nav — identical on every feature's home screen */}
      <AppTopNav active="journal" onBellPress={openProfile} onMenuPress={openProfile} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? Spacing.xs : Spacing.sm, paddingBottom: scrollBottomPad }}
      >
        {/* Streak hero */}
        <StreakHero streak={streak} entryCount={entries.length} chips={ALL_TYPES} breakdown={breakdown} />

        {/* Journal types — 2x2 then 3 across */}
        <View style={s.grid}>
          {PRIMARY_TYPES.map(t => (
            <JournalTypeCard key={t.key} item={t} big onPress={() => openType(t)} />
          ))}
        </View>
        <View style={s.rowThree}>
          {SECONDARY_TYPES.map(t => (
            <JournalTypeCard key={t.key} item={t} onPress={() => openType(t)} />
          ))}
        </View>

        {/* Recent Journal */}
        <View style={s.sectionSpace}>
          <SectionHeader title="Recent Journal" onAction={goEntries} />
          {recent.length > 0 ? (
            <>
              {recent.map(e => (
                <RecentEntryCard key={e.id} entry={e} onPress={() => openEntry(e.id)} />
              ))}
              <TouchableOpacity
                style={[s.viewMore, { backgroundColor: colors.bgCard, borderColor: colors.divider }]}
                activeOpacity={0.85}
                onPress={goEntries}
              >
                <AppText variant="button" color={colors.textSecondary}>View more</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <EmptyHint text="No journal entries yet. Tap a journal type above to begin." />
          )}
        </View>

        {/* Recent Notes */}
        <View style={s.sectionSpace}>
          <SectionHeader title="Recent Notes" onAction={goNotes} />
          {notes.length > 0 ? (
            notes.slice(0, NOTES_LIMIT).map(n => (
              <NoteCard key={n.id} note={n} onPress={goNotes} />
            ))
          ) : (
            <EmptyHint text="No quick notes yet. Add reminders from the Notes tab." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyHint({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s.empty, { backgroundColor: colors.bgCard, borderColor: colors.divider }]}>
      <AppText variant="body" color={colors.textMuted} align="center">{text}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // Tighter on Android specifically — iOS already fits Quotes/Ideas/
  // Affirmation on screen without scrolling; Android's system chrome/font
  // scaling was pushing that row just past the fold.
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, marginTop: Platform.OS === 'android' ? 2 : Spacing.sm, justifyContent: 'space-between' },
  rowThree: { flexDirection: 'row', paddingHorizontal: Spacing.base, marginTop: Platform.OS === 'android' ? 0 : 2, justifyContent: 'space-between' },

  sectionSpace: { marginTop: Spacing['2xl'] },

  viewMore: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },

  empty: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
  },
});
