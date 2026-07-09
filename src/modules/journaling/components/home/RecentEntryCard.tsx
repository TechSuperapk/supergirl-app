// ─────────────────────────────────────────────────────────────────────────────
// RecentEntryCard — one journal entry preview in the journal history list.
// Shows date + weekday + the entry's type emoji + a Freestyle/Guided pill.
//   • Freestyle: a large mood emoji, optional title, body preview, up to two
//     media thumbnails.
//   • Guided: the entry's body (built from "Label: answer" lines) rendered as
//     muted question / answer pairs, mirroring the guided screen's prompts.
// Both end with a tag pill + the entry time.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TouchableOpacity, View, Image, Text, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import { MOOD_OPTIONS } from '../../types';
import type { JournalEntry } from '../../types';
import { ALL_TYPES } from './journalTypes';
import { JOURNAL_TYPE_ICONS } from './journalTypeIcons';

interface Props {
  entry:   JournalEntry;
  onPress: () => void;
}

const moodEmoji = (mood: JournalEntry['mood']): string =>
  MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? '📝';

const MODE_LABEL: Record<string, string> = { freestyle: 'Freestyle', guided: 'Guided' };

// A guided entry's body is a handful of "Label: answer" / "Label\nanswer"
// paragraphs joined by blank lines (see GuidedEntryScreen's onSave) — split
// them back out so each renders as a muted question + its answer.
function parseGuidedLines(body: string): { label: string; value: string }[] {
  return body.split('\n\n').map(chunk => {
    const nl = chunk.indexOf('\n');
    const colon = chunk.indexOf(':');
    const splitAt = nl !== -1 && (colon === -1 || nl < colon) ? nl : colon;
    if (splitAt === -1) return { label: '', value: chunk.trim() };
    return { label: chunk.slice(0, splitAt).trim(), value: chunk.slice(splitAt + 1).trim() };
  }).filter(l => l.value);
}

const MAX_THUMBS = 3;

// Every photo/video on the entry, in reading order — prefers the inline
// image/video blocks written by the current WYSIWYG editor, and falls back
// to the old flat `mediaUrls` for entries saved before inline media existed.
// The card only shows up to MAX_THUMBS of these (see below).
function allMedia(entry: JournalEntry): { uri: string; isVideo: boolean }[] {
  if (entry.contentBlocks?.length) {
    return entry.contentBlocks
      .filter(b => b.type === 'image' && !!b.uri)
      .map(b => ({ uri: b.uri as string, isVideo: !!b.isVideo }));
  }
  return (entry.mediaUrls ?? []).map(uri => ({ uri, isVideo: false }));
}

