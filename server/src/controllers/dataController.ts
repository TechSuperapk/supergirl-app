import { Request, Response } from 'express';
import { collectionModel } from '../models/collection';
import { AppError } from '../utils/AppError';

// Allowlist of simple owner-scoped collections served generically. Club
// collections are intentionally excluded — they have shared reads + custom
// rules and get their own controllers.
const ALLOWED = new Set<string>([
  'boards',
  'trackers_mood', 'trackers_sleep', 'trackers_habits', 'trackers_habit_logs',
  'trackers_period', 'trackers_health', 'trackers_expenses', 'trackers_milestones',
  'fits_wardrobe', 'fits_outfits', 'fits_planner', 'fits_trips',
  'fits_settings', 'fits_analytics_cache',
]);

// Fields the client is never allowed to set directly.
const PROTECTED = ['_id', 'id', 'userId', 'createdAt', 'updatedAt', '__v'];
const clean = (body: any) => {
  const out = { ...(body ?? {}) };
  for (const k of PROTECTED) delete out[k];
  return out;
};

function modelFor(req: Request) {
  const name = req.params.collection;
  if (!ALLOWED.has(name)) throw new AppError(404, `Unknown collection: ${name}`);
  return collectionModel(name);
}

/** GET /api/data/:collection — list the signed-in user's docs (newest first). */
export async function list(req: Request, res: Response) {
  const M = modelFor(req);
  const docs = await M.find({ userId: req.auth!.userId }).sort({ updatedAt: -1 });
  res.json({ items: docs.map(d => d.toJSON()) });
}

/** GET /api/data/:collection/:id — one doc (owner only). */
export async function getOne(req: Request, res: Response) {
  const M = modelFor(req);
  const doc = await M.findOne({ _id: req.params.id, userId: req.auth!.userId });
  if (!doc) throw new AppError(404, 'Not found');
  res.json({ item: doc.toJSON() });
}

/** POST /api/data/:collection — create a doc owned by the signed-in user. */
export async function create(req: Request, res: Response) {
  const M = modelFor(req);
  const doc = await M.create({ ...clean(req.body), userId: req.auth!.userId });
  res.status(201).json({ item: doc.toJSON() });
}

/** PATCH /api/data/:collection/:id — update fields (owner only). */
export async function update(req: Request, res: Response) {
  const M = modelFor(req);
  const doc = await M.findOneAndUpdate(
    { _id: req.params.id, userId: req.auth!.userId },
    { $set: clean(req.body) },
    { new: true },
  );
  if (!doc) throw new AppError(404, 'Not found');
  res.json({ item: doc.toJSON() });
}

/** PUT /api/data/:collection — upsert by a natural key.
 *  Body: { match: {...}, set: {...} }. Used for "one per day" style docs
 *  (mood/sleep/health per date, habit log per habit+date, milestone per type). */
export async function upsert(req: Request, res: Response) {
  const M = modelFor(req);
  const { match, set } = req.body ?? {};
  if (!match || typeof match !== 'object') throw new AppError(400, 'match object is required');
  const doc = await M.findOneAndUpdate(
    { userId: req.auth!.userId, ...clean(match) },
    { $set: { ...clean(set), userId: req.auth!.userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({ item: doc.toJSON() });
}

/** DELETE /api/data/:collection/:id — delete (owner only). */
export async function remove(req: Request, res: Response) {
  const M = modelFor(req);
  const r = await M.deleteOne({ _id: req.params.id, userId: req.auth!.userId });
  if (r.deletedCount === 0) throw new AppError(404, 'Not found');
  res.json({ ok: true });
}
