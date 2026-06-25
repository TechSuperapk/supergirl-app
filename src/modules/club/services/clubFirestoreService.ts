/**
 * clubFirestoreService.ts
 *
 * All Firestore read/write operations for the Club module.
 * Collections:
 *   club_posts, club_comments, club_events,
 *   club_tickets, club_groups, club_group_messages
 */
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  deleteDoc, query, orderBy, limit, startAfter,
  where, arrayUnion, arrayRemove, increment,
  onSnapshot, serverTimestamp, Timestamp, writeBatch,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFileToFirebase } from '../../../services/storageService';
import {
  Post, Comment, Reply, Event, Ticket, Group, GroupMessage,
} from '../types';

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
    content:      data.content ?? '',
    mediaUrls:    data.mediaUrls ?? [],
    type:         data.type ?? 'text',
    hashtags:     data.hashtags ?? [],
    mentions:     data.mentions ?? [],
    likes:        data.likes ?? [],
    saves:        data.saves ?? [],
    commentCount: data.commentCount ?? 0,
    groupId:      data.groupId ?? undefined,
    createdAt:    toIso(data.createdAt),
    updatedAt:    toIso(data.updatedAt),
  };
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
  content:     string;
  mediaUrls:   string[];
  type:        Post['type'];
  hashtags:    string[];
  mentions:    string[];
  groupId?:    string;
}): Promise<Post> {
  const now = serverTimestamp();
  const ref = await addDoc(collection(db, 'club_posts'), {
    ...payload,
    likes:        [],
    saves:        [],
    commentCount: 0,
    createdAt:    now,
    updatedAt:    now,
  });
  const snap = await getDoc(ref);
  return snapToPost(snap);
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
  const snap = await getDoc(commentRef);
  const data = snap.data()!;
  return {
    id: snap.id,
    postId: data.postId,
    authorId: data.authorId,
    authorName: data.authorName ?? '',
    content: data.content ?? '',
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
  const snap = await getDoc(ref);
  const data = snap.data()!;
  return { id: snap.id, ...data, createdAt: new Date().toISOString() } as Event;
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function purchaseTicket(payload: {
  userId:         string;
  eventId:        string;
  eventTitle:     string;
  ticketTypeId:   string;
  ticketTypeName: string;
}): Promise<Ticket> {
  const qrToken = `${payload.userId}_${payload.eventId}_${Date.now()}`;
  const batch   = writeBatch(db);

  const ticketRef = doc(collection(db, 'club_tickets'));
  batch.set(ticketRef, {
    ...payload,
    qrToken,
    status:      'active',
    purchasedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'club_events', payload.eventId), {
    attendeeCount: increment(1),
  });
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
  const snap = await getDoc(ref);
  const data = snap.data()!;
  return { id: snap.id, ...data, createdAt: new Date().toISOString() } as Group;
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
