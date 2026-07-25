/**
 * clubFirestoreService.ts
 *
 * All Firestore read/write operations for the Club module.
 * Collections:
 *   club_posts, club_comments, club_events,
 *   club_tickets, club_groups, club_group_messages
 */
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, setDoc,
  deleteDoc, query, orderBy, limit, startAfter,
  where, arrayUnion, arrayRemove, increment,
  onSnapshot, serverTimestamp, Timestamp, writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFileToFirebase } from '../../../services/storageService';
import {
  Post, Comment, Reply, Event, Ticket, Group, GroupMessage,
  Community, CommunityMembership, Draft,
} from '../types';

// The single default/auto-join community every user belongs to. A fixed,
// well-known id (rather than looking it up by slug on every call) keeps
// `ensureDefaultCommunity`/cross-posting cheap — one doc read, or none at
// all once membership is cached client-side.
export const BAEHIVE_COMMUNITY_ID = 'baehive';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string')  return ts;
  return new Date().toISOString();
}

function snapToPost(d: DocumentSnapshot): Post {
  const data = d.data()!;
  return {
    id:           d.id,
    authorId:     data.authorId,
    authorName:   data.authorName ?? '',
    authorAvatar: data.authorAvatar ?? undefined,
    isAnonymous:  data.isAnonymous ?? false,
    content:      data.content ?? '',
    mediaUrls:    data.mediaUrls ?? [],
    type:         data.type ?? 'text',
    poll:         data.poll ?? undefined,
    hashtags:     data.hashtags ?? [],
    mentions:     data.mentions ?? [],
    likes:        data.likes ?? [],
    saves:        data.saves ?? [],
    commentCount: data.commentCount ?? 0,
    viewCount:    data.viewCount ?? 0,
    groupId:      data.groupId ?? undefined,
    communityIds: data.communityIds ?? [BAEHIVE_COMMUNITY_ID],
    status:       data.status ?? 'published',
    scheduledAt:  data.scheduledAt ? toIso(data.scheduledAt) : undefined,
    createdAt:    toIso(data.createdAt),
    updatedAt:    toIso(data.updatedAt),
  };
}

// Anonymous posts still carry the real authorId/authorName in Firestore
// (required for moderation — see types.ts's Post.isAnonymous doc comment).
// Every screen must render through this instead of touching post.authorName
// directly, so "Anonymous" is enforced in exactly one place rather than
// re-implemented (and potentially forgotten) per screen.
export function displayAuthor(post: Post): { name: string; avatar?: string } {
  if (post.isAnonymous) return { name: 'Anonymous', avatar: undefined };
  return { name: post.authorName, avatar: post.authorAvatar };
}

// ── Upload helper ─────────────────────────────────────────────────────────────
export async function uploadPostMedia(
  userId: string,
  uris: string[],
): Promise<string[]> {
  return Promise.all(
    uris.map(async (uri, i) => {
      const ext  = uri.split('.').pop() ?? 'jpg';
      const path = `club/posts/${userId}/${Date.now()}_${i}.${ext}`;
      return uploadFileToFirebase(uri, path);
    }),
  );
}

