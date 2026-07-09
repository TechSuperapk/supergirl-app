import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { journalRoutes } from './routes/journalRoutes';
import { noteRoutes } from './routes/noteRoutes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(',') }));
  app.use(express.json({ limit: '5mb' })); // journal bodies can carry a fair bit of rich text/structured data
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) => res.json({ ok: true, env: env.nodeEnv }));

  app.use('/api/auth', authRoutes);
  app.use('/api/journal', journalRoutes);
  app.use('/api/notes', noteRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
