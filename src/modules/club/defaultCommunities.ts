/**
 * defaultCommunities — the 12 built-in "Hives" every user sees in the Groups
 * screen out of the box. These are merged with any communities that actually
 * exist in Firestore (real docs win on id collision), so the Groups page is
 * never empty and always offers the full set of hives to browse/join.
 *
 * Adding a NEW community beyond these 12 is an admin action (seeded
 * server-side) — the client can only create the single default `baehive`
 * (see firestore.rules + ensureDefaultCommunity), so end users never create
 * arbitrary communities.
 */
import { Community } from './types';

const now = new Date('2024-01-01T00:00:00.000Z').toISOString();

const hive = (
  id: string, name: string, slug: string, category: string,
  description: string, memberCount: number,
  emoji: string, status: string, badge: number, isDefault = false,
): Community => ({ id, name, slug, description, category, memberCount, emoji, status, badge, isDefault, createdAt: now });

export const DEFAULT_COMMUNITIES: Community[] = [
  hive('baehive',     'Baehive',       'baehive',     'Social',    'Your Tribe. Your People. Your Safe Space.', 22114, '🐝', 'Active now', 16, true),
  hive('makeuphive',  'Makeup Hive',   'Makeuphive',  'Beauty',    'Glam, tutorials, hauls and honest reviews.', 8420,  '💄', 'Active now', 5),
  hive('kidhive',     'Kid Hive',      'Kidhive',     'Parenting', 'Mommy talk, kids’ care and milestones.',      5310,  '🧸', 'Active thread', 14),
  hive('arthive',     'Art Hive',      'Arthive',     'Art',       'Sketch, paint, craft — share your art.',       6740,  '🎨', 'New meetup', 9),
  hive('fitnesshive', 'Fitness Hive',  'Fitnesshive', 'Wellness',  'Workouts, goals and accountability buddies.',  9120,  '🏃', 'Feedback sessions', 22),
  hive('musichive',   'Music Hive',    'Musichive',   'Music',     'Playlists, gigs and late-night lyrics.',       12030, '🎸', 'Webinar series', 30),
  hive('foodhive',    'Food Hive',     'Foodhive',    'Food',      'Recipes, cafés and everything delicious.',     7880,  '🍳', 'Webinar series', 30),
  hive('gameshive',   'Games Hive',    'Gameshive',   'Gaming',    'Squad up — mobile, console and PC.',           4990,  '🎮', 'Webinar series', 30),
  hive('travelhive',  'Travel Hive',   'Travelhive',  'Travel',    'Trips, itineraries and hidden gems.',          10450, '🧳', 'Webinar series', 30),
  hive('wellnesshive','Wellness Hive', 'Wellnesshive','Wellness',  'Mindfulness, self-care and calm.',             6120,  '🤍', 'Webinar series', 30),
  hive('spiritualhive','Spiritual Hive','Spiritualhive','Spiritual','Faith, gratitude and inner peace.',           3870,  '🧘', 'Webinar series', 30),
  hive('partyhive',   'Party Hive',    'Partyhive',   'Social',    'Events, meetups and good vibes.',              5560,  '🎭', 'Webinar series', 30),
];

/** Merge Firestore communities with the 12 defaults (real docs win by id). */
export function mergeDefaultCommunities(real: Community[]): Community[] {
  const byId = new Map<string, Community>();
  for (const c of DEFAULT_COMMUNITIES) byId.set(c.id, c);
  for (const c of real) byId.set(c.id, c);            // real overrides default
  return [...byId.values()];
}
