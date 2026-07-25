import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { verify, me, updateMe, sendOtp, verifyOtp } from '../controllers/authController';

export const authRoutes = Router();

// Phone OTP via Amazon SNS (new, Firebase-free path).
authRoutes.post('/otp/send', asyncHandler(sendOtp));
authRoutes.post('/otp/verify', asyncHandler(verifyOtp));

// Legacy Firebase ID-token verify (kept during migration).
authRoutes.post('/verify', asyncHandler(verify));
authRoutes.get('/me', requireAuth, asyncHandler(me));
authRoutes.patch('/me', requireAuth, asyncHandler(updateMe));
