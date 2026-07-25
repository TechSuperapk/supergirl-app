import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import { Post, Event, Group, Ticket, Community, CommunityMembership, Draft } from '../types';

interface ClubState {
  feed:        Post[];
  events:      Event[];
  groups:      Group[];
  myGroups:    string[];           // group IDs
  myTickets:   Ticket[];
  activeGroup: Group | null;
  feedCursor:  string | null;
  hasMoreFeed: boolean;

  // Communities ("Hives") — the Groups/Community screen's Forums tab and
  // the Home feed's community picker both read from this same list rather
  // than each screen fetching its own copy.
  communities:      Community[];
  myMemberships:    CommunityMembership[]; // this user's own join records
  // Home feed: cross-community, driven by myMemberships. Kept separate from
  // `feed` (the legacy single-community/global feed used by ClubFeedScreen)
  // so neither pagination cursor stomps on the other.
  homeFeed:         Post[];
  homeFeedCursor:   string | null;
  hasMoreHomeFeed:  boolean;
  // Individual club page: one community's own feed at a time. Reset when
  // the user navigates to a different community (see useCommunityFeed).
  activeCommunityId:      string | null;
  activeCommunityFeed:    Post[];
  activeCommunityCursor:  string | null;
  hasMoreActiveCommunity: boolean;

  drafts: Draft[];

  loading:     LoadingState;
  error:       string | null;
}

const initialState: ClubState = {
  feed:        [],
  events:      [],
  groups:      [],
  myGroups:    [],
  myTickets:   [],
  activeGroup: null,
  feedCursor:  null,
  hasMoreFeed: true,

  communities:      [],
  myMemberships:    [],
  homeFeed:         [],
  homeFeedCursor:   null,
  hasMoreHomeFeed:  true,
  activeCommunityId:      null,
  activeCommunityFeed:    [],
  activeCommunityCursor:  null,
  hasMoreActiveCommunity: true,

  drafts: [],

  loading:     'idle',
  error:       null,
};

