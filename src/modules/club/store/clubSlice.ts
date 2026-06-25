import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoadingState } from '../../../shared/types/common';
import { Post, Event, Group, Ticket } from '../types';

interface ClubState {
  feed:        Post[];
  events:      Event[];
  groups:      Group[];
  myGroups:    string[];           // group IDs
  myTickets:   Ticket[];
  activeGroup: Group | null;
  feedCursor:  string | null;
  hasMoreFeed: boolean;
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
  },
});

export const {
  setLoading, setError,
  setFeed, appendFeed, prependPost, updatePost, removePost,
  setEvents, addEvent,
  setGroups, setMyGroups, setActiveGroup,
  setMyTickets, addTicket,
} = clubSlice.actions;

export default clubSlice.reducer;
