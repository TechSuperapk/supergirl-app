// User profile helpers — now backed by the app's own API. The user record is
// created by the backend during OTP verification, so saveUserToFirestore is a
// no-op kept only for call-site compatibility.
import { apiClient } from '../../../services/apiClient';

export async function saveUserToFirestore(_uid: string, _phone: string) {
  // No-op: the backend upserts the user on /auth/otp/verify.
}

export async function getUserProfileFromFirestore(_uid: string) {
  try {
    const r = await apiClient.get<{ user: any }>('/auth/me');
    return r.user ?? null;
  } catch {
    return null;
  }
}

export async function updateUserProfileInFirestore(_uid: string, name: string, avatarUrl?: string) {
  const data: any = { name };
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
  await apiClient.patch('/auth/me', data);
}
