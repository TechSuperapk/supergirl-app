/**
 * Real phone OTP via @react-native-firebase/auth (native module).
 *
 * Switched from the Firebase JS SDK + expo-firebase-recaptcha WebView
 * approach: that package is unsupported since Expo SDK 48 and fails to
 * build natively on current Expo versions. Native Firebase Auth needs no
 * reCAPTCHA at all — it verifies silently via Play Integrity (Android) or a
 * silent APNs push (iOS) — and only works in a real native build (EAS/dev
 * client), not Expo Go, which is fine since that's what we're building now.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/** Sends a real SMS code to the given E.164 phone number. */
export async function sendOtp(phone: string): Promise<void> {
  confirmation = await auth().signInWithPhoneNumber(phone);
}

/** Confirms the SMS code against the pending request from sendOtp(). Returns
 *  the signed-in Firebase user (call `.getIdToken()` on it to hand off to
 *  the backend's /auth/verify). */
export async function verifyOtp(code: string): Promise<FirebaseAuthTypes.User> {
  if (!confirmation) throw new Error('Send OTP first');
  const result = await confirmation.confirm(code);
  confirmation = null;
  if (!result?.user) throw new Error('Verification did not return a user');
  return result.user;
}
