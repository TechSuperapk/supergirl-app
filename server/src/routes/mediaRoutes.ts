import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { getUploadUrl } from '../controllers/mediaController';

export const mediaRoutes = Router();

mediaRoutes.post('/upload-url', requireAuth, asyncHandler(getUploadUrl));