export function RecentEntryCard({ entry, onPress }: Props) {
  const { colors } = useTheme();
  const when   = dayjs(entry.createdAt);
  const media  = allMedia(entry);
  const shownMedia = media.slice(0, MAX_THUMBS);
  const extraCount = media.length - MAX_THUMBS; // > 0 → last thumb gets a "+N" overlay, WhatsApp-style
  const modeLabel = entry.mode ? MODE_LABEL[entry.mode] : undefined;
  const typeEmoji = ALL_TYPES.find(t => t.key === entry.category)?.emoji;
  const typeIcon  = entry.category ? JOURNAL_TYPE_ICONS[entry.category] : undefined;
  const isGuided = entry.mode === 'guided';

  // Manually-added tag → a filled colour pill; auto-detected hashtag from the
  // body → the lighter outlined pill. Both stored without the leading '#'.
  const manualTag = entry.tags?.[0];
  const autoTag = !manualTag ? entry.detectedHashtags?.[0] : undefined;

  const guidedLines = isGuided ? parseGuidedLines(entry.body).slice(0, 2) : [];

  return (
    <TouchableOpacity
      style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Date row */}
      <View style={s.dateRow}>
        <View style={s.dateLeft}>
          <AppText variant="headingSmall" color={colors.textPrimary} numberOfLines={1} style={s.dateText}>
            {when.format('D MMM, YYYY')}{'  '}
            <AppText variant="body" color={colors.textMuted}>{when.format('dddd')}</AppText>
          </AppText>
          {typeIcon ? (
            <Image source={typeIcon} style={s.typeLogo} resizeMode="contain" />
          ) : (
            // Plain Text (not AppText) — a custom fontFamily on an emoji
            // glyph strips its color rendering on Android.
            !!typeEmoji && <Text style={s.typeEmoji}>{typeEmoji}</Text>
          )}
        </View>
        {!!modeLabel && (
          <View style={[s.modePill, { borderColor: colors.border }]}>
            <AppText variant="caption" color={colors.textMuted}>{modeLabel}</AppText>
          </View>
        )}
      </View>
      <View style={[s.divider, { backgroundColor: colors.divider }]} />

      {isGuided ? (
        <View style={s.guidedBlock}>
          {guidedLines.length > 0 ? guidedLines.map((l, i) => (
            <View key={i} style={i > 0 ? s.guidedGap : undefined}>
              {!!l.label && <AppText variant="bodySmall" color={colors.textMuted}>{l.label}</AppText>}
              <AppText variant="body" color={colors.textPrimary} numberOfLines={2} style={s.guidedValue}>{l.value}</AppText>
            </View>
          )) : (
            <Text style={s.mood}>{moodEmoji(entry.mood)}</Text>
          )}
        </View>
      ) : (
        <>
          <Text style={s.mood}>{moodEmoji(entry.mood)}</Text>

          {!!entry.title && (
            <AppText variant="headingSmall" color={colors.textPrimary} style={s.title} numberOfLines={1}>
              {entry.title}
            </AppText>
          )}

          {!!entry.body && (
            <AppText variant="body" color={colors.textSecondary} numberOfLines={3} style={s.body}>
              {entry.body}
            </AppText>
          )}

          {shownMedia.length > 0 && (
            <View style={s.imageRow}>
              {shownMedia.map((m, i) => {
                const isLast = i === shownMedia.length - 1;
                const overlayCount = isLast && extraCount > 0 ? extraCount : 0;
                return (
                  <View key={i} style={s.thumbWrap}>
                    <Image source={{ uri: m.uri }} style={s.thumb} />
                    {overlayCount > 0 ? (
                      <View style={s.moreBadge}>
                        <Text style={s.moreText}>+{overlayCount}</Text>
                      </View>
                    ) : m.isVideo && (
                      <View style={s.playBadge}>
                        <Text style={s.playIcon}>▶</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={s.footerRow}>
        {manualTag ? (
          <View style={s.tagPillFilled}>
            <AppText variant="caption" color="#7A5B00">#{manualTag}</AppText>
          </View>
        ) : autoTag ? (
          <View style={[s.tagPillOutline, { borderColor: '#F4772E' }]}>
            <AppText variant="caption" color="#E65100">#{autoTag}</AppText>
          </View>
        ) : <View />}
        <AppText variant="caption" color={colors.textMuted}>{when.format('HH:mm')}</AppText>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dateText: { flexShrink: 1 },
  typeEmoji: { fontSize: 20 },
  typeLogo: { width: 26, height: 26 },
  // Full-width line — breaks out of the card's own padding so it touches
  // both edges instead of stopping short at the content inset.
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.sm, marginHorizontal: -Spacing.base },
  modePill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mood: { fontSize: 26, marginTop: Spacing.sm },
  title: { marginTop: Spacing.sm },
  body: { marginTop: Spacing.xs },
  imageRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  // Small, fixed-size tiles (not stretched to fill the row) so up to 3 fit
  // comfortably side by side without growing oversized on wider cards.
  thumbWrap: { width: 64, height: 64, position: 'relative' },
  thumb: { width: '100%', height: '100%', borderRadius: Radius.md, backgroundColor: '#EEE' },
  playBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center',
  },
  playIcon: { fontSize: 18, color: '#FFF' },
  // WhatsApp-style overflow badge on the last visible tile: "+N" for
  // however many more photos/videos aren't shown.
  moreBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  moreText: { fontSize: 17, color: '#FFF', fontWeight: '700' },
  guidedBlock: { marginTop: Spacing.base, gap: 4 },
  guidedGap: { marginTop: Spacing.sm },
  guidedValue: { marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  tagPillFilled: {
    backgroundColor: '#FDECC0',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPillOutline: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
