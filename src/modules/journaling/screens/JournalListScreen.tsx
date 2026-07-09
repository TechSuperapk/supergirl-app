// ─────────────────────────────────────────────────────────────────────────────
// JournalListScreen — Journal tab (Figma node 112-1074).
// Header + date pill · category tabs · a "today" quick-start card · the full
// entry history (newest first, filterable by type). "Start writing" opens the
// type picker and lands straight on the editor (see openType/onPickType).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { RootState } from '../../../store';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { RecentEntryCard, PRIMARY_TYPES, JournalTypeDef, JOURNAL_TYPE_ICONS } from '../components/home';
import { PageHeader, FilterTabs, FilterTab, MonthCalendarModal, TodayQuickCard } from '../components/list';
import { JournalTypePicker } from '../components/JournalTypePicker';
import { TAB_CONTENT_H } from '../../../navigation/tabBarMetrics';
import CalendarLogo from '../../../../assets/images/CalenderTopLogo';

// Top filter tabs only cover the 4 journal types (Quotes/Ideas/Affirmation
// are notes, not journals, so they're excluded here).
const CATEGORY_TABS: FilterTab[] = [
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
  const [day, setDay] = useState(dayjs().format('YYYY-MM-DD'));
  const [calOpen, setCalOpen] = useState(false);
  const [pickType, setPickType] = useState(false);

  const marked = useMemo(() => new Set(entries.map(e => e.createdAt.slice(0, 10))), [entries]);
  // Full history, newest first — filtered only by the category tab (not by
  // the header's date, which is just today's quick-entry point).
  const filtered = useMemo(
    () => entries
      .filter(e => tab === 'all' || (e.category ?? 'other') === tab)
      .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, tab],
  );

  // Start writing → pick type → straight to the editor (Morning/Night/Dream/
  // Vent land on the guided-style screen's own Freestyle tab; the rest open
  // the plain note editor). No more up-front manual/guided chooser.
  const onPickType = (t: JournalTypeDef) => {
    setPickType(false);
    if (GUIDED_TYPES.has(t.key)) {
      navigation.navigate('GuidedEntry', { title: t.label, theme: t.theme, category: t.key });
      return;
    }
    navigation.navigate('WriteEntry', { title: t.label, theme: t.theme, category: t.key });
  };

  // On the "All" tab, Start writing still asks which journal to write. On a
  // specific tab (Morning/Night/Dream/Vent), it skips the popup entirely and
  // goes straight to that journal's own editor.
  const startWriting = () => {
    if (tab === 'all') { setPickType(true); return; }
    const t = PRIMARY_TYPES.find(pt => pt.key === tab);
    if (t) onPickType(t);
  };

  const dateLabel = dayjs(day).format('D MMM YYYY');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgApp }]} edges={['top']}>
      <PageHeader
        title="Journal"
        right={
          <TouchableOpacity style={[s.datePill, { borderColor: colors.border, backgroundColor: colors.bgCard }]} activeOpacity={0.8} onPress={() => setCalOpen(true)}>
            <CalendarLogo width={18} height={20} />
            <AppText variant="bodySmall" color={colors.textPrimary} numberOfLines={1}>{dateLabel}</AppText>
            <AppText variant="bodySmall" color={colors.textMuted}> ⌄</AppText>
          </TouchableOpacity>
        }
      />
      <FilterTabs tabs={CATEGORY_TABS} active={tab} onSelect={setTab} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: scrollBottomPad }}>
        <TodayQuickCard date={day} onPress={startWriting} icon={tab !== 'all' ? JOURNAL_TYPE_ICONS[tab] : undefined} />

        {filtered.length > 0 ? (
          filtered.map(e => (
            <RecentEntryCard key={e.id} entry={e} onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })} />
          ))
        ) : (
          <View style={[s.empty, { backgroundColor: colors.bgCard, borderColor: colors.divider }]}>
            <AppText variant="body" color={colors.textMuted} align="center">
              No journal entries yet. Tap Start writing to add one.
            </AppText>
          </View>
        )}
      </ScrollView>

      <MonthCalendarModal visible={calOpen} selected={day} markedDays={marked} onSelect={setDay} onClose={() => setCalOpen(false)} />
      <JournalTypePicker visible={pickType} onSelect={onPickType} onClose={() => setPickType(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  empty: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.base,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl,
  },
});
