import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { verify, me, updateMe } from '../controllers/authController';

export const authRoutes = Router();

authRoutes.post('/verify', asyncHandler(verify));
authRoutes.get('/me', requireAuth, asyncHandler(me));
authRoutes.patch('/me', requireAuth, asyncHandler(updateMe));
