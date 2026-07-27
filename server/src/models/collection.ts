import { Schema, model, Model } from 'mongoose';

// A flexible, owner-scoped document model reused for every simple collection
// (boards, trackers_*, fits_*). `strict: false` mirrors Firestore's schemaless
// docs — whatever fields the client sends are stored — while `userId` +
// timestamps are always enforced.
const cache: Record<string, Model<any>> = {};

export function collectionModel(name: string): Model<any> {
  if (cache[name]) return cache[name];

  const schema = new Schema(
    { userId: { type: String, required: true, index: true } },
    { strict: false, timestamps: true, collection: name },
  );

  schema.set('toJSON', {
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      ret.createdAt = ret.createdAt?.toISOString?.() ?? ret.createdAt;
      ret.updatedAt = ret.updatedAt?.toISOString?.() ?? ret.updatedAt;
      return ret;
    },
  });

  cache[name] = model(name, schema);
  return cache[name];
}
