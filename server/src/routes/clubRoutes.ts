import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth';
import * as c from '../controllers/clubController';

export const clubRoutes = Router();
clubRoutes.use(requireAuth);

// Posts
clubRoutes.get('/posts', asyncHandler(c.feed));
clubRoutes.post('/posts', asyncHandler(c.createPost));
clubRoutes.delete('/posts/:id', asyncHandler(c.deletePost));
clubRoutes.post('/posts/:id/like', asyncHandler(c.likePost));
clubRoutes.post('/posts/:id/save', asyncHandler(c.savePost));
clubRoutes.post('/posts/:id/view', asyncHandler(c.viewPost));

// Comments
clubRoutes.get('/posts/:id/comments', asyncHandler(c.getComments));
clubRoutes.post('/posts/:id/comments', asyncHandler(c.addComment));
clubRoutes.post('/comments/:id/reply', asyncHandler(c.addReply));
clubRoutes.post('/comments/:id/like', asyncHandler(c.likeComment));

// Events
clubRoutes.get('/events', asyncHandler(c.getEvents));
clubRoutes.post('/events', asyncHandler(c.createEvent));

// Tickets
clubRoutes.get('/tickets', asyncHandler(c.myTickets));
clubRoutes.post('/tickets', asyncHandler(c.purchaseTicket));
clubRoutes.post('/tickets/:id/validate', asyncHandler(c.validateTicket));

// Groups
clubRoutes.get('/groups', asyncHandler(c.getGroups));
clubRoutes.post('/groups', asyncHandler(c.createGroup));
clubRoutes.post('/groups/:id/join', asyncHandler(c.joinGroup));
clubRoutes.post('/groups/:id/leave', asyncHandler(c.leaveGroup));
clubRoutes.get('/groups/:id/messages', asyncHandler(c.getGroupMessages));
clubRoutes.post('/groups/:id/messages', asyncHandler(c.sendGroupMessage));

// Communities
clubRoutes.get('/communities', asyncHandler(c.getCommunities));
clubRoutes.get('/communities/memberships', asyncHandler(c.myMemberships));
clubRoutes.post('/communities/ensure-default', asyncHandler(c.ensureDefaultCommunity));
clubRoutes.post('/communities/:id/join', asyncHandler(c.joinCommunity));
clubRoutes.post('/communities/:id/leave', asyncHandler(c.leaveCommunity));
clubRoutes.post('/communities/:id/read', asyncHandler(c.markCommunityRead));

// Drafts
clubRoutes.get('/drafts', asyncHandler(c.getDrafts));
clubRoutes.put('/drafts', asyncHandler(c.saveDraft));
clubRoutes.delete('/drafts/:id', asyncHandler(c.deleteDraft));
