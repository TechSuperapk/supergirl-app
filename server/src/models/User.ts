import { Schema, model, Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  firebaseUid: string;
  phone: string;
  countryCode: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    phone:       { type: String, required: true },
    countryCode: { type: String, default: '+91' },
    name:        { type: String, default: '' },
    avatarUrl:   { type: String },
    bio:         { type: String },
    isVerified:  { type: Boolean, default: true },
  },
  {
    timestamps: { currentTime: () => new Date() },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.firebaseUid; // never leak the Firebase uid to other clients
        ret.createdAt = ret.createdAt?.toISOString?.() ?? ret.createdAt;
        ret.updatedAt = ret.updatedAt?.toISOString?.() ?? ret.updatedAt;
        return ret;
      },
    },
  },
);

export const UserModel = model<IUser>('User', UserSchema);
