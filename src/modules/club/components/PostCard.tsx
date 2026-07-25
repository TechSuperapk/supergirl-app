import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ScrollView,
  StyleSheet, Share, Alert, Modal, Dimensions, Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Video, ResizeMode } from 'expo-av';
import { AppAvatar }  from '../../../shared/components/AppAvatar';
import { AppText }    from '../../../shared/components/AppText';
import { Colors }     from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { RootState }  from '../../../store';
import { Post }       from '../types';
import { displayAuthor } from '../services/clubFirestoreService';

interface Props {
  post:        Post;
  currentUserId: string;
  onPress:     () => void;
  onLike:      () => void;
  onSave:      () => void;
  onComment:   () => void;
  onDelete?:   () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Compact count formatting: 1286 -> "1286", 12400 -> "12K", 312000 -> "312K",
// 1_200_000 -> "1.2M". Keeps small numbers exact, abbreviates large ones.
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000)    return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

const HS = { top: 8, bottom: 8, left: 8, right: 8 };
const THREAD_H = 340;   // fixed image height for the Threads-style media row
const isVideoUrl = (u: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?|$)/i.test(u) || /video/i.test(u);

// "travelhive" -> "Travel Hive", "musichive" -> "Music Hive".
function prettyHive(id: string): string {
  const base = id.replace(/hive$/i, '');
  const cap = base ? base.charAt(0).toUpperCase() + base.slice(1) : id;
  return `${cap} Hive`;
}

// Fallback in-app share targets when no communities are loaded from the store.
const TEMPLATE_HIVES = [
  { id: 'baehive', slug: 'Baehive' }, { id: 'makeuphive', slug: 'Makeuphive' },
  { id: 'arthive', slug: 'Arthive' }, { id: 'travelhive', slug: 'Travelhive' },
  { id: 'foodhive', slug: 'Foodhive' }, { id: 'musichive', slug: 'Musichive' },
];

