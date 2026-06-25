import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  setFeed, appendFeed, prependPost, updatePost,
  setEvents, addEvent,
  setGroups, setMyGroups, setActiveGroup,
  setMyTickets, addTicket,
} from '../store/clubSlice';
import {
  fetchFeedPage, subscribeToFeed, createPost,
  deletePost, toggleLikePost, toggleSavePost,
  uploadPostMedia,
  fetchEvents, createEvent,
  fetchMyTickets, purchaseTicket,
  fetchGroups, createGroup, joinGroup, leaveGroup,
} from '../services/clubFirestoreService';
import { Post, Event, Group } from '../types';
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
  const dispatch = useDispatch();
  const events   = useSelector((s: RootState) => s.club.events);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEvents()
      .then(evs => dispatch(setEvents(evs)))
      .finally(() => setLoading(false));
  }, []);

  const buyTicket = async (
    event: Event,
    ticketTypeId: string,
    ticketTypeName: string,
    userId: string,
  ) => {
    const ticket = await purchaseTicket({
      userId,
      eventId:        event.id,
      eventTitle:     event.title,
      ticketTypeId,
      ticketTypeName,
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
