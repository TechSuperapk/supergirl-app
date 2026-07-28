import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { verify, me, updateMe, sendOtp, verifyOtp } from '../controllers/authController';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';

export const authRoutes = Router();

// Phone OTP — rate-limited (SMS sends cost money; verify is brute-forceable).
authRoutes.post('/otp/send', otpSendLimiter, asyncHandler(sendOtp));
authRoutes.post('/otp/verify', otpVerifyLimiter, asyncHandler(verifyOtp));

// Legacy Firebase ID-token verify (kept during migration).
authRoutes.post('/verify', asyncHandler(verify));
authRoutes.get('/me', requireAuth, asyncHandler(me));
authRoutes.patch('/me', requireAuth, asyncHandler(updateMe));
