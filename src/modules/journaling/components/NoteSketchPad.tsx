// NoteSketchPad — the Notes editor's "Sketch" button, built to match the
// Journal Scribble pad (ScribbleScreen.tsx) exactly: same header (back arrow
// saves + closes, Undo/Clear top-right), same canvas background/hint, same
// color palette (9 colors incl. white) and pen-size row. The only difference
// is where the result goes: instead of saving to a journal entry's
// scribblePages in Redux/Firestore, it renders the strokes to an SVG string
// and hands the caller a `data:image/svg+xml` URI, which the Notes rich-text
// editor inserts exactly like a photo (richRef.current?.insertImage(uri)).
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, PanResponder, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const CANVAS_H = SH * 0.55;
const FONT = 'DMSans-Regular';
const FONT_BOLD = 'DMSans-Bold';

interface StrokePath { d: string; color: string; width: number; }

const PEN_COLORS = [
  '#111111', '#2979FF', '#E91E63', '#00897B',
  '#E65100', '#7B1FA2', '#EF5350', '#FF8F00',
  '#FFFFFF',
];
const PEN_SIZES = [2, 4, 7, 12];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (dataUri: string) => void;
}

export function NoteSketchPad({ visible, onClose, onSave }: Props) {
  const [paths, setPaths] = useState<StrokePath[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [penColor, setPenColor] = useState('#111111');
  const [penSize, setPenSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  const effectiveColor = isEraser ? '#FFFFFF' : penColor;
  const effectiveSize = isEraser ? 24 : penSize;
  // Read the latest color/size at stroke-release time via refs rather than
  // whatever PanResponder.create closed over on mount — otherwise every
  // stroke would save with the color/size picked when the pad first opened,
  // regardless of later changes (the same stale-closure bug fixed in the
  // Journal scribble pad).
  const effectiveColorRef = useRef(effectiveColor);
  const effectiveSizeRef = useRef(effectiveSize);
  effectiveColorRef.current = effectiveColor;
  effectiveSizeRef.current = effectiveSize;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderMove: e => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentPath(prev => {
          if (prev) setPaths(p => [...p, { d: prev, color: effectiveColorRef.current, width: effectiveSizeRef.current }]);
          return '';
        });
      },
    }),
  ).current;

  const handleUndo = () => setPaths(p => p.slice(0, -1));
  const handleClear = () => setPaths([]);

  const reset = () => { setPaths([]); setCurrentPath(''); };

  // Same as the Scribble pad's back arrow: saves (if there's anything to
  // save) and closes in one tap — no separate "save" step.
  const handleBack = () => {
    if (paths.length > 0) {
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${CANVAS_H}" viewBox="0 0 ${SW} ${CANVAS_H}">` +
        `<rect width="100%" height="100%" fill="#FFFFFF"/>` +
        paths
          .map(p => `<path d="${p.d}" stroke="${p.color}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`)
          .join('') +
        `</svg>`;
      onSave(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    }
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBack}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[s.title, { fontFamily: FONT_BOLD }]}>Sketch</Text>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={handleUndo} style={s.undoBtn}>
              <Text style={[s.undoTxt, { fontFamily: FONT }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
              <Text style={[s.clearTxt, { fontFamily: FONT }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Canvas */}
        <View style={s.canvas} {...panResponder.panHandlers}>
          <Svg width={SW} height={CANVAS_H} style={StyleSheet.absoluteFill}>
            {paths.map((p, i) => (
              <SvgPath key={i} d={p.d} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ))}
            {currentPath ? (
              <SvgPath d={currentPath} stroke={effectiveColor} strokeWidth={effectiveSize} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ) : null}
          </Svg>
          {paths.length === 0 && !currentPath && (
            <Text style={[s.hint, { fontFamily: FONT }]}>✏️  Draw with your finger</Text>
          )}
        </View>

        {/* Toolbar */}
        <View style={s.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.colorScroll} contentContainerStyle={s.colorRow}>
            {PEN_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => { setPenColor(c); setIsEraser(false); }}
                style={[
                  s.colorDot,
                  { backgroundColor: c },
                  c === '#FFFFFF' && s.whiteDot,
                  penColor === c && !isEraser && s.colorActive,
                ]}
              />
            ))}
            <TouchableOpacity onPress={() => setIsEraser(v => !v)} style={[s.eraserBtn, isEraser && s.eraserActive]}>
              <Text style={{ fontSize: 16 }}>⬜</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={s.sizeRow}>
            {PEN_SIZES.map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => { setPenSize(sz); setIsEraser(false); }}
                style={[s.sizeBtn, penSize === sz && !isEraser && { backgroundColor: '#E3EEFF' }]}
              >
                <View style={{ width: sz * 2, height: sz * 2, borderRadius: sz, backgroundColor: isEraser ? '#CCC' : penColor }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8E8E8', gap: 10 },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 22, color: '#111' },
  title: { fontSize: 17, color: '#111', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undoBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F5F5F5', borderRadius: 10 },
  undoTxt: { fontSize: 13, color: '#555' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 10 },
  clearTxt: { fontSize: 13, color: '#EF5350' },
  canvas: {
    flex: 1,
    // Clearly darker than pure white so a white pen stroke is actually
    // visible while drawing (same fix as the Journal scribble pad).
    backgroundColor: '#E7E7EA',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 16, color: '#CCCCCC' },
  toolbar: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 0.5, borderTopColor: '#E8E8E8' },
  colorScroll: { marginBottom: 10 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  whiteDot: { borderColor: '#CCCCCC', borderWidth: 1.5 },
  colorActive: { borderWidth: 3, borderColor: '#111', transform: [{ scale: 1.15 }] },
  eraserBtn: { width: 36, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  eraserActive: { borderColor: '#2979FF', backgroundColor: '#E3EEFF' },
  sizeRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 4 },
  sizeBtn: { width: 44, height: 36, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
});
