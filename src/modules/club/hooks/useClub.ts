import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  setFeed, appendFeed, prependPost, prependPosts, updatePost, removePost as removePostAction,
  setEvents, addEvent,
  setGroups, setMyGroups, setActiveGroup,
  setMyTickets, addTicket,
  setCommunities, setMyMemberships, addMembership, removeMembership, updateMembershipReadState,
  setHomeFeed, appendHomeFeed, prependHomeFeedPost, updateHomeFeedPost, removeHomeFeedPost,
  setActiveCommunity, setActiveCommunityFeed, appendActiveCommunityFeed, updateActiveCommunityPost, removeActiveCommunityPost,
  setDrafts, upsertDraft, removeDraft,
} from '../store/clubSlice';
import {
  fetchFeedPage, subscribeToFeed, createPost,
  deletePost, toggleLikePost, toggleSavePost,
  uploadPostMedia,
  fetchEvents, createEvent,
  fetchMyTickets, purchaseTicket,
  fetchGroups, createGroup, joinGroup, leaveGroup,
  fetchCommunities, fetchMyCommunityMemberships, joinCommunity, leaveCommunity, markCommunityRead,
  fetchHomeFeed, fetchCommunityFeed,
  fetchDrafts, saveDraft as saveDraftSvc, deleteDraft as deleteDraftSvc,
} from '../services/clubFirestoreService';
import { Post, Event, Group, Draft } from '../types';
import { mergeDefaultCommunities } from '../defaultCommunities';
import { SAMPLE_EVENTS } from '../sampleEvents';
import { DocumentSnapshot } from 'firebase/firestore';

