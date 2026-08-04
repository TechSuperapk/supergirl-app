import mongoose from 'mongoose';
import { env } from './env';

// The connection is cached at module scope so it survives across Lambda
// invocations in a warm container. ensureDb() is idempotent — safe to call on
// every request; after the first call it just hands back the cached promise.
// Calling it per-request is what lets a failed connect retry (see the catch
// below) rather than poisoning the container for its whole lifetime.
let connPromise: Promise<typeof mongoose> | null = null;

export function ensureDb(): Promise<typeof mongoose> {
  if (connPromise) return connPromise;

  mongoose.set('strictQuery', true);
  // Mongoose buffers operations issued while disconnected and replays them on
  // reconnect. Keeping that on lets a fast reconnect succeed transparently;
  // the default 10s ceiling is just too long to spend inside a 30s request.
  mongoose.set('bufferTimeoutMS', 5000);

  // Registered once, before connecting. Registering these *after* connect() on
  // every call leaks a listener pair per call (MaxListenersExceededWarning
  // after 10, plus duplicated log lines on every event).
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[db] disconnected');
  });

  connPromise = mongoose
    .connect(env.mongoUri, {
      // The 30s default plus the buffer wait can exceed the 30s API Gateway
      // ceiling — the request would 504 before we ever get a usable error.
      // Bounded so failures land inside the window and get logged.
      serverSelectionTimeoutMS: 5000,
      // Requests are strictly sequential, so one socket does the work; this is
      // just a ceiling so a burst can't fan out against the Atlas connection cap.
      maxPoolSize: 5,
    })
    .then((m) => {
      // eslint-disable-next-line no-console
      console.log('[db] connected to MongoDB');
      return m;
    })
    .catch((err) => {
      // Don't cache a rejected promise — otherwise one failed cold start poisons
      // the container and every later invocation fails against it.
      connPromise = null;
      throw err;
    });

  return connPromise;
}
