import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { createOrder, verify } from '../controllers/paymentController';

export const paymentRoutes = Router();
paymentRoutes.use(requireAuth);

paymentRoutes.post('/order', asyncHandler(createOrder));
paymentRoutes.post('/verify', asyncHandler(verify));
