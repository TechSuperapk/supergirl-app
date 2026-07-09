import { z } from 'zod';

// Loose/passthrough on nested structural fields (stickerPlacements, scribblePages,
// contentBlocks, imagePlacements) — these are complex nested shapes owned by the
// RN client; the server stores them opaquely rather than re-validating every
// sub-field, so client-side additions don't require a server redeploy.
export const journalEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().default(''),
  body: z.string().default(''),
  detectedHashtags: z.array(z.string()).default([]),
  mood: z.string().default('neutral'),
  tags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  voiceNoteUrl: z.string().optional(),
  stickers: z.array(z.string()).default([]),
  stickerPlacements: z.array(z.any()).default([]),
  scribblePages: z.array(z.any()).default([]),
  isPrivate: z.boolean().default(false),
  theme: z.string().default('default'),
  category: z.string().optional(),
  mode: z.enum(['freestyle', 'guided']).optional(),
  textColor: z.string().default('#111111'),
  fontSize: z.number().default(16),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  isDraft: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  attachmentOrder: z.array(z.string()).default([]),
  imagePlacements: z.array(z.any()).default([]),
  contentBlocks: z.array(z.any()).default([]),
  weather: z.string().optional(),
  location: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const journalEntryUpdateSchema = journalEntrySchema.partial().omit({ id: true });

export const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  mood: z.string().optional(),
  isPrivate: z.coerce.boolean().optional(),
  isFavorite: z.coerce.boolean().optional(),
  isDraft: z.coerce.boolean().optional(),
  since: z.string().optional(), // ISO date — return entries updated after this (for sync)
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});
