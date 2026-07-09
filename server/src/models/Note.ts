import { Schema, model } from 'mongoose';

// Mirrors src/modules/journaling/quickNotesStore.ts::QuickNoteRecord.

const NoteAudioSchema = new Schema({ id: String, uri: String }, { _id: false });
const ChecklistItemSchema = new Schema({ id: String, text: String, done: Boolean }, { _id: false });
const ScribblePathSchema = new Schema({ d: String, color: String, width: Number }, { _id: false });
const NoteSketchSchema = new Schema({ id: String, paths: [ScribblePathSchema] }, { _id: false });

export interface INote {
  _id: string; // client-generated id
  userId: string;
  title: string;
  body: string; // HTML
  tag?: string;
  pinned?: boolean;
  audio?: any[];
  checklist?: any[];
  sketches?: any[];
  media?: string[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const NoteSchema = new Schema(
  {
    _id:       { type: String, required: true },
    userId:    { type: String, required: true, index: true },
    title:     { type: String, default: '' },
    body:      { type: String, default: '' },
    tag:       { type: String },
    pinned:    { type: Boolean, default: false },
    audio:     { type: [NoteAudioSchema], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    sketches:  { type: [NoteSketchSchema], default: [] },
    media:     { type: [String], default: [] },
    deletedAt: { type: String, default: null },
  },
  {
    _id: false,
    timestamps: { currentTime: () => new Date() },
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.userId;
        ret.createdAt = typeof ret.createdAt === 'string' ? ret.createdAt : ret.createdAt?.toISOString?.();
        ret.updatedAt = typeof ret.updatedAt === 'string' ? ret.updatedAt : ret.updatedAt?.toISOString?.();
        return ret;
      },
    },
  },
);

NoteSchema.index({ userId: 1, updatedAt: -1 });
NoteSchema.index({ userId: 1, title: 'text', body: 'text', tag: 'text' });

export const NoteModel = model<INote>('Note', NoteSchema);