const clubSlice = createSlice({
  name: 'club',
  initialState,
  reducers: {
    setLoading(state, a: PayloadAction<LoadingState>) { state.loading = a.payload; },
    setError(state, a: PayloadAction<string | null>)  { state.error = a.payload; },

    // Feed
    setFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.feed       = a.payload.posts;
      state.feedCursor = a.payload.cursor;
      state.hasMoreFeed = a.payload.hasMore;
    },
    appendFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.feed        = [...state.feed, ...a.payload.posts];
      state.feedCursor  = a.payload.cursor;
      state.hasMoreFeed = a.payload.hasMore;
    },
    prependPost(state, a: PayloadAction<Post>) {
      state.feed.unshift(a.payload);
    },
    // Used by the live feed subscription: `posts` arrives newest-first
    // (straight from the Firestore query), so putting it ahead of the
    // existing feed keeps ordering correct without disturbing posts
    // already loaded further down via pagination.
    prependPosts(state, a: PayloadAction<Post[]>) {
      state.feed = [...a.payload, ...state.feed];
    },
    updatePost(state, a: PayloadAction<Post>) {
      const idx = state.feed.findIndex(p => p.id === a.payload.id);
      if (idx !== -1) state.feed[idx] = a.payload;
    },
    removePost(state, a: PayloadAction<string>) {
      state.feed = state.feed.filter(p => p.id !== a.payload);
    },

    // Events
    setEvents(state, a: PayloadAction<Event[]>)   { state.events = a.payload; },
    addEvent(state, a: PayloadAction<Event>)       { state.events.unshift(a.payload); },

    // Groups
    setGroups(state, a: PayloadAction<Group[]>)   { state.groups = a.payload; },
    setMyGroups(state, a: PayloadAction<string[]>){ state.myGroups = a.payload; },
    setActiveGroup(state, a: PayloadAction<Group | null>) { state.activeGroup = a.payload; },

    // Tickets
    setMyTickets(state, a: PayloadAction<Ticket[]>) { state.myTickets = a.payload; },
    addTicket(state, a: PayloadAction<Ticket>)      { state.myTickets.push(a.payload); },

    // Communities
    setCommunities(state, a: PayloadAction<Community[]>) { state.communities = a.payload; },
    setMyMemberships(state, a: PayloadAction<CommunityMembership[]>) { state.myMemberships = a.payload; },
    addMembership(state, a: PayloadAction<CommunityMembership>) {
      state.myMemberships.push(a.payload);
      const c = state.communities.find(c => c.id === a.payload.communityId);
      if (c) c.memberCount += 1;
    },
    removeMembership(state, a: PayloadAction<string>) {
      state.myMemberships = state.myMemberships.filter(m => m.communityId !== a.payload);
      const c = state.communities.find(c => c.id === a.payload);
      if (c) c.memberCount = Math.max(0, c.memberCount - 1);
    },
    updateMembershipReadState(state, a: PayloadAction<{ communityId: string; lastReadAt: string }>) {
      const m = state.myMemberships.find(m => m.communityId === a.payload.communityId);
      if (m) m.lastReadAt = a.payload.lastReadAt;
    },

    // Home feed (cross-community)
    setHomeFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.homeFeed        = a.payload.posts;
      state.homeFeedCursor  = a.payload.cursor;
      state.hasMoreHomeFeed = a.payload.hasMore;
    },
    appendHomeFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.homeFeed         = [...state.homeFeed, ...a.payload.posts];
      state.homeFeedCursor   = a.payload.cursor;
      state.hasMoreHomeFeed  = a.payload.hasMore;
    },
    prependHomeFeedPost(state, a: PayloadAction<Post>) { state.homeFeed.unshift(a.payload); },
    updateHomeFeedPost(state, a: PayloadAction<Post>) {
      const idx = state.homeFeed.findIndex(p => p.id === a.payload.id);
      if (idx !== -1) state.homeFeed[idx] = a.payload;
    },
    removeHomeFeedPost(state, a: PayloadAction<string>) {
      state.homeFeed = state.homeFeed.filter(p => p.id !== a.payload);
    },

    // Individual club page feed
    setActiveCommunity(state, a: PayloadAction<string | null>) {
      // Switching communities resets the feed/cursor — a stale feed from the
      // previous community must never bleed into the next one's page.
      state.activeCommunityId      = a.payload;
      state.activeCommunityFeed    = [];
      state.activeCommunityCursor  = null;
      state.hasMoreActiveCommunity = true;
    },
    setActiveCommunityFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.activeCommunityFeed    = a.payload.posts;
      state.activeCommunityCursor  = a.payload.cursor;
      state.hasMoreActiveCommunity = a.payload.hasMore;
    },
    appendActiveCommunityFeed(state, a: PayloadAction<{ posts: Post[]; cursor: string | null; hasMore: boolean }>) {
      state.activeCommunityFeed    = [...state.activeCommunityFeed, ...a.payload.posts];
      state.activeCommunityCursor  = a.payload.cursor;
      state.hasMoreActiveCommunity = a.payload.hasMore;
    },
    updateActiveCommunityPost(state, a: PayloadAction<Post>) {
      const idx = state.activeCommunityFeed.findIndex(p => p.id === a.payload.id);
      if (idx !== -1) state.activeCommunityFeed[idx] = a.payload;
    },
    removeActiveCommunityPost(state, a: PayloadAction<string>) {
      state.activeCommunityFeed = state.activeCommunityFeed.filter(p => p.id !== a.payload);
    },

    // Drafts
    setDrafts(state, a: PayloadAction<Draft[]>) { state.drafts = a.payload; },
    upsertDraft(state, a: PayloadAction<Draft>) {
      const idx = state.drafts.findIndex(d => d.id === a.payload.id);
      if (idx !== -1) state.drafts[idx] = a.payload;
      else            state.drafts.unshift(a.payload);
    },
    removeDraft(state, a: PayloadAction<string>) {
      state.drafts = state.drafts.filter(d => d.id !== a.payload);
    },
  },
});

export const {
  setLoading, setError,
  setFeed, appendFeed, prependPost, prependPosts, updatePost, removePost,
  setEvents, addEvent,
  setGroups, setMyGroups, setActiveGroup,
  setMyTickets, addTicket,
  setCommunities, setMyMemberships, addMembership, removeMembership, updateMembershipReadState,
  setHomeFeed, appendHomeFeed, prependHomeFeedPost, updateHomeFeedPost, removeHomeFeedPost,
  setActiveCommunity, setActiveCommunityFeed, appendActiveCommunityFeed, updateActiveCommunityPost, removeActiveCommunityPost,
  setDrafts, upsertDraft, removeDraft,
} = clubSlice.actions;

export default clubSlice.reducer;
