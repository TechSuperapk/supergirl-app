/**
 * Real phone OTP via the Firebase JS SDK, using expo-firebase-recaptcha's
 * FirebaseRecaptchaVerifierModal (a WebView-hosted invisible reCAPTCHA) as
 * the ApplicationVerifier — this is what makes phone auth work without a
 * native build, i.e. still inside Expo Go.
 */
import { getAuth, signInWithPhoneNumber, type ConfirmationResult, type ApplicationVerifier } from 'firebase/auth';

let confirmation: ConfirmationResult | null = null;

/** Sends a real SMS code to the given E.164 phone number. `verifier` is the
 *  ref from <FirebaseRecaptchaVerifierModal>, passed through from the screen. */
export async function sendOtp(phone: string, verifier: ApplicationVerifier): Promise<void> {
  if (!verifier) {
    throw new Error('Missing reCAPTCHA verifier — the verifier modal must be mounted before sending an OTP.');
  }
  confirmation = await signInWithPhoneNumber(getAuth(), phone, verifier);
}

/** Confirms the SMS code against the pending request from sendOtp(). Returns
 *  the signed-in Firebase user (call `.getIdToken()` on it to hand off to
 *  the backend's /auth/verify). */
export async function verifyOtp(code: string) {
  if (!confirmation) throw new Error('Send OTP first');
  const result = await confirmation.confirm(code);
  confirmation = null;
  return result.user;
}
