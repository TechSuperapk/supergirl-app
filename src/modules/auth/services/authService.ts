/**
 * authService — LEGACY. Firebase phone auth has been fully removed; OTP now
 * runs through the app's own backend (see OnboardingScreen → /api/auth/otp/*).
 * These stubs remain only so any old import site still compiles; they are no
 * longer used by the live login flow.
 */

export async function sendOtp(_phone: string, _onAutoVerified?: (u: any) => void): Promise<void> {
  throw new Error('Firebase phone auth removed — OTP now uses the backend.');
}

export async function verifyOtp(_code: string): Promise<any> {
  throw new Error('Firebase phone auth removed — OTP now uses the backend.');
}
