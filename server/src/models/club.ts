import { Schema, model, Model } from 'mongoose';

// Flexible models for the Club collections. `strict: false` mirrors Firestore
// (arbitrary fields), while Mongo still lets us query/index the key fields
// (authorId, communityIds, groupId, createdAt, etc.). Communities use a string
// _id (their slug, e.g. "baehive") so posts can reference them by that id.
const cache: Record<string, Model<any>> = {};

export function clubModel(name: string, stringId = false): Model<any> {
  if (cache[name]) return cache[name];
  const def: any = {};
  if (stringId) def._id = { type: String };
  const schema = new Schema(def, { strict: false, timestamps: true, collection: name });
  schema.set('toJSON', {
    transform: (_doc, ret: any) => {
      ret.id = typeof ret._id === 'string' ? ret._id : ret._id?.toString?.();
      delete ret._id;
      delete ret.__v;
      if (ret.createdAt?.toISOString) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt?.toISOString) ret.updatedAt = ret.updatedAt.toISOString();
      if (ret.purchasedAt?.toISOString) ret.purchasedAt = ret.purchasedAt.toISOString();
      return ret;
    },
  });
  cache[name] = model(name, schema);
  return cache[name];
}

export const Posts        = () => clubModel('club_posts');
export const Comments     = () => clubModel('club_comments');
export const Events       = () => clubModel('club_events');
export const Tickets      = () => clubModel('club_tickets');
export const Groups       = () => clubModel('club_groups');
export const GroupMsgs    = () => clubModel('club_group_messages');
export const Communities  = () => clubModel('club_communities', true);   // string _id (slug)
export const Members      = () => clubModel('club_community_members');
export const Drafts       = () => clubModel('club_drafts');
