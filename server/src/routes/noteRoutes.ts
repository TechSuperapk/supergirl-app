import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { list, getOne, create, update, remove } from '../controllers/noteController';

export const noteRoutes = Router();
noteRoutes.use(requireAuth);

noteRoutes.get('/', asyncHandler(list));
noteRoutes.post('/', asyncHandler(create));
noteRoutes.get('/:id', asyncHandler(getOne));
noteRoutes.patch('/:id', asyncHandler(update));
noteRoutes.delete('/:id', asyncHandler(remove));
