/**
 * pushService — Expo push notifications (replaces Firebase Cloud Messaging).
 *
 * Expo's push service takes an ExpoPushToken (written by the RN client into
 * the user's `expoPushToken` field) and delivers to both iOS and Android with
 * no firebase-admin dependency. We POST batches to Expo's HTTP/2 endpoint and
 * report back any tokens Expo says are invalid so the caller can prune them.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const isExpoToken = (t: string) =>
  typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));

/** Sends a push to one or many Expo push tokens. Invalid/expired tokens are
 *  returned so the caller can prune them from the user record. */
export async function sendPush(
  tokens: string[],
  msg: PushMessage,
): Promise<{ sent: number; invalidTokens: string[] }> {
  const valid = tokens.filter(isExpoToken);
  if (!valid.length) return { sent: 0, invalidTokens: [] };

  const messages = valid.map(to => ({
    to,
    title: msg.title,
    body: msg.body,
    data: msg.data ?? {},
    sound: 'default' as const,
    priority: 'high' as const,
  }));

  const invalidTokens: string[] = [];
  let sent = 0;

  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });
      const json: any = await resp.json().catch(() => ({}));
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'ok') {
          sent++;
        } else if (ticket?.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[idx].to);
        }
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[push] Expo send failed:', (e as Error)?.message);
    }
  }

  return { sent, invalidTokens };
}
