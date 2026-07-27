// dataApi — thin client for the backend's generic owner-scoped collections
// (/api/data/:collection). Replaces direct Firestore access for the simple
// modules (boards, trackers_*, fits_*). All calls are JWT-authenticated by
// apiClient, and the backend scopes everything to the signed-in user.
import { apiClient } from './apiClient';

export async function listDocs<T = any>(collection: string): Promise<T[]> {
  const r = await apiClient.get<{ items: T[] }>(`/data/${collection}`);
  return r.items ?? [];
}

export async function fetchDoc<T = any>(collection: string, id: string): Promise<T> {
  const r = await apiClient.get<{ item: T }>(`/data/${collection}/${id}`);
  return r.item;
}

export async function createDoc<T = any>(collection: string, body: any): Promise<T> {
  const r = await apiClient.post<{ item: T }>(`/data/${collection}`, body);
  return r.item;
}

export async function patchDoc<T = any>(collection: string, id: string, body: any): Promise<T> {
  const r = await apiClient.patch<{ item: T }>(`/data/${collection}/${id}`, body);
  return r.item;
}

export async function removeDoc(collection: string, id: string): Promise<void> {
  await apiClient.del(`/data/${collection}/${id}`);
}

/** Create-or-update by a natural key (e.g. one mood entry per date). */
export async function upsertDoc<T = any>(collection: string, match: any, set: any): Promise<T> {
  const r = await apiClient.put<{ item: T }>(`/data/${collection}`, { match, set });
  return r.item;
}
