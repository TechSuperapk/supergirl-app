import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { journalRoutes } from './routes/journalRoutes';
import { noteRoutes } from './routes/noteRoutes';
import { aiRoutes } from './routes/aiRoutes';
import { weatherRoutes } from './routes/weatherRoutes';
import { paymentRoutes } from './routes/paymentRoutes';
import { mediaRoutes } from './routes/mediaRoutes';
import { dataRoutes } from './routes/dataRoutes';
import { clubRoutes } from './routes/clubRoutes';
import { globalLimiter } from './middleware/rateLimit';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const MONGO_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function createApp() {
  const app = express();

  // Behind Nginx — trust the first proxy so req.ip is the real client IP
  // (needed for rate limiting to be per-user, not per-proxy).
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(',') }));
  app.use(express.json({ limit: '5mb' })); // journal bodies can carry a fair bit of rich text/structured data
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
  app.use(globalLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, env: env.nodeEnv }));

  // Real DB connectivity check — separate from /health so a slow/broken
  // Mongo connection doesn't make the whole service look down, but you can
  // still tell definitively whether writes will actually reach the database.
  app.get('/health/db', async (_req, res) => {
    const state = mongoose.connection.readyState;
    const label = MONGO_STATES[state] ?? 'unknown';
    if (state !== 1) {
      return res.status(503).json({ ok: false, mongo: label });
    }
    try {
      await mongoose.connection.db!.admin().ping();
      res.json({ ok: true, mongo: label, host: mongoose.connection.host, name: mongoose.connection.name });
    } catch (e: any) {
      res.status(503).json({ ok: false, mongo: label, error: e?.message });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/journal', journalRoutes);
  app.use('/api/notes', noteRoutes);
  // AI Digital Wardrobe proxy (Milestone 2) — keeps AI/weather keys server-side.
  app.use('/api/ai', aiRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/payments', paymentRoutes);
  // S3 media uploads (presigned URLs) — replaces Firebase Storage.
  app.use('/api/media', mediaRoutes);
  // Generic owner-scoped collections (boards, trackers_*, fits_*) — replaces Firestore.
  app.use('/api/data', dataRoutes);
  // Club (posts, comments, events, tickets, groups, communities) — replaces Firestore.
  app.use('/api/club', clubRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
