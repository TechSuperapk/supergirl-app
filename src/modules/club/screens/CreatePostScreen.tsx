import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, Switch, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useSelector }   from 'react-redux';
import * as ImagePicker  from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useHomeFeed, useCommunities, useDrafts } from '../hooks/useClub';
import { AppText }       from '../../../shared/components/AppText';
import { AppAvatar }     from '../../../shared/components/AppAvatar';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { FontFamily }    from '../../../shared/theme/typography';

type Props = NativeStackScreenProps<any, 'CreatePost'>;

const MAX_MEDIA = 4;

// Fallback hive chips so "Select where to post" matches the design even before
// any Community docs have loaded from Firestore. Real communities (from
// useCommunities) take precedence whenever they're available.
const TEMPLATE_HIVES = [
  { id: 'baehive',     slug: 'baehive'     },
  { id: 'makeuphive',  slug: 'Makeuphive'  },
  { id: 'arthive',     slug: 'Arthive'     },
  { id: 'travelhive',  slug: 'Travelhive'  },
  { id: 'foodhive',    slug: 'Foodhive'    },
  { id: 'fitnesshive', slug: 'Fitnesshive' },
  { id: 'musichive',   slug: 'musichive'   },
  { id: 'partyhive',   slug: 'Partyhive'   },
];

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CreatePostScreen({ navigation }: Props) {
  const user           = useSelector((s: RootState) => s.auth.user);
  const { submitPost } = useHomeFeed();
  const { joined, communities } = useCommunities();
  const { drafts, save: saveDraft, remove: removeDraft } = useDrafts();

  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [mediaUris,   setMediaUris]   = useState<string[]>([]);
  const [videoUris,   setVideoUris]   = useState<string[]>([]);
  const [poll,        setPoll]        = useState<{ question: string; options: string[] } | null>(null);
  // Baehive is pre-selected (every thread mirrors into it anyway); the other
  // hives are optional extras.
  const [selectedIds, setSelectedIds] = useState<string[]>(['baehive']);
  const [anonymous,   setAnonymous]   = useState(false);
  const [posting,     setPosting]     = useState(false);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [editingId,   setEditingId]   = useState<string | undefined>();

  // Real communities win; fall back to the template hive list for preview.
  const hives = useMemo(() => {
    const real = joined.length ? joined : communities;
    return real.length ? real.map(c => ({ id: c.id, slug: c.slug })) : TEMPLATE_HIVES;
  }, [joined, communities]);

  const hashtags = useMemo(
    () => (body.match(/#\w+/g) ?? []).map(h => h.slice(1)),
    [body],
  );

  const postingIn = hives.find(h => h.id === selectedIds[0]);
  // Everything is optional — a thread just needs ONE of: text, image, video,
  // or poll. Where-to-post is always satisfied (Baehive is pre-selected).
  const hasContent = title.trim().length > 0 || body.trim().length > 0
    || mediaUris.length > 0 || videoUris.length > 0 || !!poll;
  const canPost    = hasContent && selectedIds.length > 0 && !posting;

  // ── Media ──────────────────────────────────────────────────────────────────
  const pickMedia = async () => {
    if (mediaUris.length >= MAX_MEDIA) { Alert.alert(`Max ${MAX_MEDIA} images`); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - mediaUris.length,
      quality: 0.85,
    });
    if (!result.canceled) {
      setMediaUris(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, MAX_MEDIA));
    }
  };
  const removeMedia = (idx: number) => setMediaUris(prev => prev.filter((_, i) => i !== idx));

  // ── Video ────────────────────────────────────────────────────────────────────
  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!result.canceled) setVideoUris(prev => [...prev, ...result.assets.map(a => a.uri)]);
  };
  const removeVideo = (idx: number) => setVideoUris(prev => prev.filter((_, i) => i !== idx));

  // ── Poll ─────────────────────────────────────────────────────────────────────
  const startPoll     = () => setPoll(p => p ?? { question: '', options: ['', ''] });
  const setPollQ      = (q: string) => setPoll(p => (p ? { ...p, question: q } : p));
  const setPollOpt    = (i: number, v: string) => setPoll(p => (p ? { ...p, options: p.options.map((o, idx) => (idx === i ? v : o)) } : p));
  const addPollOpt    = () => setPoll(p => (p && p.options.length < 4 ? { ...p, options: [...p.options, ''] } : p));
  const removePollOpt = (i: number) => setPoll(p => (p && p.options.length > 2 ? { ...p, options: p.options.filter((_, idx) => idx !== i) } : p));
  const clearPoll     = () => setPoll(null);

  const toggleHive = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Title is stored as the first line of the post body (the Post model has no
  // separate title field — PostCard renders the leading line prominently).
  const composed = () => (title.trim() ? `${title.trim()}\n\n${body.trim()}` : body.trim());

  const insert = (token: string) => setBody(b => `${b}${token}`);

  // ── Actions ────────────────────────────────────────────────────────────────
  const publish = async () => {
    if (!hasContent)         { Alert.alert('Nothing to post', 'Add some text, a photo, a video, or a poll.'); return; }
    if (!selectedIds.length) { Alert.alert('Select where to post', 'Pick at least one hive for your thread.'); return; }

    // A poll needs a question + at least 2 filled options; otherwise drop it.
    let cleanPoll: any;
    if (poll) {
      const opts = poll.options.map(o => o.trim()).filter(Boolean);
      if (!poll.question.trim() || opts.length < 2) {
        Alert.alert('Finish your poll', 'A poll needs a question and at least 2 options.');
        return;
      }
      cleanPoll = {
        question: poll.question.trim(),
        options: opts.map((label, i) => ({ id: `opt_${i}`, label, voteCount: 0 })),
        voterIds: [],
      };
    }

    setPosting(true);
    try {
      await submitPost({
        content: composed(),
        mediaUris,
        videoUris,
        communityIds: selectedIds,
        isAnonymous: anonymous,
        poll: cleanPoll,
      });
      if (editingId) await removeDraft(editingId); // published — clear its draft
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const saveAsDraft = async () => {
    setSheetOpen(false);
    if (!hasContent) { Alert.alert('Nothing to save yet'); return; }
    try {
      await saveDraft(
        {
          title: title.trim() || undefined,
          content: body.trim(),
          mediaUrls: mediaUris,
          hashtags,
          isAnonymous: anonymous,
          communityIds: selectedIds,
        },
        editingId,
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save draft.');
    }
  };

  const resumeDraft = (d: (typeof drafts)[number]) => {
    setEditingId(d.id);
    setTitle(d.title ?? '');
    setBody(d.content ?? '');
    setMediaUris(d.mediaUrls ?? []);
    setSelectedIds(d.communityIds ?? []);
    setAnonymous(!!d.isAnonymous);
  };

  const discard = () => {
    setSheetOpen(false);
    navigation.goBack();
  };

  const notYet = (label: string) => { setSheetOpen(false); Alert.alert(label, 'Coming soon.'); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={hit}>
          <Text style={s.headerIcon}>‹</Text>
        </TouchableOpacity>
        <AppText variant="headingSmall" color={Colors.textPrimary}>Create Thread</AppText>
        <TouchableOpacity onPress={() => setSheetOpen(true)} hitSlop={hit}>
          <Text style={s.menuDots}>⋮</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Anonymous toggle */}
          <View style={s.anonRow}>
            <Text style={s.anonIcon}>🕶️</Text>
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={Colors.textPrimary}>Post anonymously</AppText>
              <AppText variant="caption" color={Colors.textMuted}>Hide your identity from other members</AppText>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: Colors.border, true: Colors.club }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Author row */}
          <View style={s.authorRow}>
            <AppAvatar uri={anonymous ? undefined : user?.avatarUrl} name={anonymous ? 'A' : user?.name} size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>
                {anonymous ? 'Anonymous' : (user?.name ?? 'You')}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Posting in <AppText variant="caption" color={Colors.club}>{postingIn ? `@${postingIn.slug}` : 'Baehive Club'}</AppText>
              </AppText>
            </View>
          </View>

          {/* Title */}
          <TextInput
            style={s.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title your thread"
            placeholderTextColor={Colors.textLight}
            multiline
          />

          {/* Body */}
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="What would you like to share with the community?"
            placeholderTextColor={Colors.textLight}
            multiline
            textAlignVertical="top"
          />

          {/* Media previews */}
          {mediaUris.length > 0 && (
            <View style={s.mediaGrid}>
              {mediaUris.map((uri, i) => (
                <View key={i} style={s.mediaTile}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeMedia(i)}>
                    <Text style={s.removeX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Hashtag pills */}
          {hashtags.length > 0 && (
            <View style={s.tagsRow}>
              {hashtags.map((t, i) => (
                <View key={`${t}-${i}`} style={[s.tagPill, TAG_TINTS[i % TAG_TINTS.length]]}>
                  <AppText variant="caption" color={Colors.textPrimary}>#{t}</AppText>
                </View>
              ))}
            </View>
          )}

          {/* Video previews */}
          {videoUris.length > 0 && (
            <View style={s.mediaGrid}>
              {videoUris.map((_, i) => (
                <View key={i} style={s.mediaTile}>
                  <View style={[StyleSheet.absoluteFill, s.videoTile]}><Text style={s.videoPlay}>▶</Text></View>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeVideo(i)}>
                    <Text style={s.removeX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Poll editor */}
          {poll && (
            <View style={s.pollBox}>
              <View style={s.pollHead}>
                <AppText variant="label" color={Colors.textPrimary}>Poll</AppText>
                <TouchableOpacity onPress={clearPoll} hitSlop={hit}><Text style={s.pollRemove}>Remove</Text></TouchableOpacity>
              </View>
              <TextInput
                style={s.pollQ}
                value={poll.question}
                onChangeText={setPollQ}
                placeholder="Ask a question…"
                placeholderTextColor={Colors.textLight}
              />
              {poll.options.map((opt, i) => (
                <View key={i} style={s.pollOptRow}>
                  <TextInput
                    style={s.pollOpt}
                    value={opt}
                    onChangeText={v => setPollOpt(i, v)}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={Colors.textLight}
                  />
                  {poll.options.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOpt(i)} hitSlop={hit}><Text style={s.pollX}>✕</Text></TouchableOpacity>
                  )}
                </View>
              ))}
              {poll.options.length < 4 && (
                <TouchableOpacity onPress={addPollOpt}><AppText variant="label" color={Colors.club}>+ Add option</AppText></TouchableOpacity>
              )}
            </View>
          )}

          {/* Attach cards */}
          <View style={s.attachRow}>
            <TouchableOpacity style={[s.attachCard, s.attachTall, s.tintBlue]} onPress={pickMedia} activeOpacity={0.85}>
              <View style={s.attachIconWrap}><Text style={s.attachEmoji}>🖼️</Text></View>
              <AppText variant="label" color={Colors.textSecondary}>Add Media</AppText>
            </TouchableOpacity>
            <View style={s.attachColumn}>
              <TouchableOpacity style={[s.attachCard, s.tintPurple]} onPress={pickVideo} activeOpacity={0.85}>
                <View style={s.attachIconWrap}><Text style={s.attachEmoji}>🎬</Text></View>
                <AppText variant="label" color={Colors.textSecondary}>Video</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[s.attachCard, s.tintPeach]} onPress={startPoll} activeOpacity={0.85}>
                <View style={s.attachIconWrap}><Text style={s.attachEmoji}>📊</Text></View>
                <AppText variant="label" color={Colors.textSecondary}>Poll</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Select where to post */}
          <View style={s.sectionHeadRow}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>Select where to post</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Required</AppText>
          </View>
          <View style={s.chipsWrap}>
            {hives.map(h => {
              const on = selectedIds.includes(h.id);
              return (
                <TouchableOpacity key={h.id} onPress={() => toggleHive(h.id)} activeOpacity={0.8}
                  style={[s.chip, on && s.chipOn]}>
                  <AppText variant="label" color={on ? Colors.white : Colors.textPrimary}>@{h.slug}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Drafts */}
          {drafts.length > 0 && (
            <>
              <View style={s.draftDivider}>
                <View style={s.dline} />
                <AppText variant="caption" color={Colors.textMuted}>Drafts</AppText>
                <View style={s.dline} />
              </View>
              {drafts.map(d => (
                <View key={d.id} style={s.draftCard}>
                  <View style={s.draftTop}>
                    <View style={s.draftBadge}>
                      <AppText variant="caption" color={Colors.textSecondary}>
                        {d.communityIds?.[0] ? `@${d.communityIds[0]}` : 'Draft'}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={Colors.textMuted}>Edited {timeAgo(d.updatedAt)}</AppText>
                  </View>
                  {!!d.title && <AppText variant="label" color={Colors.textPrimary} numberOfLines={1} style={{ marginTop: 6 }}>{d.title}</AppText>}
                  <AppText variant="body" color={Colors.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
                    {d.content}
                  </AppText>
                  <View style={s.draftActions}>
                    <TouchableOpacity style={s.draftDelete} onPress={() => removeDraft(d.id)} hitSlop={hit}>
                      <Text style={{ fontSize: 15 }}>🗑️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.resumeBtn} onPress={() => resumeDraft(d)} activeOpacity={0.85}>
                      <AppText variant="label" color={Colors.white}>✎ Resume</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={s.toolbar}>
          <TouchableOpacity style={s.toolBtn} onPress={() => insert('**bold**')}><Text style={s.toolBold}>B</Text></TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => insert('_italic_')}><Text style={s.toolItalic}>I</Text></TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => insert('[link](url)')}><Text style={s.toolIcon}>🔗</Text></TouchableOpacity>
          <View style={s.toolDivider} />
          <TouchableOpacity style={s.toolBtn} onPress={() => insert('@')}><Text style={s.toolIcon}>＠</Text></TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => insert('✨')}><Text style={s.toolIcon}>😊</Text></TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[s.sendBtn, !canPost && s.sendBtnOff]}
            onPress={publish}
            disabled={!canPost}
            activeOpacity={0.85}
          >
            <Text style={s.sendIcon}>{posting ? '…' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Options bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setSheetOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.grabber} />
            <SheetRow icon="✉️" tint={Colors.primaryLight} title="Save as Draft" sub="Finish your thoughts later" onPress={saveAsDraft} />
            <SheetRow icon="🕐" tint="#F0E9FF" title="Schedule Post" sub="Pick a perfect time for your community" onPress={() => notYet('Schedule Post')} />
            <SheetRow icon="⚙️" tint="#FFF4E0" title="Post Settings" sub="Manage replies and visibility" onPress={() => notYet('Post Settings')} />
            <SheetRow icon="🗑️" tint="#FDE7E7" title="Discard" sub="Permanently delete this thread" danger onPress={discard} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function SheetRow({ icon, tint, title, sub, onPress, danger }: {
  icon: string; tint: string; title: string; sub: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={s.sheetRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.sheetIcon, { backgroundColor: tint }]}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <AppText variant="headingSmall" color={danger ? Colors.error : Colors.textPrimary}>{title}</AppText>
        <AppText variant="caption" color={Colors.textMuted}>{sub}</AppText>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const hit = { top: 10, bottom: 10, left: 10, right: 10 };

const TAG_TINTS = [
  { backgroundColor: '#EDE7FF' },
  { backgroundColor: '#FCE4EC' },
  { backgroundColor: '#EFE7DA' },
];

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgCard },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  headerIcon: { fontSize: 30, color: Colors.textPrimary, lineHeight: 30 },
  menuDots:   { fontSize: 22, color: Colors.textPrimary, fontFamily: FontFamily.bold },
  scroll:     { padding: Spacing.base, paddingBottom: Spacing['2xl'], gap: Spacing.base },

  anonRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md,
  },
  anonIcon: { fontSize: 20 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  titleInput: {
    fontFamily: FontFamily.bold, fontSize: 20, color: Colors.textPrimary,
    paddingVertical: 2,
  },
  bodyInput: {
    fontFamily: FontFamily.regular, fontSize: 15, color: Colors.textPrimary,
    minHeight: 90, lineHeight: 24, textAlignVertical: 'top',
  },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaTile: { width: 92, height: 92, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.bgInput },
  removeBtn: {
    position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  removeX: { color: Colors.white, fontSize: 12, fontFamily: FontFamily.bold },
  videoTile: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  videoPlay: { color: '#FFF', fontSize: 22 },

  pollBox: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.bgCard,
  },
  pollHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pollRemove: { color: Colors.error, fontFamily: FontFamily.medium, fontSize: 13 },
  pollQ: {
    fontFamily: FontFamily.bold, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.bgInput, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  },
  pollOptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollOpt: {
    flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9,
  },
  pollX: { fontSize: 15, color: Colors.textMuted, paddingHorizontal: 2 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },

  attachRow:    { flexDirection: 'row', gap: Spacing.md },
  attachColumn: { flex: 1, gap: Spacing.md },
  attachCard: {
    flex: 1, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.base, gap: Spacing.sm,
    minHeight: 74,
  },
  attachTall:  { minHeight: 164 },
  tintBlue:    { backgroundColor: '#EAF2FF', borderColor: '#BBD4FF' },
  tintPurple:  { backgroundColor: '#F3ECFF', borderColor: '#D6C2FF' },
  tintPeach:   { backgroundColor: '#FFF3E2', borderColor: '#FAD6A5' },
  attachIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.sm,
  },
  attachEmoji: { fontSize: 20 },

  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: Colors.bgCard,
  },
  chipOn: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },

  draftDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  dline: { flex: 1, height: 1, backgroundColor: Colors.divider },
  draftCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, gap: 2, ...Shadows.sm, backgroundColor: Colors.bgCard,
  },
  draftTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draftBadge: { backgroundColor: Colors.bgInput, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  draftActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  draftDelete: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FDE7E7',
    alignItems: 'center', justifyContent: 'center',
  },
  resumeBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: Radius.full,
    paddingHorizontal: 18, paddingVertical: 10,
  },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: Colors.divider, backgroundColor: Colors.bgCard,
  },
  toolBtn:     { paddingHorizontal: 2 },
  toolIcon:    { fontSize: 20, color: Colors.textSecondary },
  toolBold:    { fontSize: 18, fontFamily: FontFamily.bold, color: Colors.textSecondary },
  toolItalic:  { fontSize: 18, fontStyle: 'italic', fontFamily: FontFamily.italic, color: Colors.textSecondary },
  toolDivider: { width: 1, height: 22, backgroundColor: Colors.divider },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: Colors.borderStrong },
  sendIcon:   { color: Colors.white, fontSize: 18 },

  backdrop: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing['2xl'],
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border, marginBottom: Spacing.base },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  sheetIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  chevron:   { fontSize: 22, color: Colors.textLight },
});
