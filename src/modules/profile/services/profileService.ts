import {
  doc, getDoc, updateDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { uploadFileToFirebase } from '../../../services/storageService';

export interface UserProfilePayload {
  name:        string;
  bio?:        string;
  avatarUrl?:  string;
  countryCode?: string;
  phone?:      string;
}

/** Fetch full user profile from Firestore */
export async function fetchUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/** Update name, bio, avatar in Firestore */
export async function updateUserProfile(
  uid: string,
  payload: UserProfilePayload,
  localAvatarUri?: string,
): Promise<string | undefined> {
  let finalAvatarUrl = payload.avatarUrl;

  if (
    localAvatarUri &&
    !localAvatarUri.startsWith('http://') &&
    !localAvatarUri.startsWith('https://')
  ) {
    try {
      const ext  = localAvatarUri.split('.').pop() ?? 'jpg';
      const path = `profiles/${uid}/avatar_${Date.now()}.${ext}`;
      finalAvatarUrl = await uploadFileToFirebase(localAvatarUri, path);
    } catch {
      // Upload failed (offline, or Storage rules not deployed). Keep the local
      // URI so the photo still shows on this device; it re-uploads on next save.
      finalAvatarUrl = localAvatarUri;
    }
  }

  const data: Record<string, any> = {
    name:      payload.name,
    updatedAt: new Date().toISOString(),
  };
  if (payload.bio       !== undefined) data.bio       = payload.bio;
  if (finalAvatarUrl    !== undefined) data.avatarUrl = finalAvatarUrl;
  if (payload.countryCode !== undefined) data.countryCode = payload.countryCode;
  if (payload.phone       !== undefined) data.phone       = payload.phone;

  // setDoc+merge so it works whether or not the user doc already exists
  // (updateDoc throws on a missing doc — common for fresh/anonymous logins).
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch {
    // Firestore write failed (offline). Non-fatal: Redux + offline cache still
    // hold the new avatar, so the UI updates and it syncs on the next save.
  }
  return finalAvatarUrl;
}

/** Write subscription tier to Firestore user doc */
export async function updateSubscriptionTier(
  uid: string,
  tier: 'free' | 'premium',
  expiresAt: string | null,
) {
  await updateDoc(doc(db, 'users', uid), {
    subscriptionTier:   tier,
    subscriptionExpiry: expiresAt,
    updatedAt:          new Date().toISOString(),
  });
}

/** Write notification preferences */
export async function updateNotificationPrefs(
  uid: string,
  prefs: Record<string, boolean>,
) {
  await updateDoc(doc(db, 'users', uid), {
    notificationPrefs: prefs,
    updatedAt: new Date().toISOString(),
  });
}
