import { z } from 'zod';

export const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(''),
  body: z.string().default(''),
  tag: z.string().optional(),
  pinned: z.boolean().optional(),
  audio: z.array(z.any()).default([]),
  checklist: z.array(z.any()).default([]),
  sketches: z.array(z.any()).default([]),
  media: z.array(z.string()).default([]),
  updatedAt: z.string(),
});

export const noteUpdateSchema = noteSchema.partial().omit({ id: true });

export const noteListQuerySchema = z.object({
  search: z.string().optional(),
  since: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});
