/**
 * ScribbleScreen — Full-screen digital notepad
 * - Free drawing with finger/stylus
 * - Pen color and size picker
 * - Eraser mode
 * - Persists paths to Redux (linked to journal entry)
 * - Multiple pages per entry
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Alert, PanResponder, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { RootState } from '../../../store';
import { saveScribblePage } from '../store/journalSlice';
import type { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { ScribblePath, ScribblePage } from '../types';
import { saveJournalEntry } from '../services/journalDbService';

type Props = NativeStackScreenProps<JournalStackParamList, 'Scribble'>;

const { width: SW, height: SH } = Dimensions.get('window');
const CANVAS_H = SH * 0.72;
const FONT = 'DMSans-Regular';
const FONT_BOLD = 'DMSans-Bold';

const PEN_COLORS = [
  '#111111','#2979FF','#E91E63','#00897B',
  '#E65100','#7B1FA2','#EF5350','#FF8F00',
  '#FFFFFF',
];
const PEN_SIZES = [2, 4, 7, 12];

export function ScribbleScreen({ navigation, route }: Props) {
  const dispatch   = useDispatch();
  const { entryId, pageId } = route.params;
  const userId = useSelector((s: RootState) => s.auth.user?.id);

  // Load existing page from Redux
  const entry = useSelector((s: RootState) =>
    s.journal.entries.find(e => e.id === entryId) ??
    s.journal.drafts.find(d => d.id === entryId)
  );

  const existingPage = entry?.scribblePages?.find(p => p.id === pageId);

  const [paths, setPaths]         = useState<ScribblePath[]>(existingPage?.paths ?? []);
  const [currentPath, setCurrent] = useState('');
  const [penColor, setPenColor]   = useState('#111111');
  const [penSize, setPenSize]     = useState(4);
  const [isEraser, setIsEraser]   = useState(false);
  const [saved, setSaved]         = useState(false);
  const canvasLayout = useRef({ x:0, y:0, width: SW, height: CANVAS_H });

  const effectiveColor = isEraser ? '#FFFFFF' : penColor;
  const effectiveSize  = isEraser ? 24 : penSize;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setCurrent(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
      setSaved(false);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setCurrent(prev => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderRelease: () => {
      setCurrent(prev => {
        if (prev) {
          setPaths(p => [...p, { d: prev, color: effectiveColor, width: effectiveSize }]);
        }
        return '';
      });
    },
  })).current;

  // Auto-save on any path change (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { doSave(paths); }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [paths]);

  const doSave = useCallback(async (currentPaths: ScribblePath[]) => {
    const page: ScribblePage = {
      id: pageId,
      paths: currentPaths,
      createdAt: existingPage?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Update locally first
    dispatch(saveScribblePage({ entryId, page }));
    setSaved(true);

    // Save to Firestore
    if (userId && entry) {
      const updatedPages = [...(entry.scribblePages ?? [])];
      const pageIdx = updatedPages.findIndex(p => p.id === pageId);
      if (pageIdx !== -1) {
        updatedPages[pageIdx] = page;
      } else {
        updatedPages.push(page);
      }

      try {
        await saveJournalEntry(userId, {
          ...entry,
          scribblePages: updatedPages,
        });
      } catch (e) {
        console.error('Failed to sync scribble to database:', e);
      }
    }
  }, [dispatch, entryId, pageId, existingPage, userId, entry]);

  const handleUndo = () => setPaths(p => p.slice(0, -1));
  const handleClear = () => Alert.alert('Clear', 'Erase all drawings?', [
    { text:'Cancel', style:'cancel' },
    { text:'Clear', style:'destructive', onPress:()=>setPaths([]) },
  ]);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={()=>{ doSave(paths); navigation.goBack(); }} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, {fontFamily:FONT_BOLD}]}>Scribble Pad</Text>
        <View style={s.headerRight}>
          {saved && <Text style={[s.savedTxt,{fontFamily:FONT}]}>✓ Saved</Text>}
          <TouchableOpacity onPress={handleUndo} style={s.undoBtn}>
            <Text style={[s.undoTxt,{fontFamily:FONT}]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
            <Text style={[s.clearTxt,{fontFamily:FONT}]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <View
        style={s.canvas}
        onLayout={e => { canvasLayout.current = e.nativeEvent.layout; }}
        {...panResponder.panHandlers}
      >
        <Svg
          width={SW}
          height={CANVAS_H}
          style={StyleSheet.absoluteFill}
        >
          {paths.map((p, i) => (
            <SvgPath
              key={i}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentPath ? (
            <SvgPath
              d={currentPath}
              stroke={effectiveColor}
              strokeWidth={effectiveSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
        </Svg>
        {paths.length === 0 && !currentPath && (
          <Text style={[s.hint, {fontFamily:FONT}]}>✏️  Draw with your finger</Text>
        )}
      </View>


      {/* Toolbar */}
      <View style={s.toolbar}>
        {/* Colors */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.colorScroll} contentContainerStyle={s.colorRow}>
          {PEN_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => { setPenColor(c); setIsEraser(false); }}
              style={[
                s.colorDot,
                { backgroundColor: c },
                c==='#FFFFFF' && s.whiteDot,
                penColor===c && !isEraser && s.colorActive,
              ]}
            />
          ))}
          {/* Eraser */}
          <TouchableOpacity
            onPress={() => setIsEraser(v=>!v)}
            style={[s.eraserBtn, isEraser && s.eraserActive]}
          >
            <Text style={{fontSize:16}}>⬜</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Pen sizes */}
        <View style={s.sizeRow}>
          {PEN_SIZES.map(sz => (
            <TouchableOpacity
              key={sz}
              onPress={() => { setPenSize(sz); setIsEraser(false); }}
              style={[s.sizeBtn, penSize===sz && !isEraser && {backgroundColor:'#E3EEFF'}]}
            >
              <View style={{
                width: sz * 2,
                height: sz * 2,
                borderRadius: sz,
                backgroundColor: isEraser ? '#CCC' : penColor,
              }}/>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:'#FFFFFF' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:0.5, borderBottomColor:'#E8E8E8', gap:10 },
  backBtn:{ padding:6 }, backArrow:{ fontSize:22, color:'#111' },
  title:  { fontSize:17, color:'#111', flex:1 },
  headerRight:{ flexDirection:'row', alignItems:'center', gap:8 },
  savedTxt:{ fontSize:12, color:'#00897B' },
  undoBtn:{ paddingHorizontal:12, paddingVertical:6, backgroundColor:'#F5F5F5', borderRadius:10 },
  undoTxt:{ fontSize:13, color:'#555' },
  clearBtn:{ paddingHorizontal:12, paddingVertical:6, backgroundColor:'#FEE2E2', borderRadius:10 },
  clearTxt:{ fontSize:13, color:'#EF5350' },
  canvas: {
    flex:1,
    backgroundColor:'#FAFAFA',
    borderBottomWidth:0.5,
    borderBottomColor:'#E8E8E8',
    alignItems:'center',
    justifyContent:'center',
  },
  hint:   { fontSize:16, color:'#CCCCCC' },
  toolbar:{ backgroundColor:'#FFFFFF', paddingVertical:10, paddingHorizontal:12, borderTopWidth:0.5, borderTopColor:'#E8E8E8' },
  colorScroll:{ marginBottom:10 },
  colorRow:   { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:4 },
  colorDot:   { width:28, height:28, borderRadius:14, borderWidth:1, borderColor:'#E0E0E0' },
  whiteDot:   { borderColor:'#CCCCCC', borderWidth:1.5 },
  colorActive:{ borderWidth:3, borderColor:'#111', transform:[{scale:1.15}] },
  eraserBtn:  { width:36, height:28, borderRadius:8, borderWidth:1.5, borderColor:'#DDD', alignItems:'center', justifyContent:'center', backgroundColor:'#F5F5F5' },
  eraserActive:{ borderColor:'#2979FF', backgroundColor:'#E3EEFF' },
  sizeRow:    { flexDirection:'row', gap:12, alignItems:'center', paddingHorizontal:4 },
  sizeBtn:    { width:44, height:36, borderRadius:10, backgroundColor:'#F5F5F5', alignItems:'center', justifyContent:'center' },
});
