import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import * as ImagePicker  from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useBoardEditor }    from '../hooks/useBoards';
import { BoardCanvas }       from '../components/BoardCanvas';
import { ElementToolbar }    from '../components/ElementToolbar';
import { StickerPicker }     from '../components/StickerPicker';
import { LayerPanel }        from '../components/LayerPanel';
import { AppText }           from '../../../shared/components/AppText';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }            from '../../../shared/theme/colors';
import { Spacing, Radius }   from '../../../shared/theme/spacing';

type Props = NativeStackScreenProps<any, 'BoardEditor'>;

type Sheet = 'stickers' | 'layers' | null;

export function BoardEditorScreen({ route, navigation }: Props) {
  const { boardId } = route.params as { boardId: string };

  const {
    board, sortedElements, selected, selectedElement, saving,
    setSelected, addImageElement, addTextElement, addStickerElement,
    moveElement, resizeElement, rotateElement, updateElementProp,
    deleteElement, bringForward, sendBackward, duplicateElement, saveNow,
  } = useBoardEditor(boardId);

  const [sheet, setSheet] = useState<Sheet>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Photo access needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.85,
    });
    if (!result.canceled) {
      await addImageElement(result.assets[0].uri);
    }
  };

  const handleSaveAndExit = async () => {
    await saveNow();
    navigation.goBack();
  };

  if (!board) return <AppLoadingSpinner fullscreen message="Loading board…" />;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => Alert.alert('Exit', 'Save changes and exit?', [
          { text: 'Save & exit', onPress: handleSaveAndExit },
          { text: 'Exit without saving', style: 'destructive', onPress: () => navigation.goBack() },
          { text: 'Cancel', style: 'cancel' },
        ])}>
          <AppText variant="body" color={Colors.primary}>‹ Exit</AppText>
        </TouchableOpacity>

        <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1} style={s.boardTitle}>
          {board.title}
        </AppText>

        <View style={s.topRight}>
          {saving && <AppText variant="caption" color={Colors.textMuted}>Saving…</AppText>}
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveAndExit}>
            <AppText variant="label" color={Colors.white}>Done</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.canvasWrap}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <BoardCanvas
          elements={sortedElements}
          bgColor={board.bgColor}
          selected={selected}
          onSelect={setSelected}
          onMove={moveElement}
          onResize={resizeElement}
          onRotate={rotateElement}
        />
      </ScrollView>

      {/* Element toolbar (shows when element is selected) */}
      {selectedElement && (
        <ElementToolbar
          element={selectedElement}
          onUpdate={(patch) => updateElementProp(selectedElement.id, patch)}
          onDelete={() => deleteElement(selectedElement.id)}
          onDuplicate={() => duplicateElement(selectedElement.id)}
          onBringForward={() => bringForward(selectedElement.id)}
          onSendBackward={() => sendBackward(selectedElement.id)}
        />
      )}

      {/* Bottom toolbar */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.toolBtn} onPress={pickImage}>
          <AppText style={s.toolEmoji}>🖼️</AppText>
          <AppText variant="caption" color={Colors.textMuted}>Image</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => addTextElement()}>
          <AppText style={s.toolEmoji}>T</AppText>
          <AppText variant="caption" color={Colors.textMuted}>Text</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => setSheet('stickers')}>
          <AppText style={s.toolEmoji}>🎭</AppText>
          <AppText variant="caption" color={Colors.textMuted}>Sticker</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => setSheet('layers')}>
          <AppText style={s.toolEmoji}>⬛</AppText>
          <AppText variant="caption" color={Colors.textMuted}>Layers</AppText>
        </TouchableOpacity>
        {selected && (
          <TouchableOpacity style={s.toolBtn} onPress={() => setSelected(null)}>
            <AppText style={s.toolEmoji}>✕</AppText>
            <AppText variant="caption" color={Colors.textMuted}>Deselect</AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Sticker picker sheet */}
      <Modal visible={sheet === 'stickers'} transparent animationType="slide">
        <TouchableOpacity
          style={s.sheetBackdrop}
          onPress={() => setSheet(null)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1} style={s.sheetContent}>
            <StickerPicker
              onSelect={addStickerElement}
              onClose={() => setSheet(null)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Layer panel sheet */}
      <Modal visible={sheet === 'layers'} transparent animationType="slide">
        <TouchableOpacity
          style={s.sheetBackdrop}
          onPress={() => setSheet(null)}
          activeOpacity={1}
        >
          <TouchableOpacity activeOpacity={1} style={s.sheetContent}>
            <LayerPanel
              elements={sortedElements}
              selected={selected}
              onSelect={(id) => { setSelected(id); setSheet(null); }}
              onDelete={deleteElement}
              onClose={() => setSheet(null)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bgApp },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  boardTitle: { flex: 1 },
  topRight:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  saveBtn: {
    backgroundColor: Colors.boards,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  canvasWrap: { alignItems: 'center', padding: 0 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
    paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.sm,
  },
  toolBtn:   { alignItems: 'center', gap: 3 },
  toolEmoji: { fontSize: 24 },
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheetContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
});
