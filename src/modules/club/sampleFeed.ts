/**
 * sampleFeed — template "Recent Threads" content for the Club home screen.
 *
 * The Club home feed (ClubFeedScreen / useHomeFeed) reads live posts from
 * Firestore. On a fresh account there are none, so the screen shows the empty
 * state. These template posts are rendered as a read-only fallback *only when
 * the real feed is empty*, so the home screen looks like the Figma design out
 * of the box for preview/demo. They never hit Firestore and are never editable
 * — the moment a real post exists, the live feed replaces them entirely.
 *
 * Content mirrors the SuperBae Club design (Baehive threads: café/saree,
 * mehendi & chai, picnic & painting, morning-ritual, cross-posted to
 * Travel/Music/Art Hives).
 */
import { Post } from './types';

// Synthetic like/save id arrays — PostCard renders `.length`, so this is how a
// template post shows "1286 likes" without hard-coding a giant literal.
const ids = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `sample_u_${i}`);

// Stable placeholder images (deterministic per seed) so the media grid renders.
const img = (seed: string, size = 600) =>
  `https://picsum.photos/seed/${seed}/${size}/${size}`;

const AVA_ANANYA = 'https://i.pravatar.cc/150?img=45';
const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

export const SAMPLE_FEED: Post[] = [
  {
    id: 'sample-post-1',
    authorId: 'sample-ananya',
    authorName: 'Ananya Sharma',
    authorAvatar: AVA_ANANYA,
    isAnonymous: false,
    content:
      'Sunday Café + Saree Day ✨☕🌸\n\nFinally wore the pastel saree I ordered last month and took ' +
      'myself out for a solo café date in Chennai 💗\nHonestly, nothing feels better than filter coffee, ' +
      'soft music, and dressing up just for yourself.',
    mediaUrls: [img('saree'), img('coffee'), img('sunflower')],
    type: 'image',
    hashtags: ['CafeDate', 'WeekendMood'],
    mentions: [],
    likes: ids(1286),
    saves: ids(88),
    commentCount: 312,
    viewCount: 312_000,
    shareCount: 214,
    communityIds: ['baehive', 'travelhive'],
    status: 'published',
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'sample-post-2',
    authorId: 'sample-anon-1',
    authorName: 'Ananya Sharma',
    authorAvatar: AVA_ANANYA,
    isAnonymous: true,
    content:
      'Late Night Mehendi & Chai 🌙✨☕\n\nRandomly started applying mehendi at 11 PM while listening to ' +
      'old Bollywood songs with masala chai and somehow it turned into the most peaceful night ever 🥹🤍\n' +
      'Also… why does mehendi always look prettier next day? 😅🌿',
    mediaUrls: [img('mehendi'), img('chai')],
    type: 'image',
    hashtags: ['CafeDate', 'WeekendMood'],
    mentions: [],
    likes: ids(1286),
    saves: ids(64),
    commentCount: 312,
    viewCount: 312_000,
    shareCount: 214,
    communityIds: ['baehive', 'travelhive'],
    status: 'published',
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'sample-post-3',
    authorId: 'sample-ananya',
    authorName: 'Ananya Sharma',
    authorAvatar: AVA_ANANYA,
    isAnonymous: false,
    content:
      'Weekend Picnic & Painting 🎨🌼\n\nSpent the afternoon at the park with my sketchbook, surrounded ' +
      'by nature’s beauty. Captured the vibrant flowers while enjoying homemade sandwiches. The perfect ' +
      'blend of creativity and relaxation! 🌸🥪✨',
    mediaUrls: [img('painting', 900)],
    type: 'image',
    hashtags: ['CafeDate', 'WeekendMood'],
    mentions: [],
    likes: ids(1286),
    saves: ids(51),
    commentCount: 312,
    viewCount: 312_000,
    shareCount: 214,
    communityIds: ['baehive', 'arthive'],
    status: 'published',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },
  {
    id: 'sample-post-4',
    authorId: 'sample-ananya',
    authorName: 'Ananya Sharma',
    authorAvatar: AVA_ANANYA,
    isAnonymous: false,
    content:
      'Finding Balance: My Morning Ritual for a Calmer Day\n\nLast week, I decided to finally step away ' +
      'from the immediate rush of checking my phone first thing in the morning. Instead, I’ve been ' +
      'experimenting with a ten-minute “gentle wake” period…\nThe difference in my anxiety levels has been ' +
      'profound. Start by lighting a candle with a soft scent of bergamot and simply sitting with a warm ' +
      'cup of lemon water. No screens, no notifications, just the soft morning light hitting the kitchen floor.',
    mediaUrls: [],
    type: 'text',
    hashtags: ['Wellness', 'MorningRoutine', 'SelfCare'],
    mentions: [],
    likes: ids(842),
    saves: ids(120),
    commentCount: 76,
    viewCount: 45_000,
    shareCount: 38,
    communityIds: ['baehive'],
    status: 'published',
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
  },
  {
    id: 'sample-post-5',
    authorId: 'sample-ananya',
    authorName: 'Ananya Sharma',
    authorAvatar: AVA_ANANYA,
    isAnonymous: false,
    content:
      'Late Night Mehendi & Chai 🌙✨☕\n\nRandomly started applying mehendi at 11 PM while listening to old ' +
      'Bollywood songs with masala chai and somehow it turned into the most peaceful night ever 🥹🤍',
    mediaUrls: [img('mehendi2'), img('chai2')],
    type: 'image',
    hashtags: ['CafeDate', 'WeekendMood'],
    mentions: [],
    likes: ids(1286),
    saves: ids(73),
    commentCount: 312,
    viewCount: 312_000,
    shareCount: 214,
    communityIds: ['baehive', 'musichive'],
    status: 'published',
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },
];
