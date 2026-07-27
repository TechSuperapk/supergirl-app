import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  Posts, Comments, Events, Tickets, Groups, GroupMsgs, Communities, Members, Drafts,
} from '../models/club';
import { AppError } from '../utils/AppError';

const PAGE = 20;
const BAEHIVE = 'baehive';
const gid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const uid = (req: Request) => req.auth!.userId;
const oid = (id: string) => (mongoose.isValidObjectId(id) ? id : null);

// ── Posts ─────────────────────────────────────────────────────────────────────
export async function feed(req: Request, res: Response) {
  const { cursor, group, community, communities } = req.query as Record<string, string>;
  const q: any = {};
  if (group) q.groupId = group;
  else if (community) { q.communityIds = community; q.status = 'published'; }
  else if (communities) { q.communityIds = { $in: communities.split(',') }; q.status = 'published'; }
  if (cursor) q.createdAt = { $lt: new Date(cursor) };

  const docs = await Posts().find(q).sort({ createdAt: -1 }).limit(PAGE);
  const posts = docs.map(d => d.toJSON());
  res.json({
    posts,
    nextCursor: posts.length ? posts[posts.length - 1].createdAt : null,
    hasMore: docs.length === PAGE,
  });
}

export async function createPost(req: Request, res: Response) {
  const communityIds = Array.from(new Set([...(req.body.communityIds ?? []), BAEHIVE]));
  const doc = await Posts().create({
    ...req.body,
    authorId: uid(req),
    isAnonymous: req.body.isAnonymous ?? false,
    communityIds,
    status: req.body.status ?? 'published',
    likes: [], saves: [], commentCount: 0, viewCount: 0,
  });
  res.status(201).json({ item: doc.toJSON() });
}

export async function deletePost(req: Request, res: Response) {
  await Posts().deleteOne({ _id: req.params.id, authorId: uid(req) });
  res.json({ ok: true });
}

export async function likePost(req: Request, res: Response) {
  const op = req.body.liked ? { $pull: { likes: uid(req) } } : { $addToSet: { likes: uid(req) } };
  await Posts().updateOne({ _id: req.params.id }, op);
  res.json({ ok: true });
}

export async function savePost(req: Request, res: Response) {
  const op = req.body.saved ? { $pull: { saves: uid(req) } } : { $addToSet: { saves: uid(req) } };
  await Posts().updateOne({ _id: req.params.id }, op);
  res.json({ ok: true });
}

