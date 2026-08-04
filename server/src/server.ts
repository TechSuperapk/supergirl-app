import cron from 'node-cron';
import { createApp } from './app';
import { ensureDb } from './config/db';
import { env } from './config/env';
import { runOutfitOfTheDayBatch } from './jobs/outfitOfTheDay';
import { seedCommunities } from './seed/communities';

function scheduleOutfitOfTheDay() {
  if (!env.ootdCronEnabled) return;
  if (!cron.validate(env.ootdCronSchedule)) {
    // eslint-disable-next-line no-console
    console.warn('[ootd] invalid OOTD_CRON_SCHEDULE, skipping:', env.ootdCronSchedule);
    return;
  }
  cron.schedule(env.ootdCronSchedule, () => {
    runOutfitOfTheDayBatch()
      // eslint-disable-next-line no-console
      .then(r => console.log('[ootd] batch done', r))
      // eslint-disable-next-line no-console
      .catch(e => console.error('[ootd] batch failed', e));
  });
  // eslint-disable-next-line no-console
  console.log('[ootd] scheduled:', env.ootdCronSchedule);
}

async function main() {
  await ensureDb();
  // Ensure the 12 default club communities exist (idempotent).
  await seedCommunities()
    // eslint-disable-next-line no-console
    .then(r => console.log(`[seed] communities: +${r.inserted} inserted (${r.total} total)`))
    // eslint-disable-next-line no-console
    .catch(e => console.error('[seed] communities failed:', e?.message));
  const app = createApp();
  scheduleOutfitOfTheDay();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start:', err);
  process.exit(1);
});
