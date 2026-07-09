// ─────────────────────────────────────────────────────────────────────────────
// JournalTypeCard — a tappable card for a journal type.
//   • `big`   → large card (2 per row): big icon bleeding off the top-right
//     corner, title pinned to the bottom-left corner.
//   • default → compact card (3 per row): icon centred on top, label
//     centred below.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius, Shadows } from '../../../../shared/theme/spacing';
import type { JournalTypeDef } from './journalTypes';
import { JOURNAL_TYPE_ICONS } from './journalTypeIcons';

// Each source GIF has a different amount of built-in transparent padding
// around the artwork, so the same box size makes some icons look fuller than
// others. Measured the actual artwork bounding box in each file (as a % of
// canvas height) and scaled every icon relative to Volcano.gif (vent), which
// already fills its canvas well, so all four read as equally "full":
//   morning (Sun light.gif)   ~56% tall → ×1.35
//   night   (Moon Light.gif)  ~63% tall → ×1.2
//   dream   (Feather 2.gif)   ~94% tall → ×0.8 (already fuller than target)
//   vent    (Volcano.gif)     ~75% tall → ×1 (baseline)
const BIG_ICON_SCALE: Partial<Record<string, number>> = {
  morning: 1.2,
  night:   1.05,
  dream:   0.8,
};
// Baseline big-card icon size — bled off the card's top-right corner, large
// enough to read as the card's main visual.
const BIG_ICON_BASE = 92;
// Per-icon vertical nudge (px) from the baseline bleed position — negative
// moves the icon up, positive moves it down.
const BIG_ICON_OFFSET_Y: Partial<Record<string, number>> = {
  morning: -10,
  dream:   10,
};

// Small-card icon size — one fixed size for all three (Quotes/Ideas/
// Affirmation) so the cards themselves stay identical (same square, same
// layout). Message 2.gif (quotes) has a lot more built-in transparent
// padding than the other two, so its *image* gets a boost on top of the
// shared base size to read as equally full — the icon's box/footprint in
// the layout doesn't change, only the rendered image bleeds a touch bigger.
const SMALL_ICON_SIZE = 48;
const SMALL_ICON_SCALE: Partial<Record<string, number>> = {
  quotes: 1.3,
};

interface Props {
  item:    JournalTypeDef;
  big?:    boolean;
  onPress: () => void;
}

