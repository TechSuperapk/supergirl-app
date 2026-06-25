/**
 * BackupSettingsScreen — backup/sync control center.
 * Shows last backup/sync times, pending uploads, status, and action buttons.
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBackupStore } from '../store/backupStore';
import { useJournalStore } from '../store/journalStore';
import { useBackup } from '../hooks/useBackup';
import { useJournalData } from '../../modules/journaling/offline/useJournalData';

const BLUE = '#2979FF';

function fmt(ts: number | null): string {
  if (!ts) return 'Never';
  try { return new Date(ts).toLocaleString(); } catch { return 'Never'; }
}

interface Props { uid?: string | null; onBack?: () => void; }

export function BackupSettingsScreen({ uid: uidProp, onBack }: Props) {
  const storeUid = useJournalStore(s => s.userId);
  const uid = uidProp ?? storeUid;

  const { lastBackupAt, lastSyncAt, lastRestoreAt, pendingCount, processing, restoring } =
    useBackupStore();
  const refresh = useBackupStore(s => s.refresh);

  const { backupNow, restore, syncAll, retry } = useBackup(uid);
  const { clearLocalData, restoreFromCloud, clearing, restoring: restoringCloud } = useJournalData();

  useEffect(() => { refresh(); }, [refresh]);

  const confirmClearAndRestore = () => {
    Alert.alert(
      'Clear local data',
      'This erases journals stored on this device. Your cloud backup is kept, so you can restore them right after. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: async () => {
            await clearLocalData();
            Alert.alert('Local data cleared', 'Tap "Restore from cloud" to bring your journals back.');
          } },
      ],
    );
  };

  const doRestoreFromCloud = () => {
    restoreFromCloud()
      .then(n => Alert.alert('Restored', `${n} ${n === 1 ? 'journal' : 'journals'} re-imported from the cloud.`))
      .catch(e => Alert.alert('Restore failed', e?.message ?? 'Please try again.'))
      .finally(refresh);
  };

  const status = restoring ? 'Restoring…'
    : processing ? 'Syncing…'
    : pendingCount > 0 ? `${pendingCount} pending`
    : 'Up to date';

  const run = (
    label: string,
    m: { mutateAsync: () => Promise<any>; isPending: boolean },
    done: (r: any) => string,
  ) => {
    m.mutateAsync()
      .then(r => Alert.alert(label, done(r)))
      .catch(e => Alert.alert(`${label} failed`, e?.message ?? 'Please try again.'))
      .finally(refresh);
  };

  const busy = backupNow.isPending || restore.isPending || syncAll.isPending || retry.isPending
    || clearing || restoringCloud;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={12} style={s.back}>
            <Text style={s.backArr}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={s.title}>Backup & Sync</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <Row label="Status" value={status} highlight />
          <Row label="Last backup" value={fmt(lastBackupAt)} />
          <Row label="Last sync" value={fmt(lastSyncAt)} />
          <Row label="Last restore" value={fmt(lastRestoreAt)} />
          <Row label="Pending uploads" value={String(pendingCount)} />
        </View>

        {busy && (
          <View style={s.busy}>
            <ActivityIndicator color={BLUE} />
            <Text style={s.busyT}>Working…</Text>
          </View>
        )}

        <Btn label="Back up now"
          onPress={() => run('Backup', backupNow, () => 'Your journals were backed up to the cloud.')}
          disabled={busy} />
        <Btn label="Restore data"
          onPress={() => run('Restore', restore, (r) => `Restored ${r?.journals ?? 0} journals in ${(((r?.durationMs ?? 0) / 1000)).toFixed(1)}s.`)}
          disabled={busy} kind="outline" />
        <Btn label="Sync all"
          onPress={() => run('Sync', syncAll, () => 'All pending changes synced.')}
          disabled={busy} kind="outline" />
        <Btn label="Retry failed uploads"
          onPress={() => run('Retry', retry, () => 'Retried failed uploads.')}
          disabled={busy} kind="ghost" />

        <Text style={s.sectionLabel}>JOURNAL DATA</Text>
        <Btn label="Restore Data"
          onPress={doRestoreFromCloud}
          disabled={busy} kind="outline" />
        <Btn label="Clear local data"
          onPress={confirmClearAndRestore}
          disabled={busy} kind="ghost" />

        <Text style={s.note}>
          Journals are saved on this device first and synced automatically in the
          background. They restore on any device after you sign in.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowL}>{label}</Text>
      <Text style={[s.rowV, highlight && { color: BLUE, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Btn({ label, onPress, disabled, kind = 'solid' }:
  { label: string; onPress: () => void; disabled?: boolean; kind?: 'solid' | 'outline' | 'ghost' }) {
  const style = [
    s.btn,
    kind === 'solid' && s.btnSolid,
    kind === 'outline' && s.btnOutline,
    kind === 'ghost' && s.btnGhost,
    disabled && { opacity: 0.5 },
  ];
  const txt = [s.btnT, kind !== 'solid' && { color: BLUE }];
  return (
    <TouchableOpacity style={style} onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      <Text style={txt}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6F8' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E8EC' },
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  backArr: { fontSize: 30, color: '#111', lineHeight: 30 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F1F3' },
  rowL: { fontSize: 14, color: '#6B7280' },
  rowV: { fontSize: 14, color: '#111', maxWidth: '60%', textAlign: 'right' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 4 },
  busyT: { color: BLUE, fontSize: 13 },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnSolid: { backgroundColor: BLUE },
  btnOutline: { borderWidth: 1.5, borderColor: BLUE, backgroundColor: '#FFF' },
  btnGhost: { backgroundColor: 'transparent' },
  btnT: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  sectionLabel: { fontSize: 11, color: '#9AA0A6', fontWeight: '700', letterSpacing: 0.5, marginTop: 10, marginBottom: 2, paddingLeft: 4 },
  note: { fontSize: 12, color: '#9AA0A6', textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
