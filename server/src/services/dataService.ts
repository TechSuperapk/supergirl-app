/**
 * DataService — business-logic + data layer for the generic owner-scoped
 * collections (boards, trackers_*, fits_*, vaults, …). Owns the collection
 * allowlist, the protected-field stripping, and all MongoDB access. The
 * controller only parses the request and calls these methods.
 */
import { collectionModel } from '../models/collection';
import { AppError } from '../utils/AppError';

// Allowlist of simple owner-scoped collections served generically. Club
// collections are intentionally excluded (shared reads + custom rules).
const ALLOWED = new Set<string>([
  'boards',
  'vaults', 'journal_drafts', 'subscriptions', 'journal_backups',
  'trackers_mood', 'trackers_sleep', 'trackers_habits', 'trackers_habit_logs',
  'trackers_period', 'trackers_health', 'trackers_expenses', 'trackers_milestones',
  'trackers_custom',
  // Intimacy / Sickness / Measurement / Water / BMI trackers
  'trackers_intimacy',
  'trackers_sickness_symptoms', 'trackers_sickness_medications',
  'trackers_measurements',
  'trackers_water_logs', 'trackers_water_settings',
  'trackers_bmi', 'trackers_weight_goal',
  'trackers_period_day_logs',
  'trackers_mood_logs',
  'trackers_finance_categories', 'trackers_finance_accounts', 'trackers_finance_budgets',
  'trackers_medication_doses',
  'fits_wardrobe', 'fits_outfits', 'fits_planner', 'fits_trips',
  'fits_settings', 'fits_analytics_cache',
]);

const PROTECTED = ['_id', 'id', 'userId', 'createdAt', 'updatedAt', '__v'];
const clean = (body: any) => {
  const out = { ...(body ?? {}) };
  for (const k of PROTECTED) delete out[k];
  return out;
};

export class DataService {
  private modelFor(collection: string) {
    if (!ALLOWED.has(collection)) throw new AppError(404, `Unknown collection: ${collection}`);
    return collectionModel(collection);
  }

  /** List the user's docs in a collection (newest first). */
  async list(userId: string, collection: string): Promise<any[]> {
    const docs = await this.modelFor(collection).find({ userId }).sort({ updatedAt: -1 });
    return docs.map((d: any) => d.toJSON());
  }

  async getOne(userId: string, collection: string, id: string): Promise<any> {
    const doc = await this.modelFor(collection).findOne({ _id: id, userId });
    if (!doc) throw new AppError(404, 'Not found');
    return doc.toJSON();
  }

  async create(userId: string, collection: string, body: any): Promise<any> {
    const doc = await this.modelFor(collection).create({ ...clean(body), userId });
    return doc.toJSON();
  }

  async update(userId: string, collection: string, id: string, body: any): Promise<any> {
    const doc = await this.modelFor(collection).findOneAndUpdate(
      { _id: id, userId },
      { $set: clean(body) },
      { new: true },
    );
    if (!doc) throw new AppError(404, 'Not found');
    return doc.toJSON();
  }

  /** Upsert by a natural key: { match, set } — for "one per day" style docs. */
  async upsert(userId: string, collection: string, match: any, set: any): Promise<any> {
    if (!match || typeof match !== 'object') throw new AppError(400, 'match object is required');
    const doc = await this.modelFor(collection).findOneAndUpdate(
      { userId, ...clean(match) },
      { $set: { ...clean(set), userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc.toJSON();
  }

  async remove(userId: string, collection: string, id: string): Promise<void> {
    const r = await this.modelFor(collection).deleteOne({ _id: id, userId });
    if (r.deletedCount === 0) throw new AppError(404, 'Not found');
  }
}
