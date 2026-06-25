// ─────────────────────────────────────────────
// SuperGirl — Shared Common Types
// ─────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'premium';

export type ModuleName = 'club' | 'journal' | 'fits' | 'trackers' | 'profile';

export interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
}

export interface MediaItem {
  uri:       string;
  type:      'image' | 'video';
  mimeType?: string;
  width?:    number;
  height?:   number;
  duration?: number;
}

export interface UserMention {
  id:   string;
  name: string;
}

export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';
