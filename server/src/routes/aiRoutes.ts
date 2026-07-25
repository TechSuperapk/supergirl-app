import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { detect, removeBg, suggest, ootd } from '../controllers/aiController';

export const aiRoutes = Router();
aiRoutes.use(requireAuth);

aiRoutes.post('/detect', asyncHandler(detect));
aiRoutes.post('/remove-bg', asyncHandler(removeBg));
aiRoutes.post('/suggest', asyncHandler(suggest));
aiRoutes.post('/ootd', asyncHandler(ootd));
