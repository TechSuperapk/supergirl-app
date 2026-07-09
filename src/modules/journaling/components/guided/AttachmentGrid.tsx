// AttachmentGrid — renders photos/videos/scribbles in one interleaved grid,
// in the order they were actually added (see attachmentOrder.ts), instead of
// two separate always-media-then-scribbles sections.
//
// Two layouts:
//   'grid' — small wrapped tiles, used in the editor for a compact review.
//   'feed' — big full-width stacked cards with a zoom icon in the corner,
//            matching the diary-app reference for the read-only detail view.
import React from 'react';
import { View, Image, TouchableOpacity, Text, Dimensions, StyleSheet } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { AttachmentRef } from '../../attachmentOrder';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { SCRIBBLE_VIEW_BOX } from '../../scribbleConstants';

const { width: SW } = Dimensions.get('window');

interface Props {
  items: AttachmentRef[];
  layout?: 'grid' | 'feed';
  onPressImage?: (uri: string) => void;
  onPressVideo?: (uri: string) => void;
  onPressScribble?: (pageId: string) => void;
  // Editor-only: show a remove (×) button on each tile.
  onRemove?: (item: AttachmentRef) => void;
}

export function AttachmentGrid({ items, layout = 'grid', onPressImage, onPressVideo, onPressScribble, onRemove }: Props) {
  if (items.length === 0) return null;
  const feed = layout === 'feed';
  return (
    <View style={feed ? s.feedList : s.grid}>
      {items.map((item, i) => {
        const key = item.kind === 'scribble' ? `scribble_${item.page.id}` : `${item.kind}_${item.uri}_${i}`;
        const boxStyle = feed ? s.feedBox : s.tile;
        const mediaStyle = feed ? s.feedMedia : s.thumb;
        return (
          <View key={key} style={boxStyle}>
            {item.kind === 'image' && (
              <TouchableOpacity onPress={() => onPressImage?.(item.uri)} activeOpacity={0.85}>
                <Image source={{ uri: item.uri }} style={mediaStyle} />
                {feed && <View style={s.zoomBadge}><Text style={s.zoomIcon}>🔍</Text></View>}
              </TouchableOpacity>
            )}
            {item.kind === 'video' && (
              <TouchableOpacity onPress={() => onPressVideo?.(item.uri)} activeOpacity={0.85} style={[mediaStyle, s.videoThumb]}>
                <Text style={feed ? s.playIconLg : s.playIcon}>▶</Text>
                {!feed && <Text style={s.videoLabel}>VIDEO</Text>}
                {feed && <View style={s.zoomBadge}><Text style={s.zoomIcon}>🔍</Text></View>}
              </TouchableOpacity>
            )}
            {item.kind === 'scribble' && (
              <TouchableOpacity
                onPress={() => onPressScribble?.(item.page.id)}
                activeOpacity={0.85}
                style={[mediaStyle, s.scribbleBox]}
              >
                {/* viewBox matching the drawing pad's own canvas size — without
                    it the SVG has no scaling info and shows the raw
                    coordinates 1:1, clipping out almost the whole drawing
                    instead of shrinking it to fit this small tile. */}
                <Svg
                  width={feed ? SW - Spacing.lg * 2 - 2 : 90}
                  height={feed ? (SW - Spacing.lg * 2 - 2) * 0.7 : 75}
                  viewBox={SCRIBBLE_VIEW_BOX}
                >
                  {item.page.paths.map((p, pi) => (
                    <SvgPath key={pi} d={p.d} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  ))}
                </Svg>
                {feed && <View style={s.zoomBadge}><Text style={s.zoomIcon}>🔍</Text></View>}
              </TouchableOpacity>
            )}
            {!!onRemove && (
              <TouchableOpacity style={s.remove} onPress={() => onRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const FEED_W = SW - Spacing.lg * 2;

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  tile: { position: 'relative' },
  thumb: { width: 90, height: 75, borderRadius: Radius.sm, backgroundColor: '#EEE' },

  feedList: { gap: Spacing.md, marginTop: Spacing.md, alignItems: 'center' },
  feedBox: { position: 'relative' },
  feedMedia: { width: FEED_W, height: FEED_W * 0.65, borderRadius: Radius.lg, backgroundColor: '#EEE' },
  scribbleBox: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E0E0E0' },

  videoThumb: { backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 22, color: '#FFF' },
  playIconLg: { fontSize: 34, color: '#FFF' },
  videoLabel: { fontSize: 8, color: '#FFF', marginTop: 2 },

  zoomBadge: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  zoomIcon: { fontSize: 13 },

  remove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 14, color: '#FFF', lineHeight: 18, fontWeight: '700' },
});
