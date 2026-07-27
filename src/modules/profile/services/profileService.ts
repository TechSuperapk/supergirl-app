import { apiClient } from '../../../services/apiClient';
import { uploadFileToFirebase } from '../../../services/storageService';

export interface UserProfilePayload {
  name:        string;
  bio?:        string;
  avatarUrl?:  string;
  countryCode?: string;
  phone?:      string;
}

/** Fetch full user profile from the backend. */
export async function fetchUserProfile(_uid: string) {
  try {
    const r = await apiClient.get<{ user: any }>('/auth/me');
    return r.user ?? null;
  } catch {
    return null;
  }
}

/** Update name, bio, avatar via the backend (avatar uploads to S3 first). */
export async function updateUserProfile(
  uid: string,
  payload: UserProfilePayload,
  localAvatarUri?: string,
): Promise<string | undefined> {
  let finalAvatarUrl = payload.avatarUrl;

  if (localAvatarUri && !localAvatarUri.startsWith('http')) {
    try {
      const ext  = localAvatarUri.split('.').pop() ?? 'jpg';
      finalAvatarUrl = await uploadFileToFirebase(localAvatarUri, `profiles/${uid}/avatar_${Date.now()}.${ext}`);
    } catch {
      finalAvatarUrl = localAvatarUri; // keep local; re-uploads next save
    }
  }

  const data: Record<string, any> = { name: payload.name };
  if (payload.bio         !== undefined) data.bio         = payload.bio;
  if (finalAvatarUrl      !== undefined) data.avatarUrl   = finalAvatarUrl;
  if (payload.countryCode !== undefined) data.countryCode = payload.countryCode;
  if (payload.phone       !== undefined) data.phone       = payload.phone;

  try { await apiClient.patch('/auth/me', data); } catch { /* offline — Redux still holds it */ }
  return finalAvatarUrl;
}

export async function updateSubscriptionTier(
  _uid: string,
  tier: 'free' | 'premium',
  expiresAt: string | null,
) {
  await apiClient.patch('/auth/me', { subscriptionTier: tier, subscriptionExpiry: expiresAt });
}

export async function updateNotificationPrefs(
  _uid: string,
  prefs: Record<string, boolean>,
) {
  await apiClient.patch('/auth/me', { notificationPrefs: prefs });
}
