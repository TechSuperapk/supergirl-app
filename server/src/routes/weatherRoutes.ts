import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { current, forecast } from '../controllers/weatherController';

export const weatherRoutes = Router();
weatherRoutes.use(requireAuth);

weatherRoutes.get('/current', asyncHandler(current));
weatherRoutes.get('/forecast', asyncHandler(forecast));
