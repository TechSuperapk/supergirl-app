import { Request, Response } from 'express';
import crypto from 'crypto';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';
import { UserModel } from '../models/User';
import { OtpModel } from '../models/Otp';
import { signSessionToken } from '../utils/jwt';
import { sendSms } from '../services/snsService';
import { sendOtpSms as sendOtpViaMsg91 } from '../services/msg91Service';
import { env } from '../config/env';
import { verifySchema, updateProfileSchema, sendOtpSchema, verifyOtpSchema } from '../validators/authValidators';
import { AppError } from '../utils/AppError';

const hashCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const countryCodeOf = (phone: string) => (phone.match(/^\+(\d{1,3})/)?.[0] ?? '+91');

/** POST /api/auth/otp/send  Body: { phone }
 *  Generates a 6-digit code, stores it hashed (5-min TTL), and texts it via
 *  Amazon SNS. Replaces Firebase phone auth. */
export async function sendOtp(req: Request, res: Response) {
  const { phone } = sendOtpSchema.parse(req.body);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60_000);

  await OtpModel.findOneAndUpdate(
    { phone },
    { phone, codeHash: hashCode(code), attempts: 0, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Prefer MSG91 (handles India DLT) when configured; else fall back to AWS SNS.
  if (env.msg91AuthKey) {
    await sendOtpViaMsg91(phone, code);
  } else {
    await sendSms(phone, `Your Super Bae verification code is ${code}. It expires in ${env.otpTtlMinutes} minutes.`);
  }
  res.json({ ok: true });
}

/** POST /api/auth/otp/verify  Body: { phone, code, name? }
 *  Checks the code, upserts a Mongo user keyed by phone, returns our JWT. */
export async function verifyOtp(req: Request, res: Response) {
  const { phone, code, name } = verifyOtpSchema.parse(req.body);

  const rec = await OtpModel.findOne({ phone });
  if (!rec) throw new AppError(400, 'Please request a new code.');
  if (rec.expiresAt.getTime() < Date.now()) { await rec.deleteOne(); throw new AppError(400, 'Code expired. Request a new one.'); }
  if (rec.attempts >= 5) { await rec.deleteOne(); throw new AppError(429, 'Too many attempts. Request a new code.'); }
  if (rec.codeHash !== hashCode(code)) {
    rec.attempts += 1;
    await rec.save();
    throw new AppError(400, 'Incorrect code.');
  }
  await rec.deleteOne();

  // Users are keyed by phone in the firebaseUid field (reused as a generic
  // unique id) so no schema change is needed while both auth methods coexist.
  const uidKey = `phone:${phone}`;
  let user = await UserModel.findOne({ firebaseUid: uidKey });
  if (!user) {
    user = await UserModel.create({
      firebaseUid: uidKey,
      phone,
      countryCode: countryCodeOf(phone),
      name: name ?? '',
      isVerified: true,
    });
  } else if (name && !user.name) {
    user.name = name;
    await user.save();
  }

  const token = signSessionToken({ userId: user._id.toString(), uid: uidKey, phone });
  res.json({ token, user: user.toJSON() });
}

/** POST /api/auth/verify
 *  Body: { idToken, name? }
 *  Client flow: sign in with Firebase Phone Auth (native or JS SDK) on-device,
 *  get the Firebase ID token, POST it here. We verify it server-side with
 *  Firebase Admin, upsert a Mongo User keyed by the Firebase uid, and return
 *  our own JWT session token for use on every other /api/* endpoint. */
export async function verify(req: Request, res: Response) {
  const { idToken, name } = verifySchema.parse(req.body);

  const decoded = await verifyFirebaseIdToken(idToken).catch(() => {
    throw new AppError(401, 'Invalid or expired Firebase ID token');
  });

  const phone = decoded.phone_number ?? '';
  if (!decoded.uid) throw new AppError(401, 'Token missing uid');

  let user = await UserModel.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    user = await UserModel.create({
      firebaseUid: decoded.uid,
      phone,
      name: name ?? '',
      isVerified: true,
    });
  }

  const token = signSessionToken({ userId: user._id.toString(), uid: decoded.uid, phone });
  res.json({ token, user: user.toJSON() });
}

/** GET /api/auth/me — requires Authorization: Bearer <jwt> */
export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(req.auth!.userId);
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user: user.toJSON() });
}

/** PATCH /api/auth/me */
export async function updateMe(req: Request, res: Response) {
  const body = updateProfileSchema.parse(req.body);
  const user = await UserModel.findByIdAndUpdate(req.auth!.userId, body, { new: true });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user: user.toJSON() });
}
