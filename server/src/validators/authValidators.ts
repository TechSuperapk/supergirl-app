import { z } from 'zod';

export const verifySchema = z.object({
  idToken: z.string().min(10, 'Firebase idToken is required'),
  name: z.string().trim().max(120).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});
