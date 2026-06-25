/**
 * Backup system entry point.
 *
 * Call initBackupSystem(uid) once the user is authenticated (e.g. in
 * RootNavigator after login) and teardownBackupSystem() on logout.
 * Wrap your app in <QueryClientProvider client={queryClient}> for the hooks.
 */
export * from './types';
export { useJournalStore } from './store/journalStore';
export type { JournalInput } from './store/journalStore';
export { useBackupStore } from './store/backupStore';
export { queryClient } from './queryClient';
export { useBackup } from './hooks/useBackup';
export { BackupSettingsScreen } from './screens/BackupSettingsScreen';
export { TrashScreen } from './screens/TrashScreen';

import { startQueueProcessor, stopQueueProcessor, subscribeSyncEvents } from './sync/syncQueueManager';
import { startRealtimeSync, stopRealtimeSync, onDataChanged } from './services/realtimeSyncService';
import { useJournalStore } from './store/journalStore';
import { useBackupStore } from './store/backupStore';

let unsubs: Array<() => void> = [];

/** Wire up offline storage, the sync queue, and realtime listeners for a user. */
export function initBackupSystem(uid: string): void {
  useJournalStore.getState().setUser(uid);
  useBackupStore.getState().refresh();
  useJournalStore.getState().purgeExpired();

  startQueueProcessor(uid);
  startRealtimeSync(uid);

  unsubs.push(subscribeSyncEvents(({ processing }) => {
    useBackupStore.getState().setProcessing(processing);
  }));
  unsubs.push(onDataChanged(() => {
    useJournalStore.getState().refresh();
    useBackupStore.getState().refresh();
  }));
}

export function teardownBackupSystem(): void {
  stopQueueProcessor();
  stopRealtimeSync();
  unsubs.forEach(u => { try { u(); } catch {} });
  unsubs = [];
  useJournalStore.getState().setUser(null);
}
