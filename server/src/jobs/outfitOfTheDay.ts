/**
 * outfitOfTheDay — the scheduled "Outfit of the Day" batch.
 *
 * Each morning (cron, see server.ts) it: reads every user's wardrobe from
 * MongoDB (`fits_wardrobe`), asks the AI for one outfit, stores it under
 * `fits_ootd` (one doc per user per day) for the app to render on the Home
 * dashboard, and sends an Expo push to the user's registered device
 * (`User.expoPushToken`, written by the RN client).
 *
 * The whole batch is fail-soft: one user's failure never aborts the rest.
 */
import { collectionModel } from '../models/collection';
import { UserModel } from '../models/User';
import { generateOutfitOfTheDay, WardrobeItemLite } from '../services/openaiService';
import { sendPush } from '../services/pushService';

const Wardrobe = () => collectionModel('fits_wardrobe');
const Ootd = () => collectionModel('fits_ootd');

export async function runOutfitOfTheDayBatch(): Promise<{ users: number; generated: number; pushed: number }> {
  const today = new Date().toISOString().slice(0, 10);

  const items = await Wardrobe().find({ isArchived: { $ne: true } }).lean();
  const byUser = new Map<string, WardrobeItemLite[]>();
  for (const d of items as any[]) {
    if (!d?.userId) continue;
    const arr = byUser.get(d.userId) ?? [];
    arr.push({
      id: d._id.toString(),
      name: d.name ?? '',
      category: d.category ?? 'tops',
      colors: d.colors ?? d.colorTags ?? [],
      occasions: d.occasions ?? [],
      seasons: d.seasons ?? [],
    });
    byUser.set(d.userId, arr);
  }

  let generated = 0;
  let pushed = 0;

  for (const [userId, wardrobe] of byUser) {
    if (wardrobe.length < 2) continue;
    try {
      const outfit = await generateOutfitOfTheDay(wardrobe, {});
      if (!outfit || !outfit.itemIds.length) continue;

      // One OOTD per user per day — upsert so re-runs don't duplicate.
      await Ootd().updateOne(
        { userId, date: today },
        {
          $set: {
            userId,
            date: today,
            itemIds: outfit.itemIds,
            reason: outfit.reason,
            occasion: outfit.occasion,
          },
        },
        { upsert: true },
      );
      generated++;

      const user = await UserModel.findById(userId).select('expoPushToken').lean();
      const token = (user as any)?.expoPushToken;
      if (token) {
        const { sent, invalidTokens } = await sendPush([token], {
          title: 'Your Outfit of the Day ✨',
          body: outfit.reason.slice(0, 120),
          data: { type: 'ootd', date: today },
        });
        pushed += sent;
        if (invalidTokens.length) {
          await UserModel.updateOne({ _id: userId }, { $unset: { expoPushToken: '' } })
            .catch(() => { /* pruning is best-effort */ });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[ootd] user ${userId} failed:`, (e as Error)?.message);
    }
  }

  return { users: byUser.size, generated, pushed };
}
