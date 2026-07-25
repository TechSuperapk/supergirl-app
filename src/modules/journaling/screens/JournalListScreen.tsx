// ─────────────────────────────────────────────────────────────────────────────
// JournalListScreen — Journal tab (Figma node 112-1074).
// Compact "‹ Journal" header · search bar with a calendar button beside it ·
// category filter chips (All / Morning / Night / Dream / Vent) · the full entry
// history (newest first, filterable + searchable). The calendar opens as a
// bottom popup. The + FAB opens the journal-type picker.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { RootState } from '../../../store';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { RecentEntryCard, PRIMARY_TYPES, JournalTypeDef, JOURNAL_TYPE_ICONS } from '../components/home';
import { MonthCalendarModal } from '../components/list';
import { JournalTypePicker } from '../components/JournalTypePicker';
import { TAB_CONTENT_H } from '../../../navigation/tabBarMetrics';
import CalendarLogo from '../../../../assets/images/CalenderTopLogo';
import { Caret } from '../components/Caret';

// Top filter chips only cover the 4 journal types (Quotes/Ideas/Affirmation
// are notes, not journals, so they're excluded here).
interface Chip { key: string; label: string; emoji?: string; }
const CATEGORY_TABS: Chip[] = [
  { key: 'all', label: 'All' },
  ...PRIMARY_TYPES.map(t => ({ key: t.key, label: t.short, emoji: t.emoji })),
];

// Only these journal types offer the guided flow (matches Home); the rest
// open the plain note editor directly.
const GUIDED_TYPES = new Set(['morning', 'night', 'dream', 'vent']);

export function JournalListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollBottomPad = TAB_CONTENT_H + Math.max(insets.bottom, 8) + Spacing.lg;
  const allEntries = useSelector((st: RootState) => st.journal.entries);
  const entries = useMemo(() => allEntries.filter(e => !e.isPrivate && !e.isDraft), [allEntries]);

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [day, setDay] = useState(dayjs().format('YYYY-MM-DD'));
  const [calOpen, setCalOpen] = useState(false);
  const [pickType, setPickType] = useState(false);

  const marked = useMemo(() => new Set(entries.map(e => e.createdAt.slice(0, 10))), [entries]);

  // Full history, newest first — filtered by the category chip + the search
  // query (matches title/body).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter(e => tab === 'all' || (e.category ?? 'other') === tab)
      .filter(e => !q || `${e.title ?? ''} ${e.body ?? ''}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, tab, query]);

  const onPickType = (t: JournalTypeDef) => {
    setPickType(false);
    if (GUIDED_TYPES.has(t.key)) {
      navigation.navigate('GuidedEntry', { title: t.label, theme: t.theme, category: t.key });
      return;
    }
    navigation.navigate('WriteEntry', { title: t.label, theme: t.theme, category: t.key });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgApp }]} edges={['top']}>
      {/* Header — back arrow + title */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[s.back, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <AppText variant="headingLarge" color={colors.textPrimary} style={s.title}>Journal</AppText>
      </View>

      {/* Search bar + calendar button */}
      <View style={s.searchRow}>
        <View style={[s.search, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          <SearchGlyph color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search journals....."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[s.calBtn, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
          activeOpacity={0.8}
          onPress={() => setCalOpen(true)}
        >
          <CalendarLogo width={22} height={23} />
          <Caret size={13} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Category filter chips — fixed row, all five fit across the width */}
      <View style={s.chipsRow}>
        {CATEGORY_TABS.map(c => {
          const on = c.key === tab;
          const gif = JOURNAL_TYPE_ICONS[c.key];
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.8}
              onPress={() => setTab(c.key)}
              style={[
                s.chip,
                on
                  ? { backgroundColor: '#141414' }
                  : { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
              ]}
            >
              {gif ? (
                <Image source={gif} style={s.chipIcon} contentFit="contain" autoplay />
              ) : (
                !!c.emoji && <Text style={s.chipEmoji}>{c.emoji}</Text>
              )}
              <AppText variant="label" color={on ? '#FFFFFF' : colors.textSecondary} numberOfLines={1}>{c.label}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: scrollBottomPad }}>
        {filtered.length > 0 ? (
          filtered.map(e => (
            <RecentEntryCard key={e.id} entry={e} onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })} />
          ))
        ) : (
          <View style={[s.empty, { backgroundColor: colors.bgCard, borderColor: colors.divider }]}>
            <AppText variant="body" color={colors.textMuted} align="center">
              {query.trim() ? 'No journals match your search.' : 'No journal entries yet. Tap the + button to add one.'}
            </AppText>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => setPickType(true)}>
        <Text style={s.fabPlus}>＋</Text>
      </TouchableOpacity>

      <MonthCalendarModal visible={calOpen} selected={day} markedDays={marked} onSelect={setDay} onClose={() => setCalOpen(false)} />
      <JournalTypePicker visible={pickType} onSelect={onPickType} onClose={() => setPickType(false)} />
    </SafeAreaView>
  );
}

// Simple magnifier glyph (avoids pulling in an icon dependency here).
function SearchGlyph({ color }: { color: string }) {
  return (
    <View style={sg.wrap}>
      <View style={[sg.ring, { borderColor: color }]} />
      <View style={[sg.handle, { backgroundColor: color }]} />
    </View>
  );
}
const sg = StyleSheet.create({
  wrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.6, position: 'absolute', top: 1, left: 1 },
  handle: { width: 1.6, height: 6, borderRadius: 1, position: 'absolute', right: 3, bottom: 2, transform: [{ rotate: '-45deg' }] },
});

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm },
  back: { fontSize: 30, lineHeight: 32, fontWeight: '400' },
  title: { fontFamily: 'DMSansFlex', fontWeight: '680' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.base },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 54 },
  searchInput: { flex: 1, padding: 0, fontSize: 16, lineHeight: 20 },
  calBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 54 },

  chipsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm, gap: 5 },
  chip: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  chipIcon: { width: 18, height: 18 },
  chipEmoji: { fontSize: 14 },

  empty: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.base,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl,
  },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, lineHeight: 34 },
});
