import { signInWithPhoneNumber, ApplicationVerifier } from 'firebase/auth';
import { auth } from '../../../lib/firebase';

let confirmationResult: any = null;

export async function sendOtp(phone: string, recaptcha: ApplicationVerifier) {
  confirmationResult = await signInWithPhoneNumber(auth, phone, recaptcha);
}

export async function verifyOtp(otp: string) {
  if (!confirmationResult) throw new Error('Send OTP first');
  const result = await confirmationResult.confirm(otp);
  return result.user;
}