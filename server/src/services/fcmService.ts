/**
 * fcmService — Firebase Cloud Messaging push via firebase-admin (already a
 * server dependency). Used by the scheduled "Outfit of the Day" job and any
 * wardrobe reminder (trip packing, planned-outfit reminders).
 */
import admin from 'firebase-admin';
import { getFirebaseAdmin } from '../config/firebaseAdmin';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** Sends a push to one or many device tokens. Invalid/expired tokens are
 *  returned so the caller can prune them from the user record. */
export async function sendPush(tokens: string[], msg: PushMessage): Promise<{ sent: number; invalidTokens: string[] }> {
  const valid = tokens.filter(Boolean);
  if (!valid.length) return { sent: 0, invalidTokens: [] };
  const app = getFirebaseAdmin();

  const res = await admin.messaging(app).sendEachForMulticast({
    tokens: valid,
    notification: { title: msg.title, body: msg.body },
    data: msg.data ?? {},
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  const invalidTokens: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        invalidTokens.push(valid[i]);
      }
    }
  });
  return { sent: res.successCount, invalidTokens };
}
