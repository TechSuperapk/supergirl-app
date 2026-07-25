// Exchanges a verified Firebase ID token for this backend's own session JWT,
// and persists it. Called right after Firebase phone-OTP sign-in succeeds.
import { apiClient } from '../../../services/apiClient';
import { saveSessionToken, clearSessionToken } from './sessionService';
import { setCrashUser } from '../../../lib/crashReporting';

export interface BackendUser {
  id: string;
  phone: string;
  countryCode: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function exchangeFirebaseTokenForSession(idToken: string, name?: string): Promise<BackendUser> {
  const res = await apiClient.post<{ token: string; user: BackendUser }>(
    '/auth/verify',
    { idToken, name },
    { auth: false },
  );
  await saveSessionToken(res.token);
  setCrashUser(res.user.id); // tag crash reports with the signed-in user
  return res.user;
}

export async function logoutBackendSession(): Promise<void> {
  setCrashUser(null);
  await clearSessionToken();
}
