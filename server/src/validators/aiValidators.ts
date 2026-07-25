import { z } from 'zod';

export const detectSchema = z.object({
  imageUrl: z.string().url(),
});

export const removeBgSchema = z.object({
  imageUrl: z.string().url(),
});

const wardrobeItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(''),
  category: z.string().default('tops'),
  colors: z.array(z.string()).optional(),
  occasions: z.array(z.string()).optional(),
  seasons: z.array(z.string()).optional(),
});

export const suggestSchema = z.object({
  wardrobe: z.array(wardrobeItemSchema).min(1),
  occasion: z.string().optional(),
  weather: z.string().optional(),
  mood: z.string().optional(),
  season: z.string().optional(),
  avoidItemIds: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(8).optional(),
});

export const ootdSchema = suggestSchema.omit({ count: true });

export type DetectInput = z.infer<typeof detectSchema>;
export type RemoveBgInput = z.infer<typeof removeBgSchema>;
export type SuggestInput = z.infer<typeof suggestSchema>;
