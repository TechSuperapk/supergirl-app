// ImageLayer — draggable / rotatable / pinch-resizable photos & videos
// placed freely anywhere over the Freestyle canvas, mirroring StickerLayer's
// gesture behaviour exactly (1-finger drag to move, 2-finger pinch to
// resize, rotate to spin, long-press ~0.7s arms delete — drag onto the trash
// pill to remove). This is what makes "Insert images, drag, resize, rotate,
// and position them anywhere" possible, and — because the same x/y/scale/
// rotation is saved and re-rendered identically in the read-only view — is
// the core of the WYSIWYG guarantee (what you see while editing is exactly
// what you see after saving).
import React from 'react';
import { View, Image, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { ImagePlacement } from '../../types';

const { width: SW, height: SH } = Dimensions.get('window');

interface ItemProps {
  ip: ImagePlacement;
  onCommit: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  setActive: (v: boolean) => void;
  setArmed: (v: boolean) => void;
  setOverTrash: (v: boolean) => void;
}

function ImageItem({ ip, onCommit, onDelete, onPress, setActive, setArmed, setOverTrash }: ItemProps) {
  const tx = useSharedValue(ip.x), ty = useSharedValue(ip.y), sc = useSharedValue(ip.scale ?? 1);
  const rot = useSharedValue(ip.rotation ?? 0);
  const ox = useSharedValue(0), oy = useSharedValue(0), os = useSharedValue(1), orot = useSharedValue(0);
  const count = useSharedValue(0);
  const armed = useSharedValue(0);
  const moved = useSharedValue(0);
  const begin = () => { 'worklet'; count.value += 1; if (count.value === 1) runOnJS(setActive)(true); };
  const finalize = () => { 'worklet'; count.value -= 1; if (count.value <= 0) { count.value = 0; runOnJS(setActive)(false); runOnJS(setOverTrash)(false); } };

  const hold = Gesture.LongPress().minDuration(700).maxDistance(18)
    .onStart(() => { armed.value = 1; runOnJS(setArmed)(true); });
  // A quick tap (not armed) opens the full-screen preview; a tap while armed
  // cancels delete mode instead — same convention as stickers.
  const tap = Gesture.Tap().maxDuration(300)
    .onEnd(() => {
      if (armed.value === 1) { armed.value = 0; runOnJS(setArmed)(false); runOnJS(setOverTrash)(false); }
      else runOnJS(onPress)(ip.id);
    });
  const pan = Gesture.Pan().maxPointers(1)
    .onBegin(begin)
    .onStart(() => { ox.value = tx.value; oy.value = ty.value; })
    .onUpdate(e => {
      tx.value = ox.value + e.translationX; ty.value = oy.value + e.translationY;
      if (armed.value === 1) runOnJS(setOverTrash)(e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW / 2) < 90);
    })
    .onEnd(e => {
      if (armed.value === 1 && e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW / 2) < 90) {
        armed.value = 0; runOnJS(onDelete)(ip.id); runOnJS(setArmed)(false);
      } else {
        runOnJS(onCommit)(ip.id, tx.value, ty.value, sc.value, rot.value);
      }
      runOnJS(setOverTrash)(false);
    })
    .onFinalize(finalize);
  const pinch = Gesture.Pinch()
    .onBegin(begin)
    .onStart(() => { os.value = sc.value; })
    .onUpdate(e => { sc.value = Math.max(0.3, Math.min(4, os.value * e.scale)); })
    .onEnd(() => { runOnJS(onCommit)(ip.id, tx.value, ty.value, sc.value, rot.value); })
    .onFinalize(finalize);
  const rotate = Gesture.Rotation()
    .onBegin(begin)
    .onStart(() => { orot.value = rot.value; })
    .onUpdate(e => { rot.value = orot.value + (e.rotation * 180) / Math.PI; })
    .onEnd(() => { runOnJS(onCommit)(ip.id, tx.value, ty.value, sc.value, rot.value); })
    .onFinalize(finalize);
  const g = Gesture.Simultaneous(hold, tap, pan, pinch, rotate);
  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value }, { translateY: ty.value },
      { scale: sc.value * (1 + armed.value * 0.08) }, { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={g}>
      <Reanimated.View style={[il.wrap, { width: ip.width, height: ip.height, zIndex: ip.zIndex ?? 1 }, aStyle]}>
        {ip.isVideo ? (
          <View style={[il.media, il.videoThumb]}>
            <Text style={il.playIcon}>▶</Text>
          </View>
        ) : (
          <Image source={{ uri: ip.uri }} style={il.media} resizeMode="cover" />
        )}
      </Reanimated.View>
    </GestureDetector>
  );
}

interface LayerProps {
  images: ImagePlacement[];
  onCommit: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  onActiveChange?: (v: boolean) => void;
}

export function ImageLayer({ images, onCommit, onDelete, onPress, onActiveChange }: LayerProps) {
  const [armed, setArmed] = React.useState(false);
  const [overTrash, setOverTrash] = React.useState(false);
  const setActive = (v: boolean) => onActiveChange?.(v);

  return (
    <>
      {images.map(ip => (
        <ImageItem
          key={ip.id} ip={ip}
          onCommit={onCommit} onDelete={onDelete} onPress={onPress}
          setActive={setActive} setArmed={setArmed} setOverTrash={setOverTrash}
        />
      ))}
      {armed && (
        <View pointerEvents="none" style={il.trashZone}>
          <View style={[il.trashCircle, overTrash && il.trashCircleActive]}>
            <Text style={il.trashIcon}>🗑️</Text>
          </View>
          <Text style={il.trashLabel}>{overTrash ? 'Release to delete' : 'Drag photo here · tap to cancel'}</Text>
        </View>
      )}
    </>
  );
}

// Renders images at their saved x/y/scale/rotation with NO gestures — used
// by the read-only view so Entry/Preview/View stay pixel-identical without
// paying for gesture-handler in a screen that can't be edited anyway.
export function StaticImageLayer({ images }: { images: ImagePlacement[] }) {
  return (
    <>
      {images.map(ip => (
        <View
          key={ip.id}
          style={{
            position: 'absolute', left: ip.x, top: ip.y, width: ip.width, height: ip.height,
            zIndex: ip.zIndex ?? 1,
            transform: [{ scale: ip.scale ?? 1 }, { rotate: `${ip.rotation ?? 0}deg` }],
          }}
        >
          {ip.isVideo ? (
            <View style={[il.media, il.videoThumb]}><Text style={il.playIcon}>▶</Text></View>
          ) : (
            <Image source={{ uri: ip.uri }} style={il.media} resizeMode="cover" />
          )}
        </View>
      ))}
    </>
  );
}

const il = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 50 },
  media: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#EEE' },
  videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  playIcon: { fontSize: 28, color: '#FFF' },
  trashZone: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 200 },
  trashCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  trashCircleActive: { backgroundColor: '#EF5350', transform: [{ scale: 1.18 }] },
  trashIcon: { fontSize: 26 },
  trashLabel: { marginTop: 6, fontSize: 12, color: '#DDD' },
});
