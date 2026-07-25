/**
 * outfitOfTheDay — the scheduled "Outfit of the Day" batch.
 *
 * Each morning (cron, see server.ts) it: reads every user's wardrobe from
 * Firestore (via firebase-admin), asks the AI for one outfit, stores it under
 * `fits_ootd/{uid}_{date}` for the app to render on the Home dashboard, and
 * sends an FCM push to the user's registered device tokens
 * (`users/{uid}.fcmTokens`, written by the RN client).
 *
 * The whole batch is fail-soft: one user's failure never aborts the rest.
 */
import admin from 'firebase-admin';
import { getFirebaseAdmin } from '../config/firebaseAdmin';
import { generateOutfitOfTheDay, WardrobeItemLite } from '../services/openaiService';
import { sendPush } from '../services/fcmService';

export async function runOutfitOfTheDayBatch(): Promise<{ users: number; generated: number; pushed: number }> {
  const app = getFirebaseAdmin();
  const fs = admin.firestore(app);
  const today = new Date().toISOString().slice(0, 10);

  const snap = await fs.collection('fits_wardrobe').get();
  const byUser = new Map<string, WardrobeItemLite[]>();
  snap.forEach(doc => {
    const d = doc.data() as any;
    if (!d?.userId || d.isArchived) return;
    const arr = byUser.get(d.userId) ?? [];
    arr.push({
      id: doc.id,
      name: d.name ?? '',
      category: d.category ?? 'tops',
      colors: d.colors ?? d.colorTags ?? [],
      occasions: d.occasions ?? [],
      seasons: d.seasons ?? [],
    });
    byUser.set(d.userId, arr);
  });

  let generated = 0;
  let pushed = 0;

  for (const [uid, wardrobe] of byUser) {
    if (wardrobe.length < 2) continue;
    try {
      const outfit = await generateOutfitOfTheDay(wardrobe, {});
      if (!outfit || !outfit.itemIds.length) continue;

      await fs.collection('fits_ootd').doc(`${uid}_${today}`).set({
        userId: uid,
        date: today,
        itemIds: outfit.itemIds,
        reason: outfit.reason,
        occasion: outfit.occasion,
        createdAt: new Date().toISOString(),
      });
      generated++;

      const userDoc = await fs.collection('users').doc(uid).get();
      const tokens: string[] = (userDoc.data() as any)?.fcmTokens ?? [];
      if (tokens.length) {
        const { sent, invalidTokens } = await sendPush(tokens, {
          title: 'Your Outfit of the Day ✨',
          body: outfit.reason.slice(0, 120),
          data: { type: 'ootd', date: today },
        });
        pushed += sent;
        if (invalidTokens.length) {
          await fs.collection('users').doc(uid)
            .update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens) })
            .catch(() => { /* pruning is best-effort */ });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[ootd] user ${uid} failed:`, (e as Error)?.message);
    }
  }

  return { users: byUser.size, generated, pushed };
}
