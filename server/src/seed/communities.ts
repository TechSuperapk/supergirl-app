/**
 * seedCommunities — inserts the 12 built-in "Hives" into `club_communities`
 * so the Club/Groups screen is populated for every user (not just merged
 * client-side). Runs on server startup and is idempotent: existing docs are
 * left untouched ($setOnInsert), so member counts and edits are never
 * clobbered. Mirrors src/modules/club/defaultCommunities.ts on the client.
 */
import { Communities } from '../models/club';

interface SeedHive {
  id: string; name: string; slug: string; category: string;
  description: string; memberCount: number; emoji: string;
  status: string; badge: number; isDefault?: boolean;
}

export const DEFAULT_COMMUNITIES: SeedHive[] = [
  { id: 'baehive',      name: 'Baehive',        slug: 'baehive',      category: 'Social',    description: 'Your Tribe. Your People. Your Safe Space.', memberCount: 22114, emoji: '🐝', status: 'Active now',        badge: 16, isDefault: true },
  { id: 'makeuphive',   name: 'Makeup Hive',    slug: 'Makeuphive',   category: 'Beauty',    description: 'Glam, tutorials, hauls and honest reviews.', memberCount: 8420,  emoji: '💄', status: 'Active now',        badge: 5 },
  { id: 'kidhive',      name: 'Kid Hive',       slug: 'Kidhive',      category: 'Parenting', description: 'Mommy talk, kids’ care and milestones.',     memberCount: 5310,  emoji: '🧸', status: 'Active thread',     badge: 14 },
  { id: 'arthive',      name: 'Art Hive',       slug: 'Arthive',      category: 'Art',       description: 'Sketch, paint, craft — share your art.',     memberCount: 6740,  emoji: '🎨', status: 'New meetup',        badge: 9 },
  { id: 'fitnesshive',  name: 'Fitness Hive',   slug: 'Fitnesshive',  category: 'Wellness',  description: 'Workouts, goals and accountability buddies.', memberCount: 9120,  emoji: '🏃', status: 'Feedback sessions', badge: 22 },
  { id: 'musichive',    name: 'Music Hive',     slug: 'Musichive',    category: 'Music',     description: 'Playlists, gigs and late-night lyrics.',     memberCount: 12030, emoji: '🎸', status: 'Webinar series',    badge: 30 },
  { id: 'foodhive',     name: 'Food Hive',      slug: 'Foodhive',     category: 'Food',      description: 'Recipes, cafés and everything delicious.',   memberCount: 7880,  emoji: '🍳', status: 'Webinar series',    badge: 30 },
  { id: 'gameshive',    name: 'Games Hive',     slug: 'Gameshive',    category: 'Gaming',    description: 'Squad up — mobile, console and PC.',         memberCount: 4990,  emoji: '🎮', status: 'Webinar series',    badge: 30 },
  { id: 'travelhive',   name: 'Travel Hive',    slug: 'Travelhive',   category: 'Travel',    description: 'Trips, itineraries and hidden gems.',        memberCount: 10450, emoji: '🧳', status: 'Webinar series',    badge: 30 },
  { id: 'wellnesshive', name: 'Wellness Hive',  slug: 'Wellnesshive', category: 'Wellness',  description: 'Mindfulness, self-care and calm.',           memberCount: 6120,  emoji: '🤍', status: 'Webinar series',    badge: 30 },
  { id: 'spiritualhive',name: 'Spiritual Hive', slug: 'Spiritualhive',category: 'Spiritual', description: 'Faith, gratitude and inner peace.',          memberCount: 3870,  emoji: '🧘', status: 'Webinar series',    badge: 30 },
  { id: 'partyhive',    name: 'Party Hive',     slug: 'Partyhive',    category: 'Social',    description: 'Events, meetups and good vibes.',            memberCount: 5560,  emoji: '🎭', status: 'Webinar series',    badge: 30 },
];

/** Idempotent: inserts any missing default communities, leaves existing ones as-is. */
export async function seedCommunities(): Promise<{ inserted: number; total: number }> {
  const C = Communities();
  let inserted = 0;
  for (const c of DEFAULT_COMMUNITIES) {
    const { id, ...rest } = c;
    const r = await C.updateOne(
      { _id: id },
      { $setOnInsert: { _id: id, ...rest, createdAt: new Date() } },
      { upsert: true },
    );
    if (r.upsertedCount) inserted++;
  }
  return { inserted, total: DEFAULT_COMMUNITIES.length };
}
