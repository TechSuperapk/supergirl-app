import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { list, getOne, create, update, remove, setFavorite } from '../controllers/journalController';

export const journalRoutes = Router();
journalRoutes.use(requireAuth);

journalRoutes.get('/', asyncHandler(list));
journalRoutes.post('/', asyncHandler(create));
journalRoutes.get('/:id', asyncHandler(getOne));
journalRoutes.patch('/:id', asyncHandler(update));
journalRoutes.patch('/:id/favorite', asyncHandler(setFavorite));
journalRoutes.delete('/:id', asyncHandler(remove));
