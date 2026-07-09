import { Schema, model } from 'mongoose';

// Mirrors src/modules/journaling/types.ts::JournalEntry on the RN side field
// for field, so entries round-trip losslessly between client and server.

const StickerPlacementSchema = new Schema(
  {
    id: String,
    emoji: String,
    asset: String,
    x: Number,
    y: Number,
    scale: Number,
    rotation: Number,
    zIndex: Number,
  },
  { _id: false },
);

const ImagePlacementSchema = new Schema(
  {
    id: String,
    uri: String,
    isVideo: Boolean,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    scale: Number,
    rotation: Number,
    zIndex: Number,
  },
  { _id: false },
);

const ContentBlockSchema = new Schema(
  {
    id: String,
    type: { type: String, enum: ['text', 'image', 'scribble'] },
    text: String,
    uri: String,
    isVideo: Boolean,
    pageId: String,
  },
  { _id: false },
);

const ScribblePathSchema = new Schema(
  { d: String, color: String, width: Number },
  { _id: false },
);

const ScribblePageSchema = new Schema(
  {
    id: String,
    paths: [ScribblePathSchema],
    createdAt: String,
    updatedAt: String,
  },
  { _id: false },
);

export interface IJournalEntry {
  _id: string; // client-generated id (uuid) — same id used offline in RN/MMKV
  userId: string; // ref -> User._id
  title: string;
  body: string;
  detectedHashtags: string[];
  mood: string;
  tags: string[];
  mediaUrls: string[];
  voiceNoteUrl?: string;
  stickers: string[];
  stickerPlacements: any[];
  scribblePages: any[];
  isPrivate: boolean;
  theme: string;
  category?: string;
  mode?: 'freestyle' | 'guided';
  textColor: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  isDraft?: boolean;
  isImportant?: boolean;
  isFavorite?: boolean;
  attachmentOrder?: string[];
  imagePlacements?: any[];
  contentBlocks?: any[];
  weather?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // soft delete, so offline "delete while offline" can sync a tombstone
}

const JournalEntrySchema = new Schema(
  {
    _id:              { type: String, required: true },
    userId:            { type: String, required: true, index: true },
    title:             { type: String, default: '' },
    body:              { type: String, default: '' },
    detectedHashtags:  { type: [String], default: [] },
    mood:              { type: String, default: 'neutral' },
    tags:              { type: [String], default: [] },
    mediaUrls:         { type: [String], default: [] },
    voiceNoteUrl:      { type: String },
    stickers:          { type: [String], default: [] },
    stickerPlacements: { type: [StickerPlacementSchema], default: [] },
    scribblePages:     { type: [ScribblePageSchema], default: [] },
    isPrivate:         { type: Boolean, default: false },
    theme:             { type: String, default: 'default' },
    category:          { type: String },
    mode:              { type: String, enum: ['freestyle', 'guided'] },
    textColor:         { type: String, default: '#111111' },
    fontSize:          { type: Number, default: 16 },
    bold:              { type: Boolean },
    italic:            { type: Boolean },
    underline:         { type: Boolean },
    textAlign:         { type: String, enum: ['left', 'center', 'right'] },
    isDraft:           { type: Boolean, default: false },
    isImportant:       { type: Boolean, default: false },
    isFavorite:        { type: Boolean, default: false },
    attachmentOrder:   { type: [String], default: [] },
    imagePlacements:   { type: [ImagePlacementSchema], default: [] },
    contentBlocks:     { type: [ContentBlockSchema], default: [] },
    weather:           { type: String },
    location:          { type: String },
    deletedAt:         { type: String, default: null },
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

JournalEntrySchema.index({ userId: 1, updatedAt: -1 });
JournalEntrySchema.index({ userId: 1, title: 'text', body: 'text', tags: 'text', detectedHashtags: 'text' });

export const JournalEntryModel = model<IJournalEntry>('JournalEntry', JournalEntrySchema);
