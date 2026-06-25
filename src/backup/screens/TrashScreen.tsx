/**
 * TrashScreen — soft-deleted journals (kept 30 days). Restore or delete forever.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJournalStore } from '../store/journalStore';
import { Journals } from '../storage/localDb';
import { enqueue } from '../sync/syncQueueManager';
import { TRASH_RETENTION_MS, JournalEntry } from '../types';

const BLUE = '#2979FF';
const RED = '#E5484D';

function daysLeft(deletedAt?: number | null): number {
  if (!deletedAt) return 30;
  return Math.max(0, Math.ceil((TRASH_RETENTION_MS - (Date.now() - deletedAt)) / (24 * 60 * 60 * 1000)));
}

interface Props { onBack?: () => void; }

export function TrashScreen({ onBack }: Props) {
  const trashed = useJournalStore(s => s.trashed);
  const restore = useJournalStore(s => s.restore);
  const refresh = useJournalStore(s => s.refresh);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteForever = (id: string) => {
    Alert.alert('Delete forever', 'This permanently removes the journal. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          Journals.remove(id);
          enqueue('journal', id, 'delete');
          refresh();
        } },
    ]);
  };

  const renderItem = ({ item }: { item: JournalEntry }) => (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={s.cardSub} numberOfLines={1}>{item.content || 'No content'}</Text>
        <Text style={s.cardMeta}>Deletes in {daysLeft(item.deletedAt)} day(s)</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={() => restore(item.id)} style={[s.pill, s.pillBlue]}>
          <Text style={s.pillBlueT}>Restore</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteForever(item.id)} style={[s.pill, s.pillRed]}>
          <Text style={s.pillRedT}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={12} style={s.back}>
            <Text style={s.backArr}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={s.title}>Trash</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={trashed}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.scroll}
        ListEmptyComponent={<Text style={s.empty}>Trash is empty.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6F8' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E8EC' },
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  backArr: { fontSize: 30, color: '#111', lineHeight: 30 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  scroll: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#9AA0A6', marginTop: 6 },
  actions: { gap: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  pillBlue: { backgroundColor: '#EAF1FF' },
  pillBlueT: { color: BLUE, fontWeight: '700', fontSize: 13 },
  pillRed: { backgroundColor: '#FDECEC' },
  pillRedT: { color: RED, fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9AA0A6', marginTop: 40, fontSize: 14 },
});