// ── Posts ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export async function fetchFeedPage(cursorDoc?: DocumentSnapshot) {
  const baseQ = query(
    collection(db, 'club_posts'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  const q = cursorDoc ? query(baseQ, startAfter(cursorDoc)) : baseQ;
  const snap = await getDocs(q);
  return {
    posts:     snap.docs.map(snapToPost),
    lastDoc:   snap.docs[snap.docs.length - 1] ?? null,
    hasMore:   snap.docs.length === PAGE_SIZE,
  };
}

export async function fetchGroupFeed(groupId: string) {
  const q = query(
    collection(db, 'club_posts'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  const snap = await getDocs(q);
  return snap.docs.map(snapToPost);
}

export async function createPost(payload: {
  authorId:    string;
  authorName:  string;
  authorAvatar?: string;
  isAnonymous?: boolean;
  content:     string;
  mediaUrls:   string[];
  type:        Post['type'];
  poll?:       Post['poll'];
  hashtags:    string[];
  mentions:    string[];
  groupId?:    string;
  /** Communities this post is tagged to (multi-select on the compose
   *  screen). Baehive is appended automatically if missing — every post
   *  mirrors into it regardless of what the user picked, per the module's
   *  cross-posting rule. */
  communityIds?: string[];
  status?:      Post['status'];
  scheduledAt?: string;
}): Promise<Post> {
  const nowIso = new Date().toISOString();
  const communityIds = Array.from(
    new Set([...(payload.communityIds ?? []), BAEHIVE_COMMUNITY_ID]),
  );
  const status = payload.status ?? 'published';
  // Build the returned Post from the payload we just sent instead of
  // re-reading the doc with getDoc(): re-reading right after a write races
  // against the doc being deleted/rules-rejected in between, which would
  // throw when snap.data() comes back undefined. We already know every
  // field we wrote, so there's nothing a re-read would tell us.
  const ref = await addDoc(collection(db, 'club_posts'), {
    ...payload,
    isAnonymous:  payload.isAnonymous ?? false,
    communityIds,
    status,
    likes:        [],
    saves:        [],
    commentCount: 0,
    viewCount:    0,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  });
  return {
    id:           ref.id,
    authorId:     payload.authorId,
    authorName:   payload.authorName,
    authorAvatar: payload.authorAvatar,
    isAnonymous:  payload.isAnonymous ?? false,
    content:      payload.content,
    mediaUrls:    payload.mediaUrls,
    type:         payload.type,
    poll:         payload.poll,
    hashtags:     payload.hashtags,
    mentions:     payload.mentions,
    likes:        [],
    saves:        [],
    commentCount: 0,
    viewCount:    0,
    groupId:      payload.groupId,
    communityIds,
    status,
    scheduledAt:  payload.scheduledAt,
    createdAt:    nowIso,
    updatedAt:    nowIso,
  };
}

/** Best-effort view counter — called once per post-detail open. Deliberately
 *  fire-and-forget at call sites (a failed view-count bump shouldn't block
 *  or error the screen), so this itself stays a plain awaitable rather than
 *  swallowing errors internally. */
export async function incrementPostView(postId: string): Promise<void> {
  await updateDoc(doc(db, 'club_posts', postId), { viewCount: increment(1) });
}

/** Home feed: every post from every community the user has joined, newest
 *  first. Firestore's `array-contains-any` caps out at 10 values, so beyond
 *  that we fall back to Baehive alone (which already mirrors everything) —
 *  in practice this only matters for a user who's joined 10+ communities. */
export async function fetchHomeFeed(joinedCommunityIds: string[], cursorDoc?: DocumentSnapshot) {
  const ids = joinedCommunityIds.length ? joinedCommunityIds.slice(0, 10) : [BAEHIVE_COMMUNITY_ID];
  const baseQ = query(
    collection(db, 'club_posts'),
    where('communityIds', 'array-contains-any', ids),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  const q = cursorDoc ? query(baseQ, startAfter(cursorDoc)) : baseQ;
  const snap = await getDocs(q);
  return {
    posts:   snap.docs.map(snapToPost),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

/** Individual club/community page feed — ONLY posts tagged to this specific
 *  community (not the cross-community mix fetchHomeFeed returns). */
export async function fetchCommunityFeed(communityId: string, cursorDoc?: DocumentSnapshot) {
  const baseQ = query(
    collection(db, 'club_posts'),
    where('communityIds', 'array-contains', communityId),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  const q = cursorDoc ? query(baseQ, startAfter(cursorDoc)) : baseQ;
  const snap = await getDocs(q);
  return {
    posts:   snap.docs.map(snapToPost),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, 'club_posts', postId));
}

export async function toggleLikePost(postId: string, userId: string, liked: boolean) {
  await updateDoc(doc(db, 'club_posts', postId), {
    likes: liked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

export async function toggleSavePost(postId: string, userId: string, saved: boolean) {
  await updateDoc(doc(db, 'club_posts', postId), {
    saves: saved ? arrayRemove(userId) : arrayUnion(userId),
  });
}

export function subscribeToFeed(
  onUpdate: (posts: Post[]) => void,
) {
  const q = query(
    collection(db, 'club_posts'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map(snapToPost));
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<Comment[]> {
  const q = query(
    collection(db, 'club_comments'),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:           d.id,
      postId:       data.postId,
      authorId:     data.authorId,
      authorName:   data.authorName ?? '',
      authorAvatar: data.authorAvatar ?? undefined,
      content:      data.content ?? '',
      likes:        data.likes ?? [],
      replies:      data.replies ?? [],
      createdAt:    toIso(data.createdAt),
    } as Comment;
  });
}

export async function addComment(payload: {
  postId:       string;
  authorId:     string;
  authorName:   string;
  authorAvatar?: string;
  content:      string;
}): Promise<Comment> {
  const batch = writeBatch(db);
  const commentRef = doc(collection(db, 'club_comments'));
  batch.set(commentRef, { ...payload, likes: [], replies: [], createdAt: serverTimestamp() });
  batch.update(doc(db, 'club_posts', payload.postId), { commentCount: increment(1) });
  await batch.commit();
  // Built from the payload we just wrote — see createPost for why this
  // avoids a racy getDoc()+data()! re-read right after the write.
  return {
    id: commentRef.id,
    postId: payload.postId,
    authorId: payload.authorId,
    authorName: payload.authorName ?? '',
    authorAvatar: payload.authorAvatar,
    content: payload.content ?? '',
    likes: [],
    replies: [],
    createdAt: new Date().toISOString(),
  };
}

export async function addReply(commentId: string, reply: Omit<Reply, 'id'>) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await updateDoc(doc(db, 'club_comments', commentId), {
    replies: arrayUnion({ ...reply, id }),
  });
}

export async function toggleLikeComment(commentId: string, userId: string, liked: boolean) {
  await updateDoc(doc(db, 'club_comments', commentId), {
    likes: liked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function fetchEvents(): Promise<Event[]> {
  const q = query(
    collection(db, 'club_events'),
    orderBy('startDate', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:            d.id,
      creatorId:     data.creatorId,
      title:         data.title ?? '',
      description:   data.description ?? '',
      coverUrl:      data.coverUrl ?? undefined,
      location:      data.location ?? '',
      startDate:     toIso(data.startDate),
      endDate:       toIso(data.endDate),
      ticketTypes:   data.ticketTypes ?? [],
      attendeeCount: data.attendeeCount ?? 0,
      createdAt:     toIso(data.createdAt),
    } as Event;
  });
}

export async function createEvent(
  payload: Omit<Event, 'id' | 'attendeeCount' | 'createdAt'>,
  coverLocalUri?: string,
): Promise<Event> {
  let coverUrl = payload.coverUrl;
  if (coverLocalUri) {
    const ext  = coverLocalUri.split('.').pop() ?? 'jpg';
    const path = `club/events/${payload.creatorId}/${Date.now()}.${ext}`;
    coverUrl   = await uploadFileToFirebase(coverLocalUri, path);
  }
  const ref = await addDoc(collection(db, 'club_events'), {
    ...payload,
    coverUrl,
    attendeeCount: 0,
    createdAt:     serverTimestamp(),
  });
  // Built from the payload we just wrote — see createPost for why this
  // avoids a racy getDoc()+data()! re-read right after the write.
  return { ...payload, id: ref.id, coverUrl, attendeeCount: 0, createdAt: new Date().toISOString() } as Event;
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function purchaseTicket(payload: {
  userId:         string;
  eventId:        string;
  eventTitle:     string;
  ticketTypeId:   string;
  ticketTypeName: string;
  bookingId?:     string;
}): Promise<Ticket> {
  const qrToken = `${payload.userId}_${payload.eventId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const batch   = writeBatch(db);

  const ticketRef = doc(collection(db, 'club_tickets'));
  batch.set(ticketRef, {
    ...payload,
    qrToken,
    status:      'active',
    purchasedAt: serverTimestamp(),
  });
  // merge:true (not update) so booking a template/sample event whose doc
  // doesn't exist in Firestore yet still succeeds — it creates the event doc
  // with the incremented attendee count instead of failing the whole batch.
  batch.set(
    doc(db, 'club_events', payload.eventId),
    { attendeeCount: increment(1) },
    { merge: true },
  );
  await batch.commit();

  return {
    id:             ticketRef.id,
    ...payload,
    qrToken,
    status:         'active',
    purchasedAt:    new Date().toISOString(),
  };
}

export async function fetchMyTickets(userId: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'club_tickets'),
    where('userId', '==', userId),
    orderBy('purchasedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, purchasedAt: toIso(data.purchasedAt) } as Ticket;
  });
}

export async function validateTicket(ticketId: string): Promise<void> {
  await updateDoc(doc(db, 'club_tickets', ticketId), { status: 'used' });
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function fetchGroups(): Promise<Group[]> {
  const q = query(collection(db, 'club_groups'), orderBy('memberCount', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:          d.id,
      name:        data.name ?? '',
      description: data.description ?? '',
      coverUrl:    data.coverUrl ?? undefined,
      creatorId:   data.creatorId,
      memberCount: data.memberCount ?? 0,
      isPrivate:   data.isPrivate ?? false,
      createdAt:   toIso(data.createdAt),
    } as Group;
  });
}

export async function createGroup(payload: {
  name:        string;
  description: string;
  creatorId:   string;
  isPrivate:   boolean;
  coverLocalUri?: string;
}): Promise<Group> {
  let coverUrl: string | undefined;
  if (payload.coverLocalUri) {
    const ext  = payload.coverLocalUri.split('.').pop() ?? 'jpg';
    const path = `club/groups/${payload.creatorId}/${Date.now()}.${ext}`;
    coverUrl   = await uploadFileToFirebase(payload.coverLocalUri, path);
  }
  const ref = await addDoc(collection(db, 'club_groups'), {
    name:        payload.name,
    description: payload.description,
    creatorId:   payload.creatorId,
    isPrivate:   payload.isPrivate,
    coverUrl:    coverUrl ?? null,
    memberCount: 1,
    members:     [payload.creatorId],
    admins:      [payload.creatorId],
    createdAt:   serverTimestamp(),
  });
  // Built from the payload we just wrote — see createPost for why this
  // avoids a racy getDoc()+data()! re-read right after the write.
  return {
    id:          ref.id,
    name:        payload.name,
    description: payload.description,
    coverUrl,
    creatorId:   payload.creatorId,
    memberCount: 1,
    isPrivate:   payload.isPrivate,
    createdAt:   new Date().toISOString(),
  } as Group;
}

export async function joinGroup(groupId: string, userId: string) {
  await updateDoc(doc(db, 'club_groups', groupId), {
    members:     arrayUnion(userId),
    memberCount: increment(1),
  });
}

export async function leaveGroup(groupId: string, userId: string) {
  await updateDoc(doc(db, 'club_groups', groupId), {
    members:     arrayRemove(userId),
    memberCount: increment(-1),
  });
}

// ── Group Messages ────────────────────────────────────────────────────────────
const MSG_PAGE = 50;

export function subscribeToGroupMessages(
  groupId:  string,
  onUpdate: (msgs: GroupMessage[]) => void,
) {
  const q = query(
    collection(db, 'club_group_messages'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'asc'),
    limit(MSG_PAGE),
  );
  return onSnapshot(q, (snap) => {
    const msgs: GroupMessage[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id:           d.id,
        groupId:      data.groupId,
        senderId:     data.senderId,
        senderName:   data.senderName ?? '',
        senderAvatar: data.senderAvatar ?? undefined,
        content:      data.content ?? '',
        mediaUrl:     data.mediaUrl ?? undefined,
        createdAt:    toIso(data.createdAt),
      } as GroupMessage;
    });
    onUpdate(msgs);
  });
}

export async function sendGroupMessage(payload: {
  groupId:     string;
  senderId:    string;
  senderName:  string;
  senderAvatar?: string;
  content:     string;
  mediaUrl?:   string;
}): Promise<void> {
  await addDoc(collection(db, 'club_group_messages'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

// ── Communities ("Hives") ─────────────────────────────────────────────────────
// Separate from Groups (small opt-in chat groups, above) — see types.ts's
// Community doc comment. Membership is its own collection
// (`club_community_members`) with a deterministic doc id (`${communityId}_
// ${userId}`) so "is this user already a member" is a single get-by-id
// instead of a query, and joins are naturally idempotent (re-joining just
// overwrites the same doc).
const membershipId = (communityId: string, userId: string) => `${communityId}_${userId}`;

export async function fetchCommunities(): Promise<Community[]> {
  const q = query(collection(db, 'club_communities'), orderBy('memberCount', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:          d.id,
      name:        data.name ?? '',
      slug:        data.slug ?? d.id,
      description: data.description ?? '',
      iconUrl:     data.iconUrl ?? undefined,
      category:    data.category ?? undefined,
      memberCount: data.memberCount ?? 0,
      isDefault:   data.isDefault ?? false,
      createdAt:   toIso(data.createdAt),
    } as Community;
  });
}

export async function fetchMyCommunityMemberships(userId: string): Promise<CommunityMembership[]> {
  const q = query(collection(db, 'club_community_members'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      communityId: data.communityId,
      userId:      data.userId,
      joinedAt:    toIso(data.joinedAt),
      lastReadAt:  data.lastReadAt ? toIso(data.lastReadAt) : undefined,
    } as CommunityMembership;
  });
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'club_community_members', membershipId(communityId, userId)), {
    communityId, userId, joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'club_communities', communityId), { memberCount: increment(1) });
  await batch.commit();
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'club_community_members', membershipId(communityId, userId)));
  batch.update(doc(db, 'club_communities', communityId), { memberCount: increment(-1) });
  await batch.commit();
}

export async function markCommunityRead(communityId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'club_community_members', membershipId(communityId, userId)), {
    lastReadAt: serverTimestamp(),
  });
}

/** Auto-joins the user to Baehive on first login. Safe to call on every
 *  login (idempotent doc-id write, `merge: true` — never double-counts
 *  memberCount because `updateDoc(increment(1))` only runs the first time
 *  the membership doc is created). Also creates the Baehive community
 *  itself if it doesn't exist yet (first user ever). */
export async function ensureDefaultCommunity(userId: string): Promise<void> {
  const memberRef = doc(db, 'club_community_members', membershipId(BAEHIVE_COMMUNITY_ID, userId));
  const communityRef = doc(db, 'club_communities', BAEHIVE_COMMUNITY_ID);
  const [memberSnap, communitySnap] = await Promise.all([getDoc(memberRef), getDoc(communityRef)]);

  if (memberSnap.exists() && communitySnap.exists()) return; // already set up, nothing to do

  const batch = writeBatch(db);
  if (!communitySnap.exists()) {
    // First user ever: create the community with the count already at 1
    // instead of set(0) + a separate update(increment(1)) on the same doc
    // in the same batch — some Firestore SDK versions disallow more than
    // one write to the same document within a single batch.
    batch.set(communityRef, {
      name: 'Baehive', slug: 'baehive', description: 'Your Tribe. Your People. Your Safe Space.',
      category: 'General', memberCount: 1, isDefault: true, createdAt: serverTimestamp(),
    });
  } else if (!memberSnap.exists()) {
    batch.update(communityRef, { memberCount: increment(1) });
  }
  if (!memberSnap.exists()) {
    batch.set(memberRef, { communityId: BAEHIVE_COMMUNITY_ID, userId, joinedAt: serverTimestamp() });
  }
  await batch.commit();
}

// ── Drafts ────────────────────────────────────────────────────────────────────
export async function fetchDrafts(userId: string): Promise<Draft[]> {
  const q = query(
    collection(db, 'club_drafts'),
    where('authorId', '==', userId),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:           d.id,
      authorId:     data.authorId,
      title:        data.title ?? undefined,
      content:      data.content ?? '',
      mediaUrls:    data.mediaUrls ?? [],
      hashtags:     data.hashtags ?? [],
      isAnonymous:  data.isAnonymous ?? false,
      communityIds: data.communityIds ?? [],
      updatedAt:    toIso(data.updatedAt),
    } as Draft;
  });
}

/** Upserts a draft with setDoc(..., {merge:true}) — works identically
 *  whether `id` points at an existing draft (debounced autosave while
 *  composing) or a brand-new one (exit-intent popup's "Save as Draft"),
 *  no existence check needed either way. Pass an explicit `id` when the
 *  compose screen has already generated one client-side so repeated
 *  autosaves land on the same doc instead of creating a new draft each time. */
export async function saveDraft(
  userId: string,
  draft: Omit<Draft, 'id' | 'authorId' | 'updatedAt'>,
  id?: string,
): Promise<string> {
  const ref = id ? doc(db, 'club_drafts', id) : doc(collection(db, 'club_drafts'));
  await setDoc(ref, { ...draft, authorId: userId, updatedAt: serverTimestamp() }, { merge: true });
  return ref.id;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await deleteDoc(doc(db, 'club_drafts', draftId));
}
