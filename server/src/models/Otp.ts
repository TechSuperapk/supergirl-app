import { Schema, model, Types } from 'mongoose';

// One-time passcodes for phone login. Stored hashed; auto-deleted after they
// expire (TTL index on expiresAt).
export interface IOtp {
  _id: Types.ObjectId;
  phone: string;      // E.164, e.g. +919876543210
  codeHash: string;   // sha256 of the 6-digit code
  attempts: number;
  expiresAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  phone:     { type: String, required: true, index: true },
  codeHash:  { type: String, required: true },
  attempts:  { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB removes the doc automatically once expiresAt passes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = model<IOtp>('Otp', OtpSchema);