export function PostCard({
  post, currentUserId, onPress, onLike, onSave, onComment, onDelete,
}: Props) {
  const isLiked  = post.likes.includes(currentUserId);
  const isSaved  = post.saves.includes(currentUserId);
  // isOwner is always based on the real authorId — moderation/delete rights
  // never change for an anonymous post, only what's rendered below does.
  const isOwner  = post.authorId === currentUserId;
  const author   = displayAuthor(post);
  // Community/hive tag shown on the right of the header (design).
  const tagId    = post.communityIds?.find(c => c && c !== 'baehive') ?? post.communityIds?.[0];
  const hiveTag  = tagId ? prettyHive(tagId) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const media = post.mediaUrls;

  // Threads-style media row + double-tap-to-like.
  const CARD_W = Dimensions.get('window').width;
  const lastTapRef = useRef(0);
  // Full-screen Threads-style viewer: index of the tapped image, or null.
  const [viewer, setViewer] = useState<number | null>(null);
  const viewerScrollRef = useRef<ScrollView>(null);
  // Which poll option this user tapped (in-session; see note in the poll block).
  const [pollVote, setPollVote] = useState<string | null>(null);

  // Real aspect ratio (width/height) per image, so each renders at its natural
  // shape in the horizontal row instead of a forced square.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    media.forEach(uri => {
      if (ratios[uri] || !uri) return;
      Image.getSize(
        uri,
        (w, h) => { if (h > 0) setRatios(r => ({ ...r, [uri]: w / h })); },
        () => {},
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.mediaUrls]);

  // Expandable caption: show 2 lines, then "…more".
  const [expanded, setExpanded] = useState(false);
  const captionLong = post.content.trim().length > 80 || post.content.includes('\n');

  // Share sheet (Instagram-style: pick recipients + Send, or external apps).
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSel, setShareSel] = useState<string[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [extraShares, setExtraShares] = useState(0);
  const storeCommunities = useSelector((st: RootState) => st.club.communities);
  const shareTargets = (storeCommunities.length
    ? storeCommunities.map(c => ({ id: c.id, slug: c.slug }))
    : TEMPLATE_HIVES);
  const filteredTargets = shareTargets.filter(t =>
    t.slug.toLowerCase().includes(shareQuery.trim().toLowerCase()));

  // Instagram-style heart burst that pops over the photo on double-tap.
  const heartAnim = useRef(new Animated.Value(0)).current;
  const triggerHeartBurst = () => {
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }),
      Animated.timing(heartAnim, { toValue: 0, duration: 300, delay: 450, useNativeDriver: true }),
    ]).start();
  };

  // Double-tap the feed image to like (Instagram-style). Single tap does
  // nothing — posted images no longer open a preview.
  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      if (!isLiked) onLike();     // double-tap always adds a like, never removes
      triggerHeartBurst();
    } else {
      lastTapRef.current = now;
    }
  };

  const closeShare = () => { setShareOpen(false); setShareSel([]); setShareQuery(''); };

  // External apps (WhatsApp, Messages, etc.) via the OS share sheet.
  const shareExternal = async () => {
    closeShare();
    setExtraShares(n => n + 1);
    try { await Share.share({ message: `${post.content}\n\nShared from SuperGirl` }); } catch {}
  };

  const toggleShareTarget = (slug: string) =>
    setShareSel(p => (p.includes(slug) ? p.filter(x => x !== slug) : [...p, slug]));

  // Send the post to the selected in-app recipients.
  const sendToSelected = () => {
    const names = shareSel.map(x => `@${x}`).join(', ');
    const n = shareSel.length;
    closeShare();
    setExtraShares(x => x + n);
    Alert.alert('Shared', `Sent to ${names}.`);
  };

  const handleMenuPress = () => {
    if (isOwner) {
      Alert.alert('Post options', undefined, [
        { text: 'Delete post', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Report post', 'Report this post as inappropriate?', [
        { text: 'Report', style: 'destructive', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <>
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      activeOpacity={0.97}
    >
      {/* Header */}
      <View style={s.header}>
        <AppAvatar uri={author.avatar} name={author.name} size={42} />
        <View style={s.authorCol}>
          <View style={s.authorLine}>
            <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
              {author.name}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {timeAgo(post.createdAt)}
              {post.groupId && ' · from group'}
            </AppText>
          </View>
        </View>
        {hiveTag && (
          <View style={s.hiveTag}>
            <View style={s.hiveTagIcon}><Text style={s.hiveTagAt}>@</Text></View>
            <AppText variant="label" color={Colors.textPrimary} numberOfLines={1}>{hiveTag}</AppText>
          </View>
        )}
        <TouchableOpacity onPress={handleMenuPress} style={s.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.menuDots}>···</Text>
        </TouchableOpacity>
      </View>

      {/* Content — 2 lines then "…more" (all fields optional; text-only ok) */}
      {!!post.content && (
        <View style={s.content}>
          <AppText variant="body" color={Colors.textPrimary} numberOfLines={expanded ? undefined : 2}>
            {post.content}
          </AppText>
          {captionLong && (
            <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={HS}>
              <AppText variant="caption" color={Colors.textMuted}>
                {expanded ? 'less' : '…more'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <View style={s.tagsRow}>
          {post.hashtags.slice(0, 4).map(tag => (
            <View key={tag} style={s.tagPill}>
              <AppText variant="caption" color={Colors.primary}>#{tag}</AppText>
            </View>
          ))}
        </View>
      )}

      {/* Poll */}
      {post.poll && (
        <View style={s.poll}>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={{ marginBottom: 8 }}>{post.poll.question}</AppText>
          {(() => {
            const baseTotal = post.poll.options.reduce((n, o) => n + o.voteCount, 0);
            const total = baseTotal + (pollVote ? 1 : 0);
            return post.poll.options.map(o => {
              const count = o.voteCount + (pollVote === o.id ? 1 : 0);
              const pct = total ? Math.round((count / total) * 100) : 0;
              const chosen = pollVote === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.85}
                  onPress={() => setPollVote(v => (v === o.id ? null : o.id))}
                  style={s.pollRow}
                >
                  <View style={[s.pollFill, { width: `${pct}%`, backgroundColor: chosen ? Colors.primaryLight : Colors.bgInput }]} />
                  <View style={s.pollRowInner}>
                    <AppText variant="body" color={Colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                      {chosen ? '✓ ' : ''}{o.label}
                    </AppText>
                    <AppText variant="label" color={Colors.textMuted}>{pct}%</AppText>
                  </View>
                </TouchableOpacity>
              );
            });
          })()}
          <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: 4 }}>
            {post.poll.options.reduce((n, o) => n + o.voteCount, 0) + (pollVote ? 1 : 0)} votes
          </AppText>
        </View>
      )}

      {/* Media — Threads-style: images at natural aspect ratio in a
          horizontally scrollable row (scroll to view all). */}
      {media.length > 0 && (
        <View style={s.mediaWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.threadRow}
          >
            {media.map((uri, i) => {
              const vid = isVideoUrl(uri);
              const ratio = ratios[uri] ?? (vid ? 0.7 : 0.85);   // width / height
              const w = Math.max(180, Math.min(THREAD_H * ratio, CARD_W * 0.86));
              return (
                <TouchableOpacity
                  key={`${post.id}-m-${i}`}
                  activeOpacity={0.95}
                  onPress={() => setViewer(i)}
                  style={[s.threadImgWrap, { width: w }]}
                >
                  {vid ? (
                    <>
                      <Video source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
                      <View style={s.playBadge}><Text style={s.playBadgeIcon}>▶</Text></View>
                    </>
                  ) : (
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Actions — Instagram-style icon row */}
      <View style={s.igActions}>
        <TouchableOpacity onPress={onLike} hitSlop={HS}>
          <Text style={[s.heartIcon, isLiked && s.heartOn]}>{isLiked ? '♥' : '♡'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} hitSlop={HS}>
          <Text style={s.igIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShareOpen(true)} hitSlop={HS}>
          <Text style={s.igIcon}>✈️</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onSave} hitSlop={HS}>
          <Text style={s.igIcon}>{isSaved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats — likes / comments / shares / views counts */}
      <View style={s.igStats}>
        <AppText variant="label" color={Colors.textPrimary}>{fmt(post.likes.length)} likes</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {`   ·   ${fmt(post.commentCount)} comments   ·   ${fmt((post.shareCount ?? 0) + extraShares)} shares   ·   ${fmt(post.viewCount)} views`}
        </AppText>
      </View>
    </TouchableOpacity>

    {/* Threads-style full-screen image viewer with bottom like/comment bar */}
    <Modal
      visible={viewer !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setViewer(null)}
      onShow={() => viewerScrollRef.current?.scrollTo({ x: (viewer ?? 0) * CARD_W, animated: false })}
    >
      <View style={s.tv}>
        <TouchableOpacity style={s.tvClose} onPress={() => setViewer(null)} hitSlop={HS}>
          <Text style={s.tvCloseX}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          ref={viewerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={s.tvScroll}
        >
          {media.map((uri, i) => (
            <TouchableOpacity key={i} activeOpacity={1} onPress={handleImageTap} style={s.tvPage}>
              {isVideoUrl(uri) ? (
                <Video source={{ uri }} style={s.tvImage} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay />
              ) : (
                <Image source={{ uri }} style={s.tvImage} resizeMode="contain" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Animated.View
          pointerEvents="none"
          style={[s.burst, {
            opacity: heartAnim,
            transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }]}
        >
          <Text style={s.burstHeart}>♥</Text>
        </Animated.View>

        {/* Bottom bar — like & comment with their counts */}
        <View style={s.tvBar}>
          <TouchableOpacity style={s.tvAction} onPress={onLike} hitSlop={HS}>
            <Text style={[s.tvHeart, isLiked && s.heartOn]}>{isLiked ? '♥' : '♡'}</Text>
            <Text style={s.tvCount}>{fmt(post.likes.length)} likes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tvAction} onPress={() => { setViewer(null); onComment(); }} hitSlop={HS}>
            <Text style={s.tvIcon}>💬</Text>
            <Text style={s.tvCount}>{fmt(post.commentCount)} comments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tvAction} onPress={() => setShareOpen(true)} hitSlop={HS}>
            <Text style={s.tvIcon}>✈️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Share sheet — Instagram-style: search + recipients grid + Send, external apps below */}
    <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={closeShare}>
      <TouchableOpacity style={s.shareBackdrop} activeOpacity={1} onPress={closeShare}>
        <TouchableOpacity activeOpacity={1} style={s.shareSheet}>
          <View style={s.shareGrab} />

          {/* Search */}
          <View style={s.shareSearch}>
            <Text style={s.shareSearchIcon}>🔍</Text>
            <TextInput
              value={shareQuery}
              onChangeText={setShareQuery}
              placeholder="Search"
              placeholderTextColor={Colors.textLight}
              style={s.shareSearchInput}
            />
          </View>

          {/* Recipients grid */}
          <View style={s.shareGrid}>
            {filteredTargets.map(t => {
              const on = shareSel.includes(t.slug);
              return (
                <TouchableOpacity key={t.id} style={s.gridItem} onPress={() => toggleShareTarget(t.slug)} activeOpacity={0.8}>
                  <View style={[s.gridAvatar, on && s.gridAvatarOn]}>
                    <Text style={{ fontSize: 26 }}>🐝</Text>
                    {on && <View style={s.gridCheck}><Text style={s.gridCheckTxt}>✓</Text></View>}
                  </View>
                  <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>@{t.slug}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.shareDivider} />

          {/* External apps */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.extRow}>
            {[
              { emoji: '⊕',  label: 'Add to story' },
              { emoji: '🔗', label: 'Copy link' },
              { emoji: '💬', label: 'WhatsApp' },
              { emoji: '📨', label: 'Messages' },
              { emoji: 'f',  label: 'Facebook' },
              { emoji: '⋯',  label: 'More' },
            ].map(x => (
              <TouchableOpacity key={x.label} style={s.extItem} onPress={shareExternal} activeOpacity={0.8}>
                <View style={s.extIcon}><Text style={{ fontSize: 22 }}>{x.emoji}</Text></View>
                <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>{x.label}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Send button appears once recipients are selected */}
          {shareSel.length > 0 && (
            <TouchableOpacity style={s.sendBtn} onPress={sendToSelected} activeOpacity={0.85}>
              <AppText variant="button" color={Colors.white}>
                Send{shareSel.length > 1 ? ` (${shareSel.length})` : ''}
              </AppText>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    marginBottom: 8,
    paddingTop: Spacing.base,
    ...Shadows.sm,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginBottom:   Spacing.sm,
  },
  authorCol:  { flex: 1, gap: 2 },
  authorLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  hiveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 4, paddingRight: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(153,153,153,0.20)',
  },
  hiveTagIcon: {
    width: 22, height: 22, borderRadius: 7, backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  hiveTagAt: { color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold },
  menuBtn:    { padding: 4, marginLeft: 4 },
  menuDots:   { fontSize: 18, color: Colors.textMuted, letterSpacing: 2, fontFamily: FontFamily.bold },
  content: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    paddingHorizontal: Spacing.base,
    marginBottom:  Spacing.sm,
  },
  tagPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius:    Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  // Media grid
  mediaGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            2,
    marginBottom:   Spacing.sm,
    overflow:       'hidden',
  },
  mediaThumb:  { overflow: 'hidden', backgroundColor: Colors.bgInput },
  mediaSingle: { width: '100%', height: 280 },
  mediaHalf:   { width: '49.5%', height: 200 },
  mediaLarge:  { width: '100%', height: 200 },
  mediaSmall:  { width: '49.5%', height: 120 },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  // Actions row
  actions: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: Spacing.base,
    paddingVertical:  Spacing.sm,
    borderTopWidth:  0.5,
    borderTopColor:  Colors.divider,
    gap:             Spacing.sm,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  saveBtn:    { padding: 4 },
  viewsRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 16 },

  // Threads-style media row — natural aspect ratios, scroll to view all
  mediaWrap: { marginBottom: Spacing.xs },
  threadRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: 2 },
  threadImgWrap: {
    height: THREAD_H, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.bgInput,
  },
  playBadge: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  playBadgeIcon: {
    color: '#FFF', fontSize: 26,
    width: 54, height: 54, borderRadius: 27, textAlign: 'center', lineHeight: 54,
    backgroundColor: 'rgba(0,0,0,0.45)', overflow: 'hidden',
  },

  // Poll
  poll: { paddingHorizontal: Spacing.base, marginBottom: Spacing.sm, gap: 6 },
  pollRow: {
    height: 40, borderRadius: Radius.sm, overflow: 'hidden', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.sm },
  pollRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },

  // (legacy carousel styles kept below, now unused)
  carousel: { width: '100%', marginBottom: Spacing.xs, backgroundColor: Colors.bgInput },
  counterPill: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  counterText: { color: Colors.white, fontSize: 12, fontFamily: FontFamily.medium },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.club },
  // Threads-style full-screen viewer
  tv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  tvClose: {
    position: 'absolute', top: 52, right: 20, zIndex: 3,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  tvCloseX: { color: Colors.white, fontSize: 20, fontFamily: FontFamily.bold },
  tvScroll: { flexGrow: 0 },
  tvPage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.74, alignItems: 'center', justifyContent: 'center' },
  tvImage: { width: '100%', height: '100%' },
  tvBar: {
    position: 'absolute', bottom: 44, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  tvAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tvHeart: { fontSize: 30, color: Colors.white, lineHeight: 32 },
  tvIcon: { fontSize: 24, color: Colors.white },
  tvCount: { color: Colors.white, fontSize: 15, fontFamily: FontFamily.medium },

  burst: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  burstHeart: {
    fontSize: 96, color: 'rgba(255,255,255,0.95)',
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 },
  },

  igActions: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.xs, paddingBottom: 6,
  },
  igIcon:  { fontSize: 24 },
  heartIcon: { fontSize: 28, color: Colors.textPrimary, lineHeight: 30 },
  heartOn:   { color: Colors.error },
  igStats: {
    flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
  },

  // Share sheet
  shareBackdrop: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  shareSheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing['2xl'],
  },
  shareGrab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border, marginBottom: Spacing.md },
  shareSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgInput, borderRadius: Radius.full,
    paddingHorizontal: Spacing.base, height: 40, marginBottom: Spacing.base,
  },
  shareSearchIcon:  { fontSize: 15 },
  shareSearchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:  { width: '25%', alignItems: 'center', gap: 6, marginBottom: Spacing.base },
  gridAvatar: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  gridAvatarOn: { borderWidth: 2, borderColor: '#0095F6' },
  gridCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#0095F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bgCard,
  },
  gridCheckTxt: { color: Colors.white, fontSize: 11, fontFamily: FontFamily.bold },
  shareDivider: { height: 0.5, backgroundColor: Colors.divider, marginBottom: Spacing.sm },
  extRow: { gap: Spacing.base, paddingVertical: Spacing.sm, paddingRight: Spacing.base },
  extItem: { alignItems: 'center', gap: 6, width: 68 },
  extIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtn: {
    marginTop: Spacing.md, backgroundColor: '#0095F6', borderRadius: Radius.md,
    alignItems: 'center', paddingVertical: Spacing.md,
  },

  // Full-size image viewer
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width:  Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.82,
  },
  viewerClose: {
    position: 'absolute', top: 52, right: 20, zIndex: 2,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerCloseX: { color: Colors.white, fontSize: 20, fontFamily: FontFamily.bold },
  viewerNav: {
    position: 'absolute', top: '50%', marginTop: -24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerNavLeft:  { left: 14 },
  viewerNavRight: { right: 14 },
  viewerArrow: { color: Colors.white, fontSize: 30, lineHeight: 32 },
  viewerCounter: {
    position: 'absolute', bottom: 60, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
  },
  viewerCounterText: { color: Colors.white, fontSize: 13, fontFamily: FontFamily.medium },
});
