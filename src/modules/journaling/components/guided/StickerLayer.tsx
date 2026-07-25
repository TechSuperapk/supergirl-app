// StickerLayer — draggable / rotatable / pinch-zoomable stickers placed
// freely anywhere over the Freestyle canvas, plus the drop-to-delete trash
// zone. Extracted from WriteEntryScreen so GuidedEntryScreen's Freestyle tab
// gets the exact same gesture behaviour: 1-finger drag to move, 2-finger
// pinch to resize, and a long-press (~0.7s) arms delete mode — drag onto the
// trash pill at the bottom to remove it.
import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { StickerPlacement, STICKER_BASE } from '../../types';
import { StickerGlyph } from '../StickerGlyph';

const FRAME_PAD = 12;   // gap between the sticker and its selection frame
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

const { width: SW, height: SH } = Dimensions.get('window');

interface StickerProps {
  sp: StickerPlacement;
  onCommit: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDelete: (id: string) => void;
  setActive: (v: boolean) => void;
  setArmed: (v: boolean) => void;
  setOverTrash: (v: boolean) => void;
  selected: boolean;
  onSelect: (id: string | null) => void;
  measureOrigin: (cb: (x: number, y: number) => void) => void;
}

function StickerItem({ sp, onCommit, onDelete, setActive, setArmed, setOverTrash, selected, onSelect, measureOrigin }: StickerProps) {
  const tx = useSharedValue(sp.x), ty = useSharedValue(sp.y), sc = useSharedValue(sp.scale ?? 1);
  const rot = useSharedValue(sp.rotation ?? 0);
  const ox = useSharedValue(0), oy = useSharedValue(0), os = useSharedValue(1), orot = useSharedValue(0);
  const count = useSharedValue(0);
  const armed = useSharedValue(0);
  // `begin` is called from each gesture's onStart (real activation — actual
  // movement for pan, an actual 2nd finger for pinch/rotate), NOT onBegin.
  // onBegin fires the instant a finger touches down, before the gesture has
  // decided it's really happening — a plain tap-and-release on a sticker
  // (no drag at all) still makes pan/pinch/rotate each attempt to recognize,
  // calling onBegin, but since nothing actually activates they fail/cancel
  // out instead of reaching onEnd. onFinalize is supposed to fire either way,
  // but that "began-then-failed-without-activating" path is exactly the
  // rare edge case where it silently doesn't — permanently leaving count
  // above 0 and scrolling disabled for the rest of the session after
  // nothing more than a tap. Once a gesture has truly activated (onStart),
  // its onEnd/onFinalize pairing is the well-exercised, reliable path, so
  // gating the increment on real activation removes the failure mode
  // entirely without changing how dragging/pinching/rotating/deleting a
  // sticker actually behaves.
  const begin = () => { 'worklet'; count.value += 1; if (count.value === 1) runOnJS(setActive)(true); };
  const finalize = () => { 'worklet'; count.value -= 1; if (count.value <= 0) { count.value = 0; runOnJS(setActive)(false); runOnJS(setOverTrash)(false); } };

  // Hold ~0.7s to grab (arm delete); the sticker lifts and the trash appears.
  const hold = Gesture.LongPress().minDuration(700).maxDistance(18)
    .onStart(() => { armed.value = 1; runOnJS(setArmed)(true); });
  // Quick tap: cancel delete mode if armed, otherwise select this sticker so
  // its edit frame (delete / rotate / zoom buttons) appears.
  const tap = Gesture.Tap().maxDuration(300)
    .onEnd(() => {
      if (armed.value === 1) { armed.value = 0; runOnJS(setArmed)(false); runOnJS(setOverTrash)(false); }
      else { runOnJS(onSelect)(sp.id); }
    });
  // 1-finger drag — reposition; once armed, drop on the trash to delete.
  const pan = Gesture.Pan().maxPointers(1)
    .onStart(() => { begin(); ox.value = tx.value; oy.value = ty.value; })
    .onUpdate(e => {
      tx.value = ox.value + e.translationX; ty.value = oy.value + e.translationY;
      if (armed.value === 1) runOnJS(setOverTrash)(e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW / 2) < 90);
    })
    .onEnd(e => {
      if (armed.value === 1 && e.absoluteY > SH - 150 && Math.abs(e.absoluteX - SW / 2) < 90) {
        armed.value = 0; runOnJS(onDelete)(sp.id); runOnJS(setArmed)(false);
      } else {
        runOnJS(onCommit)(sp.id, tx.value, ty.value, sc.value, rot.value);
      }
      runOnJS(setOverTrash)(false);
    })
    .onFinalize(finalize);
  // 2-finger pinch to resize, rotate to spin.
  const pinch = Gesture.Pinch()
    .onStart(() => { begin(); os.value = sc.value; })
    .onUpdate(e => { sc.value = Math.max(0.4, Math.min(4, os.value * e.scale)); })
    .onEnd(() => { runOnJS(onCommit)(sp.id, tx.value, ty.value, sc.value, rot.value); })
    .onFinalize(finalize);
  const rotate = Gesture.Rotation()
    .onStart(() => { begin(); orot.value = rot.value; })
    .onUpdate(e => { rot.value = orot.value + (e.rotation * 180) / Math.PI; })
    .onEnd(() => { runOnJS(onCommit)(sp.id, tx.value, ty.value, sc.value, rot.value); })
    .onFinalize(finalize);
  const g = Gesture.Simultaneous(hold, tap, pan, pinch, rotate);
  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value }, { translateY: ty.value },
      { scale: sc.value * (1 + armed.value * 0.12) }, { rotate: `${rot.value}deg` },
    ],
  }));
  // Safety net: if this sticker is removed (e.g. dropped on the trash) while
  // one of its gestures was still mid-flight, the native view can be torn
  // down before that gesture's onFinalize gets a chance to run — which would
  // otherwise leave scrolling disabled for the rest of the session since
  // nothing ever reports this item back to "inactive". Unmount always
  // reports inactive so that can never get stuck, regardless of whatever the
  // gesture itself did or didn't manage to fire.
  React.useEffect(() => () => { setActive(false); }, []);

  // Axis-aligned selection frame that tracks the sticker live (reads the same
  // shared values). Kept as a sibling of the gesture view so its buttons work
  // independently, and box-none so dragging the sticker body still passes
  // through to the gesture below.
  const frameStyle = useAnimatedStyle(() => {
    const half = (STICKER_BASE * sc.value) / 2 + FRAME_PAD;
    const cx = tx.value + STICKER_BASE / 2;
    const cy = ty.value + STICKER_BASE / 2;
    return { left: cx - half, top: cy - half, width: half * 2, height: half * 2 };
  });

  // Button actions update the shared values directly, then commit.
  const commit = () => onCommit(sp.id, tx.value, ty.value, sc.value, rot.value);
  const zoomIn  = () => { sc.value = Math.min(MAX_SCALE, sc.value * 1.15); commit(); };
  const zoomOut = () => { sc.value = Math.max(MIN_SCALE, sc.value / 1.15); commit(); };
  const remove = () => { onSelect(null); onDelete(sp.id); };

  // Rotate = DRAG the top-right handle: the sticker turns to follow the
  // direction of your finger around its centre (true angular rotation).
  const pivot = React.useRef({ cx: 0, cy: 0, ready: false });
  const rotStart = React.useRef<{ ang0: number | null; rot0: number }>({ ang0: null, rot0: 0 });
  const measurePivot = () => {
    measureOrigin((ox, oy) => {
      // Scale pivots around the sticker's centre, so the centre in local space
      // is always (x + B/2, y + B/2) regardless of scale.
      pivot.current = { cx: ox + tx.value + STICKER_BASE / 2, cy: oy + ty.value + STICKER_BASE / 2, ready: true };
    });
  };
  const startRotate = () => { rotStart.current = { ang0: null, rot0: rot.value }; };
  const updateRotate = (fx: number, fy: number) => {
    const p = pivot.current;
    if (!p.ready) return;
    const ang = (Math.atan2(fy - p.cy, fx - p.cx) * 180) / Math.PI;
    // Lock the reference angle on the first sample so the sticker doesn't jump.
    if (rotStart.current.ang0 == null) { rotStart.current.ang0 = ang; return; }
    rot.value = rotStart.current.rot0 + (ang - rotStart.current.ang0);
  };
  const rotHandle = Gesture.Pan()
    .onBegin(() => { runOnJS(measurePivot)(); })
    .onStart(() => { begin(); runOnJS(startRotate)(); })
    .onUpdate(e => { runOnJS(updateRotate)(e.absoluteX, e.absoluteY); })
    .onEnd(() => { runOnJS(onCommit)(sp.id, tx.value, ty.value, sc.value, rot.value); })
    .onFinalize(finalize);

  return (
    <>
      <GestureDetector gesture={g}>
        <Reanimated.View style={[st.wrap, aStyle]} hitSlop={22}>
          <StickerGlyph sp={sp} />
        </Reanimated.View>
      </GestureDetector>

      {selected && (
        <Reanimated.View pointerEvents="box-none" style={[st.frame, frameStyle]}>
          <View pointerEvents="none" style={st.frameBorder} />
          <TouchableOpacity style={[st.handle, st.handleTL]} onPress={remove} hitSlop={hit}>
            <Text style={st.handleIcon}>✕</Text>
          </TouchableOpacity>
          <GestureDetector gesture={rotHandle}>
            <View style={[st.handle, st.handleTR]} hitSlop={hit}>
              <Text style={st.handleIcon}>⟳</Text>
            </View>
          </GestureDetector>
          <TouchableOpacity style={[st.handle, st.handleBL]} onPress={zoomOut} hitSlop={hit}>
            <Text style={st.handleIcon}>–</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.handle, st.handleBR]} onPress={zoomIn} hitSlop={hit}>
            <Text style={st.handleIcon}>+</Text>
          </TouchableOpacity>
        </Reanimated.View>
      )}
    </>
  );
}

