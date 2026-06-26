/**
 * Phone OTP via react-native-firebase — native verification, no reCAPTCHA.
 */
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

let confirmation: any = null;

/** Send a real SMS code to the given E.164 phone number. */
export async function sendOtp(phone: string) {
  confirmation = await signInWithPhoneNumber(getAuth(), phone);
}

/** Confirm the SMS code; returns the signed-in user on success. */
export async function verifyOtp(code: string) {
  if (!confirmation) throw new Error('Send OTP first');
  const result = await confirmation.confirm(code);
  return result.user;
}
