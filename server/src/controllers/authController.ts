import { Request, Response } from 'express';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';
import { UserModel } from '../models/User';
import { signSessionToken } from '../utils/jwt';
import { verifySchema, updateProfileSchema } from '../validators/authValidators';
import { AppError } from '../utils/AppError';

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
