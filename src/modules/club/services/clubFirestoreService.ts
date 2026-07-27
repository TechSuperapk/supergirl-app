/**
 * clubFirestoreService.ts
 *
 * Now backed by the app's own API (MongoDB) via /api/club/* instead of
 * Firestore. Realtime listeners (subscribeToFeed / subscribeToGroupMessages)
 * are reimplemented as lightweight polling. Media uploads go to S3. Exported
 * names/signatures are unchanged so screens don't need edits.
 */
import { apiClient } from '../../../services/apiClient';
import { uploadFileToFirebase } from '../../../services/storageService';
import {
  Post, Comment, Reply, Event, Ticket, Group, GroupMessage,
  Community, CommunityMembership, Draft,
} from '../types';

export const BAEHIVE_COMMUNITY_ID = 'baehive';

// Anonymous posts still carry the real author fields; enforce "Anonymous" here.
export function displayAuthor(post: Post): { name: string; avatar?: string } {
  if (post.isAnonymous) return { name: 'Anonymous', avatar: undefined };
  return { name: post.authorName, avatar: post.authorAvatar };
}

// ── Upload helper (S3) ────────────────────────────────────────────────────────
export async function uploadPostMedia(userId: string, uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(async (uri, i) => {
    const ext = uri.split('.').pop() ?? 'jpg';
    return uploadFileToFirebase(uri, `club/posts/${userId}/${Date.now()}_${i}.${ext}`);
  }));
}

// ── Posts ─────────────────────────────────────────────────────────────────────
type FeedPage = { posts: Post[]; lastDoc: string | null; hasMore: boolean };
const mapFeed = (r: { posts: Post[]; nextCursor: string | null; hasMore: boolean }): FeedPage =>
  ({ posts: r.posts, lastDoc: r.nextCursor, hasMore: r.hasMore });

export async function fetchFeedPage(cursor?: any): Promise<FeedPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return mapFeed(await apiClient.get(`/club/posts${qs}`));
}

export async function fetchGroupFeed(groupId: string): Promise<Post[]> {
  const r = await apiClient.get<{ posts: Post[] }>(`/club/posts?group=${encodeURIComponent(groupId)}`);
  return r.posts;
}

export async function fetchHomeFeed(joinedCommunityIds: string[], cursor?: any): Promise<FeedPage> {
  const ids = joinedCommunityIds.length ? joinedCommunityIds : [BAEHIVE_COMMUNITY_ID];
  let qs = `?communities=${encodeURIComponent(ids.join(','))}`;
  if (cursor) qs += `&cursor=${encodeURIComponent(cursor)}`;
  return mapFeed(await apiClient.get(`/club/posts${qs}`));
}

export async function fetchCommunityFeed(communityId: string, cursor?: any): Promise<FeedPage> {
  let qs = `?community=${encodeURIComponent(communityId)}`;
  if (cursor) qs += `&cursor=${encodeURIComponent(cursor)}`;
  return mapFeed(await apiClient.get(`/club/posts${qs}`));
}

export async function createPost(payload: any): Promise<Post> {
  const r = await apiClient.post<{ item: Post }>('/club/posts', payload);
  return r.item;
}

export async function incrementPostView(postId: string): Promise<void> {
  await apiClient.post(`/club/posts/${postId}/view`);
}

export async function deletePost(postId: string): Promise<void> {
  await apiClient.del(`/club/posts/${postId}`);
}

export async function toggleLikePost(postId: string, _userId: string, liked: boolean): Promise<void> {
  await apiClient.post(`/club/posts/${postId}/like`, { liked });
}

export async function toggleSavePost(postId: string, _userId: string, saved: boolean): Promise<void> {
  await apiClient.post(`/club/posts/${postId}/save`, { saved });
}

