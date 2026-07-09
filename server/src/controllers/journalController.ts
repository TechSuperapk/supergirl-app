import { Request, Response } from 'express';
import { JournalEntryModel } from '../models/JournalEntry';
import { journalEntrySchema, journalEntryUpdateSchema, listQuerySchema } from '../validators/journalValidators';
import { AppError } from '../utils/AppError';

/** GET /api/journal
 *  Supports search (text index across title/body/tags/hashtags), filters,
 *  and `since` (ISO timestamp) for incremental sync after reconnect. */
export async function list(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query);
  const userId = req.auth!.userId;

  const filter: Record<string, any> = { userId, deletedAt: null };
  if (q.category !== undefined) filter.category = q.category;
  if (q.mood !== undefined) filter.mood = q.mood;
  if (q.isPrivate !== undefined) filter.isPrivate = q.isPrivate;
  if (q.isFavorite !== undefined) filter.isFavorite = q.isFavorite;
  if (q.isDraft !== undefined) filter.isDraft = q.isDraft;
  if (q.since) filter.updatedAt = { $gt: q.since };
  if (q.search) filter.$text = { $search: q.search };

  const entries = await JournalEntryModel.find(filter)
    .sort({ updatedAt: -1 })
    .skip(q.offset)
    .limit(q.limit);

  res.json({ entries: entries.map(e => e.toJSON()), count: entries.length });
}

/** GET /api/journal/:id */
export async function getOne(req: Request, res: Response) {
  const entry = await JournalEntryModel.findOne({ _id: req.params.id, userId: req.auth!.userId, deletedAt: null });
  if (!entry) throw new AppError(404, 'Entry not found');
  res.json({ entry: entry.toJSON() });
}

/** POST /api/journal — create, or upsert if the client-generated id already
 *  exists for this user (idempotent — safe to retry from an offline queue). */
export async function create(req: Request, res: Response) {
  const body = journalEntrySchema.parse(req.body);
  const userId = req.auth!.userId;
  const { id, ...rest } = body;

  const entry = await JournalEntryModel.findOneAndUpdate(
    { _id: id, userId },
    { $set: { ...rest, userId }, $setOnInsert: { _id: id } },
    { new: true, upsert: true },
  );
  res.status(201).json({ entry: entry.toJSON() });
}

/** PATCH /api/journal/:id */
export async function update(req: Request, res: Response) {
  const body = journalEntryUpdateSchema.parse(req.body);
  const entry = await JournalEntryModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId, deletedAt: null },
    { $set: body },
    { new: true },
  );
  if (!entry) throw new AppError(404, 'Entry not found');
  res.json({ entry: entry.toJSON() });
}

/** DELETE /api/journal/:id — soft delete (tombstone), so an offline peer that
 *  synced the delete after reconnecting still sees `since` reflect it. */
export async function remove(req: Request, res: Response) {
  const entry = await JournalEntryModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId },
    { $set: { deletedAt: new Date().toISOString() } },
    { new: true },
  );
  if (!entry) throw new AppError(404, 'Entry not found');
  res.status(204).send();
}

/** PATCH /api/journal/:id/favorite  Body: { isFavorite: boolean } */
export async function setFavorite(req: Request, res: Response) {
  const isFavorite = Boolean(req.body?.isFavorite);
  const entry = await JournalEntryModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId, deletedAt: null },
    { $set: { isFavorite } },
    { new: true },
  );
  if (!entry) throw new AppError(404, 'Entry not found');
  res.json({ entry: entry.toJSON() });
}
