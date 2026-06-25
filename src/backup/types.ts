/**
 * Backup / Sync / Restore — shared TypeScript interfaces.
 * Offline-first: every entity carries a syncStatus + soft-delete fields.
 */

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type SyncAction = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type EntityType = 'journal' | 'settings' | 'reminder' | 'template' | 'profile';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  images: string[];   // remote https URLs once synced; may hold local file URIs while pending
  videos: string[];
  audio: string[];
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  isDeleted: boolean;
  deletedAt?: number | null;
}

export interface AppSettings {
  id: string;
  userId: string;
  theme?: 'light' | 'dark' | 'system';
  reminderEnabled?: boolean;
  language?: string;
  [key: string]: any;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  time: number;            // epoch ms
  repeat?: 'none' | 'daily' | 'weekly';
  enabled: boolean;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  content: string;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: SyncAction;
  status: QueueStatus;
  retries: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
}

export interface BackupMeta {
  lastBackupAt: number | null;
  lastSyncAt: number | null;
  lastRestoreAt: number | null;
}

export interface Statistics {
  totalEntries: number;
  totalPrivate: number;
  moods: Record<string, number>;
  tags: Record<string, number>;
  computedAt: number;
}

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const MAX_RETRIES = 5;
export const QUEUE_INTERVAL_MS = 30 * 1000; // 30 seconds
