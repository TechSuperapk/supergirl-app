// ─────────────────────────────────────────────────────────────────────────────
// QuickNotesScreen — Notes tab (Figma node 290-789).
// Tag tabs + composer card + tagged note cards. Notes open the full-screen
// rich NoteEditor. Persisted via the shared quickNotesStore.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { PageHeader, FilterTabs, NoteComposerCard, NoteCard, NoteCardData, NOTE_TABS } from '../components/list';
import { QuickNoteRecord, loadNotes, removeNote, stripHtml } from '../quickNotesStore';
import { TAB_CONTENT_H } from '../../../navigation/tabBarMetrics';
import { NoteTypePicker } from '../components/NoteTypePicker';
import { SECONDARY_TYPES, JournalTypeDef, JOURNAL_TYPE_ICONS } from '../components/home';

export function QuickNotesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<JournalStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollBottomPad = TAB_CONTENT_H + Math.max(insets.bottom, 8) + Spacing.lg;
  const [notes, setNotes] = useState<QuickNoteRecord[]>([]);
  const [tab, setTab] = useState('all');
  const [pickType, setPickType] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    loadNotes().then(list => { if (alive) setNotes(list); });
    return () => { alive = false; };
  }, []));

  const visible = useMemo(() => {
    const sorted = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return tab === 'all' ? sorted : sorted.filter(n => n.tag === tab);
  }, [notes, tab]);

  const onPickType = (t: JournalTypeDef) => {
    setPickType(false);
    navigation.navigate('NoteEditor', { tag: t.key });
  };

  // On the "All" tab, Start writing shows the Quotes/Ideas/Affirmation
  // picker. On a specific tab, it skips the popup and opens that note type's
  // editor directly (same pattern as the Journal tab's Start writing).
  const startWriting = () => {
    if (tab === 'all') { setPickType(true); return; }
    const t = SECONDARY_TYPES.find(st => st.key === tab);
    if (t) onPickType(t);
    else navigation.navigate('NoteEditor', {});
  };

  const openNote = (n: QuickNoteRecord) => navigation.navigate('NoteEditor', { noteId: n.id });
  const del = (n: QuickNoteRecord) => Alert.alert('Delete note?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => setNotes(await removeNote(n.id)) },
  ]);

  const toCard = (n: QuickNoteRecord): NoteCardData => ({
    id: n.id, title: n.title, body: stripHtml(n.body), tag: n.tag,
    checklist: n.checklist?.length ? { done: n.checklist.filter(i => i.done).length, total: n.checklist.length } : undefined,
  });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgApp }]} edges={['top']}>
      <PageHeader title="Quick Notes" subtitle={`Reflection for ${dayjs().format('MMMM YYYY')}`} />
      <FilterTabs tabs={NOTE_TABS} active={tab} onSelect={setTab} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: scrollBottomPad }}>
        <NoteComposerCard onStart={startWriting} onAddTag={() => setPickType(true)} icon={tab !== 'all' ? JOURNAL_TYPE_ICONS[tab] : undefined} />
        <View style={{ height: Spacing.base }} />
        {visible.map(n => (
          <NoteCard key={n.id} note={toCard(n)} onPress={() => openNote(n)} onLongPress={() => del(n)} />
        ))}
        {visible.length === 0 && (
          <View style={[s.empty, { backgroundColor: colors.bgCard, borderColor: colors.divider }]}>
            <AppText variant="body" color={colors.textMuted} align="center">No notes here yet.</AppText>
          </View>
        )}
      </ScrollView>

      <NoteTypePicker visible={pickType} onSelect={onPickType} onClose={() => setPickType(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  empty: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl },
});
