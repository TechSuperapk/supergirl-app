// JournalCanvas — the single shared rendering surface for a journal entry.
// Used by GuidedEntryScreen (editable=true, a live WYSIWYG editor) AND
// EntryDetailScreen (editable=false, read-only). Because both screens render
// through this exact same component with the exact same props shape, there
// is no separate "editing layout" to drift out of sync with the view — the
// canvas the person edits on IS the journal page, pixel for pixel, in both
// modes. The only difference between modes is whether text fields are
// TextInputs vs Text, whether stickers carry drag/pinch/rotate gestures vs
// render statically at their saved position, and whether the mood/weather/
// location/tag chips are tappable.
//
// The body is an ordered sequence of text/image "blocks" (see ContentBlock
// in types.ts) instead of one flat string plus freely-floating images —
// inserting a photo drops it in exactly where the cursor was, and whatever
// gets typed next continues in a fresh block right underneath it, the same
// way inserting an image works in Word/Notion.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { AppText } from '../../../../shared/components/AppText';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { Mood, MOOD_OPTIONS, StickerPlacement, ContentBlock, ScribblePage } from '../../types';
import { SCRIBBLE_VIEW_BOX } from '../../scribbleConstants';
import { HighlightedText } from './HighlightedText';
import { AttachmentGrid } from './AttachmentGrid';
import { AttachmentRef } from '../../attachmentOrder';
import { StickerLayer, StaticStickerLayer } from './StickerLayer';

export type TextAlignH = 'left' | 'center' | 'right';

interface Theme { bg: string; card: string; accent: string; }
interface ThemeColors { border: string; textMuted: string; }

export interface JournalCanvasProps {
  editable: boolean;
  th: Theme;
  colors: ThemeColors;

  title: string;
  onChangeTitle?: (v: string) => void;

  // Ordered text/image blocks — the body itself. In editable mode each text
  // block is its own TextInput (so the cursor/selection tracked per block is
  // exactly where a new image gets inserted); in read-only mode text blocks
  // render as plain HighlightedText and image blocks have no controls.
  blocks: ContentBlock[];
  onChangeBlockText?: (id: string, text: string) => void;
  onFocusBlock?: (id: string) => void;
  onSelectionChangeBlock?: (id: string, sel: { start: number; end: number }) => void;
  blockRefs?: React.MutableRefObject<Map<string, TextInput | null>>;
  onDeleteImageBlock?: (id: string) => void;
  onPressImageBlock?: (id: string) => void;

  // Scribble blocks only store a pageId — the actual paths live in the
  // entry's scribblePages, same storage as before, just referenced inline
  // now instead of via the legacy attachmentOrder grid.
  scribblePages: ScribblePage[];
  onPressScribbleBlock?: (pageId: string) => void;
  onDeleteScribbleBlock?: (id: string) => void;

  textColor: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: TextAlignH;

  mood: Mood;
  onPressMood?: () => void;

  tags: string[];
  onRemoveTag?: (t: string) => void;

  detectedHashtags: string[];

  stickers: StickerPlacement[];
  onCommitSticker?: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDeleteSticker?: (id: string) => void;

  // Legacy attachments — videos, scribbles, and (for entries saved before
  // inline images existed) any photo that hasn't been migrated into blocks —
  // shown as a plain grid below the write-area card, same as before.
  legacyAttachments: AttachmentRef[];
  onPressLegacyImage?: (uri: string) => void;
  onPressLegacyVideo?: (uri: string) => void;
  onPressLegacyScribble?: (pageId: string) => void;
  onRemoveLegacy?: (item: AttachmentRef) => void;

  onActiveChange?: (v: boolean) => void;
}

