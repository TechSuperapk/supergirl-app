/**
 * backupStore (Zustand) — surfaces sync/backup status to the UI.
 */
import { create } from 'zustand';
import { Meta, Queue } from '../storage/localDb';

interface BackupState {
  lastBackupAt: number | null;
  lastSyncAt: number | null;
  lastRestoreAt: number | null;
  pendingCount: number;
  processing: boolean;
  restoring: boolean;
  refresh: () => void;
  setProcessing: (p: boolean) => void;
  setRestoring: (r: boolean) => void;
}

export const useBackupStore = create<BackupState>((set) => ({
  ...Meta.get(),
  pendingCount: Queue.count(),
  processing: false,
  restoring: false,
  refresh: () => set({ ...Meta.get(), pendingCount: Queue.count() }),
  setProcessing: (processing) => set({ processing, pendingCount: Queue.count() }),
  setRestoring: (restoring) => set({ restoring }),
}));
