/**
 * realtimeSyncService — Firestore snapshot listeners for live multi-device sync.
 * Changes made on Device A appear on Device B: we merge into the local DB
 * (latest-update-wins) and notify subscribers so the UI refreshes instantly.
 */
// Firestore realtime multi-device sync — DISABLED. All data now lives on the
// app's own backend; this redundant Firestore layer is stubbed to a no-op so
// there's no Firebase dependency. The local-changed pub/sub is kept.

type Listener = () => void;
const subscribers = new Set<Listener>();

/** Subscribe to local-data-changed notifications (UI refresh hook). */
export function onDataChanged(fn: Listener): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** No-op: realtime sync is handled by backend polling now. */
export function startRealtimeSync(_uid: string): () => void {
  return stopRealtimeSync;
}

export function stopRealtimeSync(): void { /* no-op */ }