// ── Feed hook ─────────────────────────────────────────────────────────────────
export function useClubFeed() {
  const dispatch   = useDispatch();
  const user       = useSelector((s: RootState) => s.auth.user);
  const feed       = useSelector((s: RootState) => s.club.feed);
  const hasMore    = useSelector((s: RootState) => s.club.hasMoreFeed);
  const [loading,  setLoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  const load = useCallback(async (refresh = false) => {
    if (refresh) { setRefreshing(true); lastDocRef.current = undefined; }
    else          setLoading(true);
    try {
      const { posts, lastDoc, hasMore: more } = await fetchFeedPage(
        refresh ? undefined : lastDocRef.current,
      );
      lastDocRef.current = lastDoc;
      if (refresh) dispatch(setFeed({ posts, cursor: null, hasMore: more }));
      else         dispatch(appendFeed({ posts, cursor: null, hasMore: more }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => { load(true); }, []);

  // Live feed: subscribeToFeed pushes the current newest-20 posts on every
  // change. It only ever tells us about that top page, so instead of
  // replacing state.feed wholesale (which would blow away anything loaded
  // further down via loadMore's pagination), we diff against what's already
  // in state and prepend only the posts we don't have yet. feedIdsRef tracks
  // current ids so the snapshot callback (set up once) always compares
  // against fresh state instead of a stale closure over `feed`.
  const feedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => { feedIdsRef.current = new Set(feed.map(p => p.id)); }, [feed]);

  useEffect(() => {
    const unsubscribe = subscribeToFeed((posts) => {
      const newPosts = posts.filter(p => !feedIdsRef.current.has(p.id));
      if (newPosts.length) dispatch(prependPosts(newPosts));
    });
    return unsubscribe;
  }, [dispatch]);

  const likePost = async (postId: string) => {
    if (!user) return;
    const post   = feed.find(p => p.id === postId);
    if (!post) return;
    const liked  = post.likes.includes(user.id);
    const updated = {
      ...post,
      likes: liked
        ? post.likes.filter(id => id !== user.id)
        : [...post.likes, user.id],
    };
    dispatch(updatePost(updated));                          // optimistic
    await toggleLikePost(postId, user.id, liked);
  };

  const savePost = async (postId: string) => {
    if (!user) return;
    const post  = feed.find(p => p.id === postId);
    if (!post) return;
    const saved = post.saves.includes(user.id);
    const updated = {
      ...post,
      saves: saved
        ? post.saves.filter(id => id !== user.id)
        : [...post.saves, user.id],
    };
    dispatch(updatePost(updated));
    await toggleSavePost(postId, user.id, saved);
  };

  const submitPost = async (
    content: string,
    localMediaUris: string[] = [],
    groupId?: string,
  ) => {
    if (!user || !content.trim()) return;
    const mediaUrls = localMediaUris.length
      ? await uploadPostMedia(user.id, localMediaUris)
      : [];

    const hashtags = (content.match(/#\w+/g) ?? []).map(h => h.slice(1));
    const mentions = (content.match(/@\w+/g) ?? []).map(m => m.slice(1));

    const post = await createPost({
      authorId:    user.id,
      authorName:  user.name,
      authorAvatar: user.avatarUrl,
      content,
      mediaUrls,
      type:        mediaUrls.length > 0 ? 'image' : 'text',
      hashtags,
      mentions,
      groupId,
    });
    dispatch(prependPost(post));
    return post;
  };

  const removePost = async (postId: string) => {
    await deletePost(postId);
    // Was previously missing: the post deleted fine in Firestore but stuck
    // around in local state until the next full refresh.
    dispatch(removePostAction(postId));
  };

  return {
    feed, loading, refreshing, hasMore,
    loadMore:    () => hasMore && !loading ? load(false) : undefined,
    refresh:     () => load(true),
    likePost,
    savePost,
    submitPost,
    removePost,
  };
}

// ── Events hook ───────────────────────────────────────────────────────────────
export function useClubEvents() {
  const dispatch    = useDispatch();
  const storeEvents = useSelector((s: RootState) => s.club.events);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then(evs => dispatch(setEvents(evs)))
      .finally(() => setLoading(false));
  }, []);

  // No real events yet → show the template Hangouts events so the full
  // browse → detail → book → ticket flow works. Booking a sample event still
  // creates a real ticket, so it appears in My Tickets.
  const events = storeEvents.length > 0 ? storeEvents : SAMPLE_EVENTS;

  const buyTicket = async (
    event: Event,
    ticketTypeId: string,
    ticketTypeName: string,
    userId: string,
    bookingId?: string,
  ) => {
    const ticket = await purchaseTicket({
      userId,
      eventId:        event.id,
      eventTitle:     event.title,
      ticketTypeId,
      ticketTypeName,
      bookingId,
    });
    dispatch(addTicket(ticket));
    return ticket;
  };

  return { events, loading, buyTicket };
}

// ── My Tickets hook ───────────────────────────────────────────────────────────
export function useMyTickets() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const myTickets = useSelector((s: RootState) => s.club.myTickets);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchMyTickets(user.id)
      .then(tickets => dispatch(setMyTickets(tickets)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { myTickets, loading };
}

// ── Groups hook ───────────────────────────────────────────────────────────────
export function useClubGroups() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const groups   = useSelector((s: RootState) => s.club.groups);
  const myGroups = useSelector((s: RootState) => s.club.myGroups);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchGroups()
      .then(gs => dispatch(setGroups(gs)))
      .finally(() => setLoading(false));
  }, []);

  const join = async (groupId: string) => {
    if (!user) return;
    await joinGroup(groupId, user.id);
    dispatch(setMyGroups([...myGroups, groupId]));
  };

  const leave = async (groupId: string) => {
    if (!user) return;
    await leaveGroup(groupId, user.id);
    dispatch(setMyGroups(myGroups.filter(id => id !== groupId)));
  };

  const openGroup = (group: Group) => dispatch(setActiveGroup(group));

  return { groups, myGroups, loading, join, leave, openGroup };
}

// ── Communities ("Hives") hook ─────────────────────────────────────────────────
// Drives the Groups/Community screen's Forums tab: the joined list (with
// unread badges via lastReadAt) and the "Discover New" list are both derived
// from the same two pieces of state here rather than fetched separately.
export function useCommunities() {
  const dispatch       = useDispatch();
  const user           = useSelector((s: RootState) => s.auth.user);
  const storeCommunities = useSelector((s: RootState) => s.club.communities);
  const myMemberships  = useSelector((s: RootState) => s.club.myMemberships);
  const [loading, setLoading] = useState(false);

  // Always surface the 12 built-in hives, merged with any admin-seeded
  // communities from Firestore (real docs win by id). So Groups is never empty.
  const communities = useMemo(() => mergeDefaultCommunities(storeCommunities), [storeCommunities]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        fetchCommunities(),
        fetchMyCommunityMemberships(user.id),
      ]);
      dispatch(setCommunities(all));
      dispatch(setMyMemberships(mine));
    } finally {
      setLoading(false);
    }
  }, [dispatch, user?.id]);

  useEffect(() => { load(); }, [user?.id]);

  const myCommunityIds = myMemberships.map(m => m.communityId);
  const joined    = communities.filter(c => myCommunityIds.includes(c.id));
  const discover  = communities.filter(c => !myCommunityIds.includes(c.id));

  const join = async (communityId: string) => {
    if (!user) return;
    await joinCommunity(communityId, user.id);
    dispatch(addMembership({ communityId, userId: user.id, joinedAt: new Date().toISOString() }));
  };

  const leave = async (communityId: string) => {
    if (!user) return;
    await leaveCommunity(communityId, user.id);
    dispatch(removeMembership(communityId));
  };

  const markRead = async (communityId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    dispatch(updateMembershipReadState({ communityId, lastReadAt: now })); // optimistic
    await markCommunityRead(communityId, user.id);
  };

  return {
    communities, joined, discover, myCommunityIds, myMemberships, loading,
    refresh: load, join, leave, markRead,
  };
}