export function JournalCanvas(props: JournalCanvasProps) {
  const {
    editable, th, colors,
    title, onChangeTitle,
    blocks, onChangeBlockText, onFocusBlock, onSelectionChangeBlock, blockRefs,
    onDeleteImageBlock, onPressImageBlock,
    scribblePages, onPressScribbleBlock, onDeleteScribbleBlock,
    textColor, fontSize, bold, italic, underline, textAlign,
    mood, onPressMood,
    tags, onRemoveTag, detectedHashtags,
    stickers, onCommitSticker, onDeleteSticker,
    legacyAttachments, onPressLegacyImage, onPressLegacyVideo, onPressLegacyScribble, onRemoveLegacy,
    onActiveChange,
  } = props;

  const moodEmoji = MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? '😊';
  const moodColor = MOOD_OPTIONS.find(m => m.value === mood)?.color ?? th.accent;

  const richTextStyle = {
    fontWeight: bold ? ('800' as const) : undefined,
    fontStyle: italic ? ('italic' as const) : undefined,
    textDecorationLine: underline ? ('underline' as const) : ('none' as const),
    textAlign: textAlign ?? 'left',
  };

  return (
    <View style={[s.canvas, { backgroundColor: '#FFFFFF' }]}>
      {tags.length > 0 && (
        <View style={s.tagsRow}>
          {tags.map(t => (
            <View key={t} style={[s.tagChip, { backgroundColor: th.accent + '25' }]}>
              <AppText variant="caption" color={th.accent}>#{t}</AppText>
              {editable && !!onRemoveTag && (
                <TouchableOpacity onPress={() => onRemoveTag(t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <AppText variant="caption" color={th.accent}> ✕</AppText>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Write area — no distinct card box; title/body sit flush on the
          canvas background (flat, no border/shadow), in both modes. */}
      <View style={s.writeArea}>
        {/* Mood sits on the same line as the title now (used to be its own
            row above the card) — tappable in edit mode, plain in view mode. */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            {editable ? (
              <TextInput
                style={[s.plainTitle, { color: textColor, fontSize: Math.max(fontSize + 4, 22), fontFamily: 'DMSans-Bold' }]}
                placeholder="Title"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={onChangeTitle}
              />
            ) : (
              !!title && <Text style={[s.plainTitle, { color: textColor, fontSize: Math.max(fontSize + 4, 22), fontFamily: 'DMSans-Bold' }]}>{title}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.moodBubble, { backgroundColor: moodColor }]}
            activeOpacity={editable ? 0.8 : 1}
            disabled={!editable}
            onPress={onPressMood}
          >
            <Text style={{ fontSize: 20 }}>{moodEmoji}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.divider, { backgroundColor: '#BBBBBB' }]} />

        {/* Body — an ordered stack of text blocks and inline images. Inserting
            a photo splits whichever text block the cursor was in, so the
            image lands exactly there and typing afterwards continues in a
            fresh block right underneath it — the same feel as inserting an
            image in Word/Notion, not a floating sticker. */}
        <View style={s.bodyWrap}>
          {blocks.map((b, idx) => {
            if (b.type === 'image') {
              return (
                <View key={b.id} style={s.inlineImageWrap}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => onPressImageBlock?.(b.id)}>
                    {b.isVideo ? (
                      <View style={[s.inlineImage, s.inlineVideo]}>
                        <Text style={s.playIcon}>▶</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: b.uri }} style={s.inlineImage} resizeMode="cover" />
                    )}
                  </TouchableOpacity>
                  {editable && !!onDeleteImageBlock && (
                    <TouchableOpacity style={s.inlineRemove} onPress={() => onDeleteImageBlock(b.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.inlineRemoveText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }

            if (b.type === 'scribble') {
              const page = scribblePages.find(p => p.id === b.pageId);
              return (
                <View key={b.id} style={s.inlineImageWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[s.inlineImage, s.inlineScribble]}
                    onPress={() => b.pageId && onPressScribbleBlock?.(b.pageId)}
                  >
                    {/* viewBox matches the drawing pad's own canvas size, so the
                        whole sketch scales down to fit here instead of being
                        clipped to whatever fits in the raw pixel coordinates. */}
                    <Svg width="100%" height="100%" viewBox={SCRIBBLE_VIEW_BOX}>
                      {(page?.paths ?? []).map((p, pi) => (
                        <SvgPath key={pi} d={p.d} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      ))}
                    </Svg>
                  </TouchableOpacity>
                  {editable && !!onDeleteScribbleBlock && (
                    <TouchableOpacity style={s.inlineRemove} onPress={() => onDeleteScribbleBlock(b.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.inlineRemoveText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }

            const isLast = idx === blocks.length - 1;
            if (!editable) {
              if (!(b.text ?? '').trim()) return null;
              return (
                <HighlightedText
                  key={b.id}
                  text={b.text ?? ''}
                  color={textColor}
                  fontSize={fontSize}
                  accent={th.accent}
                  style={richTextStyle as any}
                />
              );
            }
            return (
              <TextInput
                key={b.id}
                ref={r => { if (blockRefs) blockRefs.current.set(b.id, r); }}
                style={[
                  s.plainBody, richTextStyle,
                  { color: textColor, fontSize, lineHeight: fontSize * 1.65, fontFamily: 'DMSans-Regular' },
                  isLast ? s.plainBodyLast : s.plainBodyMid,
                ]}
                placeholder={idx === 0 ? 'Write your journal...\nType #hashtags to auto-tag' : ''}
                placeholderTextColor={colors.textMuted}
                value={b.text ?? ''}
                onChangeText={t => onChangeBlockText?.(b.id, t)}
                onFocus={() => onFocusBlock?.(b.id)}
                onSelectionChange={e => onSelectionChangeBlock?.(b.id, e.nativeEvent.selection)}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
              />
            );
          })}
        </View>

        {detectedHashtags.length > 0 && (
          <View style={[s.detRow, { borderTopColor: colors.border }]}>
            <AppText variant="caption" color={th.accent}>Auto-tagged: </AppText>
            {detectedHashtags.map(t => (
              <View key={t} style={[s.detChip, { backgroundColor: th.accent + '20' }]}>
                <AppText variant="caption" color={th.accent}>#{t}</AppText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Legacy attachments — videos, scribbles, and any photo from entries
          saved before inline images existed — same grid, same spot, in both
          modes. */}
      <AttachmentGrid
        items={legacyAttachments}
        onPressImage={onPressLegacyImage}
        onPressVideo={onPressLegacyVideo}
        onPressScribble={onPressLegacyScribble}
        onRemove={editable ? onRemoveLegacy : undefined}
      />

      {/* Stickers — freeform overlay spanning the whole canvas, same
          convention as before (only images moved inline; stickers/emoji
          still drag/resize/rotate/layer freely). */}
      {editable ? (
        <StickerLayer
          stickers={stickers}
          onCommit={onCommitSticker ?? (() => {})}
          onDelete={onDeleteSticker ?? (() => {})}
          onActiveChange={onActiveChange}
        />
      ) : (
        <StaticStickerLayer stickers={stickers} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // No flex:1 anywhere in this chain (canvas → writeArea → bodyWrap →
  // plainBodyLast) — a flex:1 child inside a ScrollView's content caps the
  // whole tree to the visible viewport height instead of letting it grow
  // past it, which was silently breaking scrolling on any entry with
  // enough content (several images/blocks) to actually need it. minHeight
  // still gives the card a reasonable presence on short entries; it just
  // no longer forces everything to fit exactly one screen.
  canvas: { position: 'relative', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  moodBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  tagChip: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  writeArea: { borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, marginBottom: Spacing.md },
  plainTitle: { fontSize: 20, fontWeight: '800', paddingVertical: Spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  bodyWrap: { minHeight: 60 },
  plainBody: { fontSize: 16, lineHeight: 24, paddingTop: 0 },
  plainBodyMid: { minHeight: 24 },
  plainBodyLast: { minHeight: 60 },
  // Inline images — sit in the natural reading order of the text, full
  // write-area width, same rounded corners as legacy attachment tiles.
  inlineImageWrap: { position: 'relative', marginVertical: Spacing.sm, alignSelf: 'stretch' },
  inlineImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, backgroundColor: '#EEE' },
  inlineVideo: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  inlineScribble: { backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E0E0E0', overflow: 'hidden' },
  playIcon: { fontSize: 28, color: '#FFF' },
  inlineRemove: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center' },
  inlineRemoveText: { fontSize: 15, color: '#FFF', lineHeight: 19, fontWeight: '700' },
  detRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  detChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
});
