/**
 * Real phone OTP via @react-native-firebase/auth (native module).
 *
 * Switched from the Firebase JS SDK + expo-firebase-recaptcha WebView
 * approach: that package is unsupported since Expo SDK 48 and fails to
 * build natively on current Expo versions. Native Firebase Auth needs no
 * reCAPTCHA at all — it verifies silently via Play Integrity (Android) or a
 * silent APNs push (iOS) — and only works in a real native build (EAS/dev
 * client), not Expo Go.
 *
 * ── Why the native module is loaded lazily ──
 * @react-native-firebase validates its native module at IMPORT time, so a
 * static `import auth from '@react-native-firebase/auth'` throws
 * "Native module RNFBAppModule not found" the moment the JS bundle evaluates
 * inside any binary without the Firebase native code — i.e. Expo Go — which
 * red-screens the whole app before a single screen renders. To keep the app
 * bootable in Expo Go for UI preview, the module is required lazily inside a
 * try/catch (same pattern as lib/crashReporting.ts). In a real dev/EAS build
 * the module is present and phone OTP behaves exactly as before; in Expo Go
 * the auth calls throw a clear, actionable error only if the user actually
 * tries to sign in.
 *
 * ── Android auto-verification (the "OTP expires in 6-7 seconds" bug) ──
 * On Android, Play Services can read the incoming SMS and Firebase then
 * verifies + signs the user in silently, a few seconds after the SMS lands.
 * That consumes the pending ConfirmationResult — so when the user finished
 * typing the code manually, confirm() threw [auth/session-expired], which
 * looked exactly like the code expiring after ~7 seconds. (Real Firebase
 * codes are valid for minutes.) Handled two ways below:
 *   1. sendOtp() takes an optional onAutoVerified callback — fired the
 *      moment Firebase auto-signs-in, so the UI can skip code entry.
 *   2. verifyOtp() treats "session expired but a user is already signed
 *      in" as success instead of an error.
 */
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

type AuthFactory = () => FirebaseAuthTypes.Module;

// undefined = not tried yet, null = tried and unavailable (Expo Go).
let cachedAuth: AuthFactory | null | undefined;

/**
 * Lazily resolves the native auth() factory. Throws a friendly, actionable
 * error — never the raw "RNFBAppModule not found" — when the native module
 * isn't in the binary (Expo Go). Called only from inside the OTP functions,
 * so importing this file is always side-effect free.
 */
function nativeAuth(): AuthFactory {
  if (cachedAuth === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-firebase/auth');
      cachedAuth = (mod?.default ?? mod) as AuthFactory;
    } catch {
      cachedAuth = null;
    }
  }
  if (!cachedAuth) {
    throw new Error(
      'Phone sign-in needs a development build. Firebase Auth’s native module ' +
      'isn’t available in Expo Go — run `npx expo run:android` / `run:ios` ' +
      '(or install an EAS dev build) to sign in.',
    );
  }
  return cachedAuth;
}

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let unsubAutoVerify: (() => void) | null = null;

function clearAutoVerifyListener() {
  unsubAutoVerify?.();
  unsubAutoVerify = null;
}

/**
 * Sends a real SMS code to the given E.164 phone number.
 *
 * If `onAutoVerified` is provided, it fires when Android instant/auto
 * verification signs the user in without any code being typed — the caller
 * should skip the OTP input and continue straight to its post-login flow.
 */
export async function sendOtp(
  phone: string,
  onAutoVerified?: (user: FirebaseAuthTypes.User) => void,
): Promise<void> {
  const auth = nativeAuth();
  clearAutoVerifyListener();
  confirmation = await auth().signInWithPhoneNumber(phone);
  if (onAutoVerified) {
    // No user is signed in during the OTP flow, so a user appearing here
    // means verification completed. verifyOtp() unsubscribes this listener
    // before manual confirm, so it only ever fires for the auto path.
    unsubAutoVerify = auth().onAuthStateChanged(user => {
      if (!user) return;
      clearAutoVerifyListener();
      confirmation = null;
      onAutoVerified(user);
    });
  }
}

/** Confirms the SMS code against the pending request from sendOtp(). Returns
 *  the signed-in Firebase user (call `.getIdToken()` on it to hand off to
 *  the backend's /auth/verify). */
export async function verifyOtp(code: string): Promise<FirebaseAuthTypes.User> {
  const auth = nativeAuth();
  // Manual path from here on — stop the auto-verify listener so both paths
  // can't complete the same sign-in twice.
  clearAutoVerifyListener();

  // Auto-verification may have already signed the user in; the typed code
  // is irrelevant at that point.
  const already = auth().currentUser;
  if (!confirmation) {
    if (already) return already;
    throw new Error('Send OTP first');
  }

  try {
    const result = await confirmation.confirm(code);
    confirmation = null;
    if (!result?.user) throw new Error('Verification did not return a user');
    return result.user;
  } catch (e: any) {
    // Auto-verification raced the manual entry: Firebase consumed the
    // session, but the user IS signed in — that's a success, not an error.
    const current = auth().currentUser;
    if (current) {
      confirmation = null;
      return current;
    }
    if (e?.code === 'auth/invalid-verification-code') {
      // Keep `confirmation` — the user can correct the code and retry
      // without a resend.
      throw new Error('Incorrect code. Please check and try again.');
    }
    if (e?.code === 'auth/session-expired' || e?.code === 'auth/code-expired') {
      confirmation = null;
      throw new Error('This code has expired. Tap "Resend OTP" to get a new one.');
    }
    throw e;
  }
}