// Polling replacement for the old Firestore onSnapshot feed listener.
export function subscribeToFeed(onUpdate: (posts: Post[]) => void) {
  let alive = true;
  const poll = async () => { try { const r = await fetchFeedPage(); if (alive) onUpdate(r.posts); } catch { /* ignore */ } };
  poll();
  const t = setInterval(poll, 6000);
  return () => { alive = false; clearInterval(t); };
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<Comment[]> {
  const r = await apiClient.get<{ items: Comment[] }>(`/club/posts/${postId}/comments`);
  return r.items;
}

export async function addComment(payload: {
  postId: string; authorId: string; authorName: string; authorAvatar?: string; content: string;
}): Promise<Comment> {
  const r = await apiClient.post<{ item: Comment }>(`/club/posts/${payload.postId}/comments`, payload);
  return r.item;
}

export async function addReply(commentId: string, reply: Omit<Reply, 'id'>): Promise<void> {
  await apiClient.post(`/club/comments/${commentId}/reply`, reply);
}

export async function toggleLikeComment(commentId: string, _userId: string, liked: boolean): Promise<void> {
  await apiClient.post(`/club/comments/${commentId}/like`, { liked });
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function fetchEvents(): Promise<Event[]> {
  const r = await apiClient.get<{ items: Event[] }>('/club/events');
  return r.items;
}

export async function createEvent(payload: Omit<Event, 'id' | 'attendeeCount' | 'createdAt'>, coverLocalUri?: string): Promise<Event> {
  let coverUrl = payload.coverUrl;
  if (coverLocalUri) {
    const ext = coverLocalUri.split('.').pop() ?? 'jpg';
    coverUrl = await uploadFileToFirebase(coverLocalUri, `club/events/${payload.creatorId}/${Date.now()}.${ext}`);
  }
  const r = await apiClient.post<{ item: Event }>('/club/events', { ...payload, coverUrl });
  return r.item;
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function purchaseTicket(payload: any): Promise<Ticket> {
  const r = await apiClient.post<{ item: Ticket }>('/club/tickets', payload);
  return r.item;
}

export async function fetchMyTickets(_userId: string): Promise<Ticket[]> {
  const r = await apiClient.get<{ items: Ticket[] }>('/club/tickets');
  return r.items;
}

export async function validateTicket(ticketId: string): Promise<void> {
  await apiClient.post(`/club/tickets/${ticketId}/validate`);
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function fetchGroups(): Promise<Group[]> {
  const r = await apiClient.get<{ items: Group[] }>('/club/groups');
  return r.items;
}

export async function createGroup(payload: {
  name: string; description: string; creatorId: string; isPrivate: boolean; coverLocalUri?: string;
}): Promise<Group> {
  let coverUrl: string | undefined;
  if (payload.coverLocalUri) {
    const ext = payload.coverLocalUri.split('.').pop() ?? 'jpg';
    coverUrl = await uploadFileToFirebase(payload.coverLocalUri, `club/groups/${payload.creatorId}/${Date.now()}.${ext}`);
  }
  const { coverLocalUri, ...rest } = payload;
  const r = await apiClient.post<{ item: Group }>('/club/groups', { ...rest, coverUrl });
  return r.item;
}

export async function joinGroup(groupId: string, _userId: string): Promise<void> {
  await apiClient.post(`/club/groups/${groupId}/join`);
}

export async function leaveGroup(groupId: string, _userId: string): Promise<void> {
  await apiClient.post(`/club/groups/${groupId}/leave`);
}

// ── Group messages (polling) ──────────────────────────────────────────────────
export function subscribeToGroupMessages(groupId: string, onUpdate: (msgs: GroupMessage[]) => void) {
  let alive = true;
  const poll = async () => {
    try {
      const r = await apiClient.get<{ items: GroupMessage[] }>(`/club/groups/${groupId}/messages`);
      if (alive) onUpdate(r.items);
    } catch { /* ignore */ }
  };
  poll();
  const t = setInterval(poll, 4000);
  return () => { alive = false; clearInterval(t); };
}

export async function sendGroupMessage(payload: {
  groupId: string; senderId: string; senderName: string; senderAvatar?: string; content: string; mediaUrl?: string;
}): Promise<void> {
  await apiClient.post(`/club/groups/${payload.groupId}/messages`, payload);
}

// ── Communities ───────────────────────────────────────────────────────────────
export async function fetchCommunities(): Promise<Community[]> {
  const r = await apiClient.get<{ items: Community[] }>('/club/communities');
  return r.items;
}

export async function fetchMyCommunityMemberships(_userId: string): Promise<CommunityMembership[]> {
  const r = await apiClient.get<{ items: CommunityMembership[] }>('/club/communities/memberships');
  return r.items;
}

export async function joinCommunity(communityId: string, _userId: string): Promise<void> {
  await apiClient.post(`/club/communities/${communityId}/join`);
}

export async function leaveCommunity(communityId: string, _userId: string): Promise<void> {
  await apiClient.post(`/club/communities/${communityId}/leave`);
}

export async function markCommunityRead(communityId: string, _userId: string): Promise<void> {
  await apiClient.post(`/club/communities/${communityId}/read`);
}

export async function ensureDefaultCommunity(_userId: string): Promise<void> {
  await apiClient.post('/club/communities/ensure-default');
}

// ── Drafts ────────────────────────────────────────────────────────────────────
export async function fetchDrafts(_userId: string): Promise<Draft[]> {
  const r = await apiClient.get<{ items: Draft[] }>('/club/drafts');
  return r.items;
}

export async function saveDraft(_userId: string, draft: Omit<Draft, 'id' | 'authorId' | 'updatedAt'>, id?: string): Promise<string> {
  const r = await apiClient.put<{ id: string }>('/club/drafts', { ...draft, id });
  return r.id;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await apiClient.del(`/club/drafts/${draftId}`);
}