const hit = { top: 8, bottom: 8, left: 8, right: 8 };

interface LayerProps {
  stickers: StickerPlacement[];
  onCommit: (id: string, x: number, y: number, scale: number, rotation: number) => void;
  onDelete: (id: string) => void;
}

// Renders every placed sticker plus the trash-drop zone that appears while a
// sticker is being held. `active`/`armed` state is kept local so the parent
// only needs to know whether to disable ScrollView while a drag is live.
export function StickerLayer({ stickers, onCommit, onDelete, onActiveChange }: LayerProps & { onActiveChange?: (v: boolean) => void }) {
  const [armed, setArmed] = React.useState(false);
  const [overTrash, setOverTrash] = React.useState(false);
  // Track which stickers currently have a live gesture, keyed by id, instead
  // of one shared boolean that any item can overwrite. That way scrolling
  // only re-enables once EVERY sticker has reported back inactive — one
  // item's gesture ending can't wrongly turn scrolling back on while another
  // is still mid-drag, and (paired with the unmount safety net above) a
  // deleted sticker can't leave the count stuck on either.
  const activeIds = React.useRef(new Set<string>());
  const reportActive = React.useCallback((id: string, v: boolean) => {
    if (v) activeIds.current.add(id); else activeIds.current.delete(id);
    onActiveChange?.(activeIds.current.size > 0);
  }, [onActiveChange]);

  // A zero-size, untransformed anchor at the layer's origin. Measuring it gives
  // the canvas's screen offset, which lets a sticker convert its local x/y into
  // an on-screen centre for true angular rotation.
  const anchorRef = React.useRef<View>(null);
  const measureOrigin = React.useCallback((cb: (x: number, y: number) => void) => {
    anchorRef.current?.measureInWindow((x, y) => cb(x, y));
  }, []);

  // Which sticker is currently selected (shows its edit frame). Tapping a
  // sticker selects it; tapping it again (or the ✕) clears the selection.
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const toggleSelect = React.useCallback(
    (id: string | null) => setSelectedId(prev => (id === null || prev === id ? null : id)),
    [],
  );
  // Drop a stale selection if that sticker is removed.
  React.useEffect(() => {
    if (selectedId && !stickers.some(s => s.id === selectedId)) setSelectedId(null);
  }, [stickers, selectedId]);

  return (
    <>
      <View ref={anchorRef} pointerEvents="none" style={st.anchor} />
      {stickers.map(sp => (
        <StickerItem
          key={sp.id} sp={sp}
          onCommit={onCommit} onDelete={onDelete}
          setActive={v => reportActive(sp.id, v)} setArmed={setArmed} setOverTrash={setOverTrash}
          selected={selectedId === sp.id} onSelect={toggleSelect}
          measureOrigin={measureOrigin}
        />
      ))}
      {armed && (
        <View pointerEvents="none" style={st.trashZone}>
          <View style={[st.trashCircle, overTrash && st.trashCircleActive]}>
            <Text style={st.trashIcon}>🗑️</Text>
          </View>
          <Text style={st.trashLabel}>{overTrash ? 'Release to delete' : 'Drag sticker here · tap sticker to cancel'}</Text>
        </View>
      )}
    </>
  );
}

