export type PostType = 'text' | 'image' | 'video' | 'poll';
export type TicketStatus = 'active' | 'used' | 'expired';
export type PostStatus = 'draft' | 'scheduled' | 'published';

// ── Communities ("Hives") ──────────────────────────────────────────────────
// Distinct from `Group` (small opt-in chat groups, see below) — a Community
// is a Forum-style Hive (Baehive, Travelhive, Makeuphive, ...). Every user is
// auto-joined to the single `isDefault` community (Baehive) on signup;
// everything else is opt-in via the Groups/Community screen's "Discover New"
// section. See services/clubFirestoreService.ts's `ensureDefaultCommunity`.
export interface Community {
  id:          string;
  name:        string;        // "Baehive", "Travelhive"
  slug:        string;        // "baehive", "travelhive" — used for the @tag
  description: string;
  iconUrl?:    string;
  emoji?:      string;        // fallback glyph icon on the Groups list
  status?:     string;        // subtitle text, e.g. "Active now" / "Webinar series"
  badge?:      number;        // unread count shown as the green pill
  category?:   string;        // Wellness / Tech / Art / Social ... (filter chips)
  memberCount: number;
  isDefault:   boolean;       // true only for Baehive
  createdAt:   string;
}

export interface CommunityMembership {
  communityId: string;
  userId:      string;
  joinedAt:    string;
  // Client-computed (not stored): unread-count badge on the Groups screen.
  lastReadAt?: string;
}

export interface PollOption {
  id:         string;
  label:      string;
  voteCount:  number;
}

export interface Poll {
  question:  string;
  options:   PollOption[];
  voterIds:  string[]; // userIds who've voted, any option — prevents double-voting
}

export interface Post {
  id:        string;
  authorId:  string;
  authorName: string;
  authorAvatar?: string;
  // Anonymous posting: authorId/authorName are ALWAYS the real author for
  // moderation — never stripped server-side. Client UI must check
  // `isAnonymous` and render "Anonymous" instead of authorName/authorAvatar
  // whenever it's true, rather than the server omitting the real identity.
  isAnonymous: boolean;
  content:   string;
  mediaUrls: string[];
  type:      PostType;
  poll?:     Poll;
  hashtags:  string[];
  mentions:  string[];
  likes:     string[];     // userIds
  saves:     string[];
  commentCount: number;
  viewCount: number;
  shareCount?: number;     // times this post/thread was shared (optional; defaults to 0 in UI)
  groupId?:  string;       // set when cross-posted into a small chat Group (legacy path)
  // Cross-posting: every community this post appears in. This is the
  // Firestore equivalent of the join-table (`post_communities`) pattern —
  // one document, an array field, queried with `array-contains` /
  // `array-contains-any` — rather than a separate join collection. It's
  // strictly better for the "no duplication, unified counts" requirement:
  // there's only ever one Post doc, so likes/comments/views are inherently
  // the same regardless of which community feed renders it. The default
  // community's id is always included, since Baehive aggregates every post.
  communityIds: string[];
  status:      PostStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id:        string;
  postId:    string;
  authorId:  string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  content:   string;
  likes:     string[];
  replies:   Reply[];
  createdAt: string;
}

// A saved-but-not-yet-posted draft — see CreatePostScreen's exit-intent
// popup ("Save as Draft"). Kept separate from Post (rather than a Post with
// status:'draft') so the Drafts list query never has to be excluded from
// every other feed query — drafts live in their own collection entirely.
export interface Draft {
  id:           string;
  authorId:     string;
  title?:       string;
  content:      string;
  mediaUrls:    string[];
  hashtags:     string[];
  isAnonymous:  boolean;
  communityIds: string[];
  updatedAt:    string;
}

export interface Reply {
  id:        string;
  commentId: string;
  authorId:  string;
  authorName: string;
  content:   string;
  likes:     string[];
  createdAt: string;
}

export interface TicketType {
  id:          string;
  name:        string;
  price:       number;
  capacity:    number;
  sold:        number;
  description?: string;
}

export interface Event {
  id:           string;
  creatorId:    string;
  title:        string;
  description:  string;
  coverUrl?:    string;
  location:     string;
  startDate:    string;
  endDate:      string;
  ticketTypes:  TicketType[];
  attendeeCount: number;
  createdAt:    string;
}

export interface Ticket {
  id:           string;
  userId:       string;
  eventId:      string;
  eventTitle:   string;
  ticketTypeId: string;
  ticketTypeName: string;
  qrToken:      string;
  status:       TicketStatus;
  purchasedAt:  string;
  // Tickets bought together in one booking share this id — used to group them
  // as a single row in My Tickets and to swipe between their QRs. Older tickets
  // (pre-grouping) may not have it, so consumers fall back to the ticket id.
  bookingId?:   string;
}

export interface Group {
  id:          string;
  name:        string;
  description: string;
  coverUrl?:   string;
  creatorId:   string;
  memberCount: number;
  isPrivate:   boolean;
  createdAt:   string;
}

export interface GroupMessage {
  id:        string;
  groupId:   string;
  senderId:  string;
  senderName: string;
  senderAvatar?: string;
  content:   string;
  mediaUrl?: string;
  createdAt: string;
}