export async function viewPost(req: Request, res: Response) {
  await Posts().updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } });
  res.json({ ok: true });
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function getComments(req: Request, res: Response) {
  const docs = await Comments().find({ postId: req.params.id }).sort({ createdAt: 1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function addComment(req: Request, res: Response) {
  const doc = await Comments().create({
    postId: req.params.id,
    authorId: uid(req),
    authorName: req.body.authorName ?? '',
    authorAvatar: req.body.authorAvatar,
    content: req.body.content ?? '',
    likes: [], replies: [],
  });
  await Posts().updateOne({ _id: req.params.id }, { $inc: { commentCount: 1 } });
  res.status(201).json({ item: doc.toJSON() });
}

export async function addReply(req: Request, res: Response) {
  const reply = { ...req.body, id: gid() };
  await Comments().updateOne({ _id: req.params.id }, { $push: { replies: reply } });
  res.json({ item: reply });
}

export async function likeComment(req: Request, res: Response) {
  const op = req.body.liked ? { $pull: { likes: uid(req) } } : { $addToSet: { likes: uid(req) } };
  await Comments().updateOne({ _id: req.params.id }, op);
  res.json({ ok: true });
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function getEvents(_req: Request, res: Response) {
  const docs = await Events().find().sort({ startDate: 1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function createEvent(req: Request, res: Response) {
  const doc = await Events().create({ ...req.body, creatorId: uid(req), attendeeCount: 0 });
  res.status(201).json({ item: doc.toJSON() });
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function purchaseTicket(req: Request, res: Response) {
  const qrToken = `${uid(req)}_${req.body.eventId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const doc = await Tickets().create({
    ...req.body, userId: uid(req), qrToken, status: 'active', purchasedAt: new Date(),
  });
  // Best-effort attendee bump (sample events may not exist in the DB).
  const eid = oid(req.body.eventId);
  if (eid) await Events().updateOne({ _id: eid }, { $inc: { attendeeCount: 1 } }).catch(() => {});
  res.status(201).json({ item: doc.toJSON() });
}

export async function myTickets(req: Request, res: Response) {
  const docs = await Tickets().find({ userId: uid(req) }).sort({ purchasedAt: -1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function validateTicket(req: Request, res: Response) {
  await Tickets().updateOne({ _id: req.params.id }, { $set: { status: 'used' } });
  res.json({ ok: true });
}

// ── Groups ────────────────────────────────────────────────────────────────────
export async function getGroups(_req: Request, res: Response) {
  const docs = await Groups().find().sort({ memberCount: -1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function createGroup(req: Request, res: Response) {
  const doc = await Groups().create({
    ...req.body,
    creatorId: uid(req),
    memberCount: 1,
    members: [uid(req)],
    admins: [uid(req)],
  });
  res.status(201).json({ item: doc.toJSON() });
}

export async function joinGroup(req: Request, res: Response) {
  await Groups().updateOne({ _id: req.params.id }, { $addToSet: { members: uid(req) }, $inc: { memberCount: 1 } });
  res.json({ ok: true });
}

export async function leaveGroup(req: Request, res: Response) {
  await Groups().updateOne({ _id: req.params.id }, { $pull: { members: uid(req) }, $inc: { memberCount: -1 } });
  res.json({ ok: true });
}

// ── Group messages ────────────────────────────────────────────────────────────
export async function getGroupMessages(req: Request, res: Response) {
  const docs = await GroupMsgs().find({ groupId: req.params.id }).sort({ createdAt: 1 }).limit(50);
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function sendGroupMessage(req: Request, res: Response) {
  const doc = await GroupMsgs().create({ ...req.body, groupId: req.params.id, senderId: uid(req) });
  res.status(201).json({ item: doc.toJSON() });
}

// ── Communities ───────────────────────────────────────────────────────────────
export async function getCommunities(_req: Request, res: Response) {
  const docs = await Communities().find().sort({ memberCount: -1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function myMemberships(req: Request, res: Response) {
  const docs = await Members().find({ userId: uid(req) });
  res.json({ items: docs.map(d => d.toJSON()) });
}

export async function joinCommunity(req: Request, res: Response) {
  const cid = req.params.id;
  const r = await Members().updateOne(
    { communityId: cid, userId: uid(req) },
    { $setOnInsert: { communityId: cid, userId: uid(req), joinedAt: new Date() } },
    { upsert: true },
  );
  if (r.upsertedCount) {
    await Communities().updateOne({ _id: cid }, { $inc: { memberCount: 1 }, $setOnInsert: { _id: cid } }, { upsert: true });
  }
  res.json({ ok: true });
}

export async function leaveCommunity(req: Request, res: Response) {
  const cid = req.params.id;
  const r = await Members().deleteOne({ communityId: cid, userId: uid(req) });
  if (r.deletedCount) await Communities().updateOne({ _id: cid }, { $inc: { memberCount: -1 } });
  res.json({ ok: true });
}

export async function markCommunityRead(req: Request, res: Response) {
  await Members().updateOne({ communityId: req.params.id, userId: uid(req) }, { $set: { lastReadAt: new Date() } });
  res.json({ ok: true });
}

export async function ensureDefaultCommunity(req: Request, res: Response) {
  await Communities().updateOne(
    { _id: BAEHIVE },
    { $setOnInsert: { _id: BAEHIVE, name: 'Baehive', slug: 'baehive', description: 'Your Tribe. Your People. Your Safe Space.', category: 'General', memberCount: 0, isDefault: true, createdAt: new Date() } },
    { upsert: true },
  );
  const r = await Members().updateOne(
    { communityId: BAEHIVE, userId: uid(req) },
    { $setOnInsert: { communityId: BAEHIVE, userId: uid(req), joinedAt: new Date() } },
    { upsert: true },
  );
  if (r.upsertedCount) await Communities().updateOne({ _id: BAEHIVE }, { $inc: { memberCount: 1 } });
  res.json({ ok: true });
}

// ── Drafts ────────────────────────────────────────────────────────────────────
const draftJson = (d: any) => { const j = d.toJSON(); j.id = j.clientKey ?? j.id; return j; };

export async function getDrafts(req: Request, res: Response) {
  const docs = await Drafts().find({ authorId: uid(req) }).sort({ updatedAt: -1 });
  res.json({ items: docs.map(draftJson) });
}

export async function saveDraft(req: Request, res: Response) {
  const key = (req.body.id as string) || gid();
  const { id, ...draft } = req.body;
  await Drafts().updateOne(
    { authorId: uid(req), clientKey: key },
    { $set: { ...draft, authorId: uid(req), clientKey: key } },
    { upsert: true },
  );
  res.json({ id: key });
}

export async function deleteDraft(req: Request, res: Response) {
  await Drafts().deleteOne({ authorId: uid(req), clientKey: req.params.id });
  res.json({ ok: true });
}