// Renders stickers at their saved x/y/scale/rotation with NO gestures — used
// by the read-only view so Entry/Preview/View stay pixel-identical without
// attaching gesture-handler to a screen that can't be edited anyway.
export function StaticStickerLayer({ stickers }: { stickers: StickerPlacement[] }) {
  return (
    <>
      {stickers.map(sp => (
        <View
          key={sp.id}
          style={{
            position: 'absolute', left: sp.x, top: sp.y, zIndex: sp.zIndex ?? 100,
            transform: [{ scale: sp.scale ?? 1 }, { rotate: `${sp.rotation ?? 0}deg` }],
          }}
        >
          <StickerGlyph sp={sp} />
        </View>
      ))}
    </>
  );
}

const HANDLE = 30;
const st = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 100 },
  anchor: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },

  // Selection frame + corner edit buttons
  frame: { position: 'absolute', zIndex: 150 },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: '#2979FF',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  handle: {
    position: 'absolute',
    width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
    borderWidth: 1, borderColor: '#E3E3E3',
  },
  handleTL: { top: -HANDLE / 2, left: -HANDLE / 2 },
  handleTR: { top: -HANDLE / 2, right: -HANDLE / 2 },
  handleBL: { bottom: -HANDLE / 2, left: -HANDLE / 2 },
  handleBR: { bottom: -HANDLE / 2, right: -HANDLE / 2 },
  handleIcon: { fontSize: 16, color: '#222', fontWeight: '700', lineHeight: 18 },
  trashZone: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 200 },
  trashCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  trashCircleActive: { backgroundColor: '#EF5350', transform: [{ scale: 1.18 }] },
  trashIcon: { fontSize: 26 },
  trashLabel: { marginTop: 6, fontSize: 12, color: '#DDD' },
});