// ── Home feed hook (cross-community) ───────────────────────────────────────────
// Aggregates every post from every community the user has joined. Depends on
// myMemberships already being loaded (via useCommunities, mounted once at the
// Club tab root) — falls back to Baehive-only if memberships haven't loaded
// yet, since fetchHomeFeed does the same fallback for an empty id list.
export function useHomeFeed() {
  const dispatch  = useDispatch();
  const user      = useSelector((s: RootState) => s.auth.user);
  const homeFeed  = useSelector((s: RootState) => s.club.homeFeed);
  const hasMore   = useSelector((s: RootState) => s.club.hasMoreHomeFeed);
  const myMemberships = useSelector((s: RootState) => s.club.myMemberships);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  const joinedIds = myMemberships.map(m => m.communityId);
  // Stable dependency for the effect below — myMemberships is a new array
  // reference on every membership change, but the effect should only re-run
  // when the actual set of ids changes, not on unrelated re-renders.
  const joinedIdsKey = joinedIds.slice().sort().join(',');

  const load = useCallback(async (refresh = false) => {
    if (refresh) { setRefreshing(true); lastDocRef.current = undefined; }
    else          setLoading(true);
    try {
      const { posts, lastDoc, hasMore: more } = await fetchHomeFeed(
        joinedIds,
        refresh ? undefined : lastDocRef.current,
      );
      lastDocRef.current = lastDoc;
      if (refresh) dispatch(setHomeFeed({ posts, cursor: null, hasMore: more }));
      else         dispatch(appendHomeFeed({ posts, cursor: null, hasMore: more }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch, joinedIdsKey]);

  useEffect(() => { load(true); }, [joinedIdsKey]);

  const likePost = async (postId: string) => {
    if (!user) return;
    const post = homeFeed.find(p => p.id === postId);
    if (!post) return;
    const liked = post.likes.includes(user.id);
    dispatch(updateHomeFeedPost({
      ...post,
      likes: liked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id],
    }));
    await toggleLikePost(postId, user.id, liked);
  };

  const savePost = async (postId: string) => {
    if (!user) return;
    const post = homeFeed.find(p => p.id === postId);
    if (!post) return;
    const saved = post.saves.includes(user.id);
    dispatch(updateHomeFeedPost({
      ...post,
      saves: saved ? post.saves.filter(id => id !== user.id) : [...post.saves, user.id],
    }));
    await toggleSavePost(postId, user.id, saved);
  };

  // Options-based so a thread can carry any mix of text / images / video /
  // poll (all optional) — only one of them is needed to post.
  const submitPost = async (opts: {
    content?: string;
    mediaUris?: string[];
    videoUris?: string[];
    communityIds?: string[];
    isAnonymous?: boolean;
    poll?: Post['poll'];
  }) => {
    if (!user) return;
    const {
      content = '', mediaUris = [], videoUris = [],
      communityIds = [], isAnonymous = false, poll,
    } = opts;
    const hasAny = content.trim() || mediaUris.length || videoUris.length || poll;
    if (!hasAny) return;

    const imageUrls = mediaUris.length ? await uploadPostMedia(user.id, mediaUris) : [];
    const videoUrls = videoUris.length ? await uploadPostMedia(user.id, videoUris) : [];
    const mediaUrls = [...imageUrls, ...videoUrls];
    const hashtags = (content.match(/#\w+/g) ?? []).map(h => h.slice(1));
    const mentions = (content.match(/@\w+/g) ?? []).map(m => m.slice(1));
    const type: Post['type'] =
      poll ? 'poll' : videoUrls.length ? 'video' : imageUrls.length ? 'image' : 'text';

    const post = await createPost({
      authorId:    user.id,
      authorName:  user.name,
      authorAvatar: user.avatarUrl,
      isAnonymous,
      content,
      mediaUrls,
      type,
      poll,
      hashtags,
      mentions,
      communityIds,
    });
    dispatch(prependHomeFeedPost(post));
    return post;
  };

  const removePost = async (postId: string) => {
    await deletePost(postId);
    dispatch(removeHomeFeedPost(postId));
  };

  return {
    homeFeed, loading, refreshing, hasMore,
    loadMore: () => hasMore && !loading ? load(false) : undefined,
    refresh:  () => load(true),
    likePost,
    savePost,
    submitPost,
    removePost,
  };
}

// ── Individual club/community page feed hook ───────────────────────────────────
export function useCommunityFeed(communityId: string | null) {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const activeId = useSelector((s: RootState) => s.club.activeCommunityId);
  const feed     = useSelector((s: RootState) => s.club.activeCommunityFeed);
  const hasMore  = useSelector((s: RootState) => s.club.hasMoreActiveCommunity);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastDocRef = useRef<DocumentSnapshot | undefined>(undefined);

  // Switching community ids resets state.activeCommunityFeed via the
  // setActiveCommunity reducer, then this effect (re-run because communityId
  // changed) loads that community's first page.
  useEffect(() => {
    if (!communityId) return;
    dispatch(setActiveCommunity(communityId));
    lastDocRef.current = undefined;
  }, [communityId, dispatch]);

  const load = useCallback(async (refresh = false) => {
    if (!communityId || activeId !== communityId) return;
    if (refresh) { setRefreshing(true); lastDocRef.current = undefined; }
    else          setLoading(true);
    try {
      const { posts, lastDoc, hasMore: more } = await fetchCommunityFeed(
        communityId,
        refresh ? undefined : lastDocRef.current,
      );
      lastDocRef.current = lastDoc;
      if (refresh) dispatch(setActiveCommunityFeed({ posts, cursor: null, hasMore: more }));
      else         dispatch(appendActiveCommunityFeed({ posts, cursor: null, hasMore: more }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId, activeId, dispatch]);

  useEffect(() => { if (communityId && activeId === communityId) load(true); }, [communityId, activeId]);

  const likePost = async (postId: string) => {
    if (!user) return;
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    const liked = post.likes.includes(user.id);
    dispatch(updateActiveCommunityPost({
      ...post,
      likes: liked ? post.likes.filter(id => id !== user.id) : [...post.likes, user.id],
    }));
    await toggleLikePost(postId, user.id, liked);
  };

  const savePost = async (postId: string) => {
    if (!user) return;
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    const saved = post.saves.includes(user.id);
    dispatch(updateActiveCommunityPost({
      ...post,
      saves: saved ? post.saves.filter(id => id !== user.id) : [...post.saves, user.id],
    }));
    await toggleSavePost(postId, user.id, saved);
  };

  const removePost = async (postId: string) => {
    await deletePost(postId);
    dispatch(removeActiveCommunityPost(postId));
  };

  return {
    feed, loading, refreshing, hasMore,
    loadMore: () => hasMore && !loading ? load(false) : undefined,
    refresh:  () => load(true),
    likePost,
    savePost,
    removePost,
  };
}

// ── Drafts hook ─────────────────────────────────────────────────────────────────
export function useDrafts() {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const drafts   = useSelector((s: RootState) => s.club.drafts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchDrafts(user.id)
      .then(ds => dispatch(setDrafts(ds)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const save = async (
    draft: Omit<Draft, 'id' | 'authorId' | 'updatedAt'>,
    id?: string,
  ): Promise<string | undefined> => {
    if (!user) return;
    const draftId = await saveDraftSvc(user.id, draft, id);
    dispatch(upsertDraft({ ...draft, id: draftId, authorId: user.id, updatedAt: new Date().toISOString() }));
    return draftId;
  };

  const remove = async (draftId: string) => {
    await deleteDraftSvc(draftId);
    dispatch(removeDraft(draftId));
  };

  return { drafts, loading, save, remove };
}