export function JournalTypeCard({ item, big = false, onPress }: Props) {
  const { colors } = useTheme();
  const iconSource = JOURNAL_TYPE_ICONS[item.key];
  const bigIconSize   = BIG_ICON_BASE * (BIG_ICON_SCALE[item.key] ?? 1);
  const bigIconTop    = -10 + (BIG_ICON_OFFSET_Y[item.key] ?? 0);
  const smallIconSize = SMALL_ICON_SIZE * (SMALL_ICON_SCALE[item.key] ?? 1);

  // Small-card icon: a normal in-flow box, centred above the label.
  const smallIcon = (
    <View
      style={[
        s.icon,
        iconSource ? null : { backgroundColor: item.tint },
        iconSource ? s.iconSmallMedia : s.iconSmall,
      ]}
    >
      {iconSource ? (
        <Image source={iconSource} style={{ width: smallIconSize, height: smallIconSize }} contentFit="contain" autoplay />
      ) : (
        <Text style={s.emojiSmall}>{item.emoji}</Text>
      )}
    </View>
  );

  const smallLabel = (
    <AppText
      variant="headingSmall"
      color={colors.textPrimary}
      align="center"
      style={s.labelSmall}
      numberOfLines={1}
      // Shrink instead of truncating so the longest label ("Affirmation")
      // always shows in full rather than clipping with an ellipsis.
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {item.label}
    </AppText>
  );

  if (!big) {
    return (
      <TouchableOpacity
        style={[s.card, Shadows.sm, { backgroundColor: colors.bgCard, borderColor: colors.border }, s.small]}
        activeOpacity={0.95}
        onPress={onPress}
      >
        {smallIcon}
        {smallLabel}
      </TouchableOpacity>
    );
  }

  // Big card: icon bleeds big off the top-right corner (position absolute,
  // clipped to the card's rounded corners); title sits at the bottom-left,
  // in normal flow, pushed down by the card's justifyContent:'flex-end'.
  // Shadow lives on an outer wrapper with no overflow of its own — overflow:
  // 'hidden' (needed here to clip the bleeding icon) on the same view as a
  // shadow would otherwise suppress the shadow entirely on iOS.
  return (
    <View style={[s.bigShadowWrap, Shadows.sm]}>
      <TouchableOpacity
        style={[s.card, s.big, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        activeOpacity={0.95}
        onPress={onPress}
      >
        {iconSource ? (
          <Image
            source={iconSource}
            style={[s.bigIconBleed, { width: bigIconSize, height: bigIconSize, top: bigIconTop }]}
            contentFit="contain"
            autoplay
          />
        ) : (
          <View style={[s.icon, s.iconBig, s.bigIconBleed, { backgroundColor: item.tint, top: bigIconTop }]}>
            <Text style={s.emojiBig}>{item.emoji}</Text>
          </View>
        )}
        <AppText
          variant="headingSmall"
          color={colors.textPrimary}
          align="left"
          style={s.labelBig}
          numberOfLines={2}
          // Auto-shrink instead of truncating: on a narrow card/phone the
          // words scale down a touch rather than ever clipping or ellipsing —
          // the full name always shows.
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {item.label.replace(' Journal', '\nJournal')}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.sm, margin: 5, borderWidth: 1 },
  // Shadow-casting wrapper for the big card — carries the width/grid margin
  // and matching border radius for the shadow's shape, but no overflow
  // clipping of its own (see the shadow note above).
  bigShadowWrap: { width: '48.5%', marginVertical: 5, borderRadius: Radius.lg },
  // Content is bottom-aligned (justifyContent:'flex-end') so the title sits
  // in the bottom-left corner; overflow is clipped to the rounded corners so
  // the bleeding icon doesn't spill past them; position:'relative' anchors
  // the absolutely-positioned icon; margin:0 cancels the base `card` margin
  // since the wrapper above already provides the grid gap. flex:1 makes the
  // card fill its shadow-wrapper completely — the wrapper stretches to match
  // the tallest card in its row (RN's default cross-axis stretch), so
  // without flex:1 here a shorter card's visible border would stop partway
  // through that stretched height instead of reaching the same bottom edge
  // as its row neighbor.
  big: {
    margin: 0,
    flex: 1,
    // A touch shorter on Android specifically — iOS already fits the whole
    // 2x2 + 3-across block on screen; Android needed a bit more trimmed off.
    minHeight: Platform.OS === 'android' ? 104 : 118,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    // Tighten the gap between the label and the card's bottom edge — the
    // base `card` style's 16px padding on all sides left too much empty
    // space below the (bottom-pinned) text.
    paddingBottom: Spacing.sm,
  },
  // aspectRatio: 1 keeps these square at any screen width (height always
  // matches the computed width) instead of a fixed minHeight that could
  // read as rectangular on wider/narrower screens. Padding is tighter than
  // the base `card` value so the icon + label stack comfortably fits inside
  // a square this size even on the narrowest phones.
  // margin:0 cancels the base `card` style's margin:5 — the parent row
  // (HomeScreen's `rowThree`) already spaces the 3 cards apart via
  // justifyContent:'space-between', so the extra per-card margin was
  // double-spacing them. Combined with width:'30.5%' × 3, that pushed the
  // row's total width past 100% on some screens, which Yoga's flexbox then
  // resolves slightly differently on Android than iOS — showing up as
  // uneven gaps/alignment on Android specifically.
  small: { width: '30.5%', aspectRatio: 1, padding: Spacing.sm, margin: 0, alignItems: 'center', justifyContent: 'center' },

  icon: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, flexShrink: 0 },
  // Emoji-fallback containers — keep the original tinted-box size.
  iconBig:   { width: 54, height: 54 },
  iconSmall: { width: 52, height: 52 },
  // Real-GIF containers — background-free, so the icon reads as a standalone
  // 3D sticker rather than sitting in a coloured tile. Matches SMALL_ICON_SIZE.
  iconSmallMedia: { width: 48, height: 48 },
  emojiBig:   { fontSize: 30 },
  emojiSmall: { fontSize: 28 },
  // Icon image size is computed per-item above (bigIconSize/smallIconSize)
  // so each icon can be scaled to compensate for its own source padding.

  // Big-card icon: bleeds off the top-right corner of the card, sitting
  // behind/above the bottom-left title with no visual overlap.
  bigIconBleed: { position: 'absolute', top: -10, right: -10 },

  // Same fontSize/lineHeight/weight for all 7 cards (Morning/Night/Dream/Vent
  // + Quotes/Ideas/Affirmation). adjustsFontSizeToFit on both labels still
  // shrinks the odd long word ("Affirmation") rather than clipping it.
  // DMSans is loaded as a single variable-weight font file under a few
  // registered family names, so fontFamily:'DMSans-Bold' alone doesn't
  // always render as heavy as an actual separate Bold font file would —
  // pairing it with an explicit numeric fontWeight pushes the rendered
  // weight further (most visibly on Android).
  labelBig:   { fontSize: 17, lineHeight: 21, fontFamily: 'DMSans-Bold', fontWeight: '650' },
  // Fixed (smaller) size for all three small cards so "Affirmation" — the
  // one word long enough to need adjustsFontSizeToFit's shrink — sets the
  // size, and "Quotes"/"Ideas" render at that same size instead of staying
  // at their own full, unshrunk size. That's what was making the three
  // cards look mismatched.
  labelSmall: { marginTop: Spacing.xs, fontSize: 14, lineHeight: 18, fontFamily: 'DMSans-Bold', fontWeight: '650' },
});
