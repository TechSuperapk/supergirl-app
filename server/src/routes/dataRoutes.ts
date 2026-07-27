import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { list, getOne, create, update, remove, upsert } from '../controllers/dataController';

// Generic owner-scoped CRUD for the simple collections (boards, trackers_*,
// fits_*). Everything here requires a logged-in user.
export const dataRoutes = Router();

dataRoutes.use(requireAuth);
dataRoutes.get('/:collection', asyncHandler(list));
dataRoutes.post('/:collection', asyncHandler(create));
dataRoutes.put('/:collection', asyncHandler(upsert));
dataRoutes.get('/:collection/:id', asyncHandler(getOne));
dataRoutes.patch('/:collection/:id', asyncHandler(update));
dataRoutes.delete('/:collection/:id', asyncHandler(remove));
