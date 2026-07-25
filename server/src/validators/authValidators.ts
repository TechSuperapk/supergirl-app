import { z } from 'zod';

export const verifySchema = z.object({
  idToken: z.string().min(10, 'Firebase idToken is required'),
  name: z.string().trim().max(120).optional(),
});

// Phone OTP (Amazon SNS) — phone must be E.164 (e.g. +919876543210).
export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in +<countrycode><number> format'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in +<countrycode><number> format'),
  code:  z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  name:  z.string().trim().max(120).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});
