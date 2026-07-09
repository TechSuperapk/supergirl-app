// ─────────────────────────────────────────────────────────────────────────────
// NoteEditorScreen — full-screen rich note editor (Quotes / Ideas / Affirmation
// and general notes). Rich text via react-native-pell-rich-editor (WebView).
//   • Title + Label picker (Quotes / Affirmation / Ideas)
//   • Pin + Save (check) in the header
//   • Bottom toolbar: + attachments · Aa format (H1/B/I/U) · undo · redo · ⋮
//     options · mic (voice) — the mic sits fixed at the end of the toolbar,
//     exactly like Journal's WriteEntryScreen, not inside the + menu.
//   • + menu: Camera, Gallery (photos) · Sketch · Check Box (checklist)
//   • Sketch opens the real Journal Scribble screen (ScribbleScreen.tsx) in
//     "note mode" (params: { onDone }) — the exact same screen, canvas, and
//     toolbar Journal uses. It hands back raw stroke data (ScribblePath[]),
//     stored as a separate attachment (like voice clips) and rendered as a
//     thumbnail; tapping it opens a full-screen read-only preview.
//   • Voice recording uses the exact same RecordingWidget/VoiceWidget and
//     tap-to-toggle mic button as Journal (see components/VoiceWidgets.tsx)
//     — tap to start, tap again to stop; the widget floats above the
//     toolbar while recording, same placement as Journal.
//   • ⋮ menu: Delete · Make Copy · Share · Labels · Collab (soon)
//   • Camera, Gallery, and Share hand off to native OS UI right after the
//     +/⋮ menu (a plain overlay, not a native <Modal>) closes — that plain-
//     View choice is what stops the hand-off from racing an OS view-
//     controller transition, which used to make those buttons silently do
//     nothing.
//   • This screen has its own GestureHandlerRootView (see the return
//     statement) because it's the only screen with a WebView (RichEditor).
//     A WebView can capture the app-wide gesture-handler responder and
//     never give it back, leaving other buttons on the screen permanently
//     dead after the editor's been touched once — that's what was causing
//     the "+ doesn't respond" bug.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Alert, Share, Image, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { QuickNoteRecord, NoteAudio, ChecklistItem, NoteSketch, loadNotes, upsertNote, removeNote, stripHtml } from '../quickNotesStore';
import { SCRIBBLE_VIEW_BOX } from '../scribbleConstants';
import type { ScribblePath } from '../types';
import { AttachmentGrid } from '../components/guided/AttachmentGrid';
import { mergeAttachments } from '../attachmentOrder';
import { VoiceWidget, RecordingWidget } from '../components/VoiceWidgets';
import MicLogo from '../components/MicLogo';
import PinLogo from '../components/PinLogo';
import CheckLogo from '../components/CheckLogo';
import DeleteLogo from '../components/DeleteLogo';
import CopyLogo from '../components/CopyLogo';
import ShareLogo from '../components/ShareLogo';
import LabelLogo from '../components/LabelLogo';
import CameraLogo from '../components/CameraLogo';
import GalleryLogo from '../components/GalleryLogo';
import DrawLogo from '../components/DrawLogo';
import ChecklistLogo from '../components/ChecklistLogo';
import { Image as ExpoImage } from 'expo-image';
import { JOURNAL_TYPE_ICONS } from '../components/home';

type Props = NativeStackScreenProps<JournalStackParamList, 'NoteEditor'>;
const gid = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const LABELS = [
  { key: 'quotes', label: 'Quotes',      emoji: '💬' },
  { key: 'affirm', label: 'Affirmation', emoji: '⭐' },
  { key: 'ideas',  label: 'Ideas',       emoji: '💡' },
];
const labelOf = (k?: string) => LABELS.find(l => l.key === k);

const ADD_ITEMS = [
  { key: 'camera',   label: 'Camera',    Icon: CameraLogo },
  { key: 'gallery',  label: 'Gallery',   Icon: GalleryLogo },
  { key: 'sketch',   label: 'Sketch',    Icon: DrawLogo },
  { key: 'checkbox', label: 'Check Box', Icon: ChecklistLogo },
];
const OPTION_ITEMS = [
  { key: 'delete', label: 'Delete',    Icon: DeleteLogo },
  { key: 'copy',   label: 'Make Copy', Icon: CopyLogo },
  { key: 'share',  label: 'Share',     Icon: ShareLogo },
  { key: 'collab', label: 'Collab',    emoji: '👥' },
  { key: 'labels', label: 'Labels',    Icon: LabelLogo },
];

export function NoteEditorScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const richRef = useRef<RichEditor>(null);
  const recRef = useRef<Audio.Recording | null>(null);

  const noteId = route.params?.noteId;
  const [ready, setReady] = useState(!noteId);
  const [initialHtml, setInitialHtml] = useState('');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  // New notes default to the Quotes label; tap the Label pill to change it.
  const [tag, setTag] = useState<string | undefined>(route.params?.tag ?? 'quotes');
  const [pinned, setPinned] = useState(false);
  const [audio, setAudio] = useState<NoteAudio[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [sketches, setSketches] = useState<NoteSketch[]>([]);
  const [sketchPreview, setSketchPreview] = useState<NoteSketch | null>(null);
  // Photos — a tracked media[] array (same role as Journal's mediaUrls),
  // not baked into the rich-text body, so they can be re-uploaded/durable
  // and tapped to view full-screen, same as sketches.
  const [media, setMedia] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [labelOpen, setLabelOpen] = useState(false);
  const [menu, setMenu] = useState<'none' | 'add' | 'options'>('none');
  const [formatOpen, setFormatOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recBusy, setRecBusy] = useState(false);

  const insets = useSafeAreaInsets();

  // Manual keyboard-height tracking, replacing KeyboardAvoidingView. This
  // screen sits inside a react-native-screens native-stack screen and also
  // has a WebView (RichEditor) — that combination is a known case where
  // Android's adjustResize (and KeyboardAvoidingView, which relies on the
  // same native resize/keyboard notifications) doesn't reliably shift the
  // layout, so the toolbar stayed put where it was while the OS keyboard
  // was drawn on top of it — any tap on "+" landed on the keyboard's own
  // surface instead of the button underneath, which is why it looked
  // completely dead and never recovered while the keyboard stayed open.
  // Tracking the real keyboard height ourselves and padding the content
  // by that exact amount sidesteps the native resize path entirely.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, e => setKbHeight(e.endCoordinates?.height ?? 0));
    const onHide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  useEffect(() => {
    if (!noteId) return;
    (async () => {
      const n = (await loadNotes()).find(x => x.id === noteId);
      if (n) {
        setTitle(n.title); setInitialHtml(n.body || ''); setBodyHtml(n.body || '');
        setTag(n.tag); setPinned(!!n.pinned); setAudio(n.audio ?? []);
        setChecklist(n.checklist ?? []);
        // Guard against a note saved by an earlier build of this feature
        // (sketches were briefly a string[] of image URIs before becoming
        // structured stroke data) — a legacy entry without a real `paths`
        // array would otherwise crash AttachmentGrid's rendering the moment
        // this note is opened. Drop anything malformed instead of crashing.
        setSketches((n.sketches ?? []).filter((sk): sk is NoteSketch => Array.isArray(sk?.paths)));
        setMedia((n.media ?? []).filter((u): u is string => typeof u === 'string' && !!u));
      }
      setReady(true);
    })();
  }, [noteId]);

  // ── formatting ──
  const fmt = (a: string) => richRef.current?.sendAction(a, 'result');

  // The +/⋮ menu renders as a plain overlay View (see below), not a native
  // <Modal> — so there's no OS-level view-controller transition for a
  // camera/gallery/recorder/share sheet to race against. Closing the menu
  // and handing off in the same tick is safe.
  const afterMenuClose = (fn: () => void) => {
    setMenu('none');
    fn();
  };

  // ── attachments ──
  // Photos are tracked in `media` (same role/shape as Journal's mediaUrls)
  // instead of being inserted into the rich-text WebView body — that keeps
  // them durable (notesSync can find and upload the local URI) and lets
  // them be tapped to view full-screen, same as sketches.
  const pickImage = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to add a photo.'); return; }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      const uri = !res.canceled ? res.assets?.[0]?.uri : undefined;
      if (uri) setMedia(m => [...m, uri]);
    } catch (e: any) { Alert.alert('Could not add photo', e?.message ?? 'Please try again.'); }
  };
  const removeMedia = (uri: string) => setMedia(m => m.filter(u => u !== uri));

  // Same tap-to-toggle mic as Journal's WriteEntryScreen (startRec/stopRec):
  // tap the mic button to start, tap again to stop and save — the mic
  // button itself lives in the main toolbar, not this popup, same as
  // Journal. `recBusy` just guards against a double-tap firing two
  // overlapping start calls into expo-av.
  const startRec = async () => {
    if (recording || recBusy) return;
    setRecBusy(true);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Microphone needed', 'Allow mic access to record.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: r } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recRef.current = r; setRecording(true);
    } catch (e: any) { Alert.alert('Recording failed', e?.message ?? 'Please try again.'); }
    finally { setRecBusy(false); }
  };

  const stopRec = async () => {
    const r = recRef.current;
    recRef.current = null;
    setRecording(false);
    if (!r) return;
    try {
      await r.stopAndUnloadAsync();
      const uri = r.getURI();
      if (uri) setAudio(a => [...a, { id: gid(), uri }]);
    } catch (e: any) { Alert.alert('Could not save recording', e?.message ?? 'Please try again.'); }
  };

  // Playback is handled inside VoiceWidget itself now (same as Journal).
  const removeClip = (id: string) => setAudio(a => a.filter(c => c.id !== id));

  // ── checklist ──
  const addChecklistItem = () => setChecklist(c => [...c, { id: gid(), text: '', done: false }]);
  const toggleChecklistItem = (id: string) => setChecklist(c => c.map(it => (it.id === id ? { ...it, done: !it.done } : it)));
  const editChecklistItem = (id: string, text: string) => setChecklist(c => c.map(it => (it.id === id ? { ...it, text } : it)));
  const removeChecklistItem = (id: string) => setChecklist(c => c.filter(it => it.id !== id));

  // ── sketch ── kept as a separate attachment (like voice clips), not
  // baked into the rich-text body, so it can be tapped to view full-screen.
  const addSketch = (paths: ScribblePath[]) => setSketches(sk => [...sk, { id: gid(), paths }]);
  const removeSketch = (id: string) => setSketches(sk => sk.filter(sk2 => sk2.id !== id));

  // ── record / options ──
  const buildRecord = (): QuickNoteRecord => ({
    id: noteId ?? gid(), title: title.trim() || 'Untitled', body: bodyHtml, tag, pinned, audio,
    checklist: checklist.length ? checklist : undefined,
    sketches: sketches.length ? sketches : undefined,
    media: media.length ? media : undefined,
    updatedAt: new Date().toISOString(),
  });

  const onSave = async () => { await upsertNote(buildRecord()); navigation.goBack(); };

  // Rec is handled separately by the mic button (startRec/stopRec) in the
  // main toolbar, not through this + menu dispatcher.
  const onAddItem = (key: string) => {
    if (key === 'camera')   { afterMenuClose(() => pickImage(true)); return; }
    if (key === 'gallery')  { afterMenuClose(() => pickImage(false)); return; }
    if (key === 'sketch')   { afterMenuClose(() => navigation.navigate('Scribble', { onDone: addSketch })); return; }
    if (key === 'checkbox') { setMenu('none'); addChecklistItem(); return; }
    setMenu('none');
  };

  const shareNote = async () => {
    const text = `${title.trim()}\n\n${stripHtml(bodyHtml)}`.trim();
    try { await Share.share({ message: text }); }
    catch (e: any) { Alert.alert('Could not share', e?.message ?? 'Please try again.'); }
  };

  const onOptionItem = async (key: string) => {
    if (key === 'delete') {
      setMenu('none');
      if (!noteId) { navigation.goBack(); return; }
      Alert.alert('Delete note?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await removeNote(noteId); navigation.goBack(); } },
      ]);
    } else if (key === 'copy') {
      setMenu('none');
      await upsertNote({ ...buildRecord(), id: gid(), title: `${title.trim() || 'Untitled'} (copy)` });
      Alert.alert('Copied', 'A copy was saved to your notes.'); navigation.goBack();
    } else if (key === 'share') {
      afterMenuClose(shareNote);
    } else if (key === 'labels') {
      setMenu('none');
      setLabelOpen(true);
    } else {
      setMenu('none');
      Alert.alert('Collab', 'Coming soon.');
    }
  };

  const lab = labelOf(tag);
  const menuItems = menu === 'add' ? ADD_ITEMS : OPTION_ITEMS;

  // This screen is wrapped in its own GestureHandlerRootView because it's
  // the only screen with a WebView (RichEditor). A WebView can capture the
  // app-wide gesture-handler responder and never release it, which leaves
  // sibling touchables (like the + button) permanently unresponsive after
  // the editor has been touched once — matches the reported symptoms
  // exactly (no visual press feedback, doesn't recover on repeat taps,
  // both platforms, regardless of which field was typed in). Scoping a
  // fresh GestureHandlerRootView to this screen resets that responder.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgCard }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.back, { color: colors.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <View style={s.headerRight}>
          <TouchableOpacity style={[s.pin, { borderColor: pinned ? colors.textPrimary : colors.border }]} activeOpacity={0.7} onPress={() => setPinned(p => !p)}>
            <PinLogo width={18} height={18} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={onSave}>
            <CheckLogo width={18} height={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Padded by the real, measured keyboard height (kbHeight) instead of
          KeyboardAvoidingView — see the kbHeight effect above for why. This
          guarantees the toolbar sits exactly above the keyboard's actual
          top edge, regardless of whether the OS/react-native-screens
          resized the window correctly. */}
      <View style={{ flex: 1, paddingBottom: kbHeight }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          {/* Title + label */}
          <View style={s.titleRow}>
            <TextInput
              style={[s.titleInput, { color: colors.textPrimary, fontFamily: 'DMSans-Bold' }]}
              placeholder="Title" placeholderTextColor={colors.textMuted}
              value={title} onChangeText={setTitle}
            />
            <TouchableOpacity style={[s.labelPill, { borderColor: colors.border }]} activeOpacity={0.75} onPress={() => setLabelOpen(true)}>
              {lab ? (
                <>
                  {JOURNAL_TYPE_ICONS[lab.key] ? (
                    <ExpoImage source={JOURNAL_TYPE_ICONS[lab.key]} style={s.labelGif} contentFit="contain" autoplay />
                  ) : (
                    // Plain Text for the emoji glyph — a custom fontFamily
                    // strips color emoji rendering on Android.
                    <Text style={s.labelEmoji}>{lab.emoji}</Text>
                  )}
                  <AppText variant="caption" color={colors.textSecondary}>{lab.label}</AppText>
                </>
              ) : (
                <AppText variant="caption" color={colors.textSecondary}>Label</AppText>
              )}
            </TouchableOpacity>
          </View>

          {/* Voice notes — the exact same widgets Journal uses: RecordingWidget
              floats while recording, VoiceWidget (Telegram-style waveform +
              scrubber) per saved clip. */}
          {recording && <RecordingWidget accent={colors.primary} onStop={stopRec} />}
          {audio.map(c => (
            <VoiceWidget key={c.id} uri={c.uri} accent={colors.primary} onDelete={() => removeClip(c.id)} />
          ))}

          {/* Checklist */}
          {checklist.length > 0 && (
            <View style={s.checklist}>
              {checklist.map(item => (
                <View key={item.id} style={s.checkRow}>
                  <TouchableOpacity
                    onPress={() => toggleChecklistItem(item.id)}
                    style={[s.checkbox, { borderColor: colors.border }, item.done && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }]}
                  >
                    {item.done && <Text style={{ color: colors.bgCard, fontSize: 12 }}>✓</Text>}
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      s.checkInput,
                      { color: item.done ? colors.textMuted : colors.textPrimary },
                      item.done && { textDecorationLine: 'line-through' },
                    ]}
                    placeholder="List item"
                    placeholderTextColor={colors.textMuted}
                    value={item.text}
                    onChangeText={t => editChecklistItem(item.id, t)}
                  />
                  <TouchableOpacity onPress={() => removeChecklistItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 15 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addChecklistItem} style={s.addCheckRow}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>＋</Text>
                <AppText variant="body" color={colors.textMuted}> Add item</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* Photos + sketches — the exact same AttachmentGrid component
              Journal uses, so placement (tile size, spacing, remove button)
              is identical, not just visually similar. */}
          <AttachmentGrid
            items={mergeAttachments(media, sketches.map(sk => ({ id: sk.id, paths: sk.paths, createdAt: '', updatedAt: '' })))}
            layout="grid"
            onPressImage={uri => setPhotoPreview(uri)}
            onPressScribble={pageId => { const sk = sketches.find(x => x.id === pageId); if (sk) setSketchPreview(sk); }}
            onRemove={item => { if (item.kind === 'image') removeMedia(item.uri); else if (item.kind === 'scribble') removeSketch(item.page.id); }}
          />

          {/* Rich body */}
          {ready && (
            <RichEditor
              ref={richRef}
              initialContentHTML={initialHtml}
              placeholder="Write Anything here......"
              onChange={setBodyHtml}
              editorStyle={{ backgroundColor: colors.bgCard, color: colors.textPrimary, placeholderColor: colors.textMuted, contentCSSText: 'font-size: 16px; line-height: 1.6;' }}
              style={s.rich}
            />
          )}
        </ScrollView>

        {/* Format bar */}
        {formatOpen && (
          <View style={[s.formatBar, { backgroundColor: colors.bgInput, borderTopColor: colors.divider }]}>
            {[
              { k: 'H1', a: actions.heading1 },
              { k: 'B',  a: actions.setBold },
              { k: 'I',  a: actions.setItalic },
              { k: 'U',  a: actions.setUnderline },
            ].map(b => (
              <TouchableOpacity key={b.k} style={s.fmtBtn} onPress={() => fmt(b.a)}><AppText variant="button" color={colors.textPrimary}>{b.k}</AppText></TouchableOpacity>
            ))}
            <TouchableOpacity style={s.fmtBtn} onPress={() => setFormatOpen(false)}><AppText variant="button" color={colors.textMuted}>✕</AppText></TouchableOpacity>
          </View>
        )}

        {/* Toolbar */}
        {/* + and ⋮ use onPressIn, not onPress: tapping either while the
            keyboard is open blurs the focused field, which fires the
            keyboard-hide event, which snaps kbHeight back to 0 and shifts
            this toolbar the instant the finger touches down — with onPress
            (fires on release) that shift cancels the tap before it
            registers. onPressIn fires immediately on touch-down, before the
            shift happens. */}
        <View style={[s.toolbar, { backgroundColor: colors.bgCard, borderTopColor: colors.divider, paddingBottom: Spacing.md + insets.bottom }]}>
          <TouchableOpacity style={[s.tool, { backgroundColor: colors.bgInput }]} onPressIn={() => setMenu(menu === 'add' ? 'none' : 'add')}><Text style={s.toolTxt}>＋</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tool, { backgroundColor: colors.bgInput }]} onPress={() => setFormatOpen(o => !o)}><Text style={s.toolTxt}>Aa</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tool, { backgroundColor: colors.bgInput }]} onPress={() => fmt(actions.undo)}><Text style={s.toolTxt}>↶</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tool, { backgroundColor: colors.bgInput }]} onPress={() => fmt(actions.redo)}><Text style={s.toolTxt}>↷</Text></TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[s.tool, { backgroundColor: colors.bgInput }]} onPressIn={() => setMenu(menu === 'options' ? 'none' : 'options')}><Text style={s.toolTxt}>⋮</Text></TouchableOpacity>
          {/* Mic — same placement/behavior as Journal's WriteEntryScreen:
              fixed at the end of the toolbar, tap to start, tap again to stop. */}
          <TouchableOpacity
            style={[s.micBtn, { borderColor: colors.primary, backgroundColor: recording ? colors.primary : 'transparent' }]}
            onPress={recording ? stopRec : startRec}
          >
            <MicLogo width={22} height={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Label dropdown — a plain overlay, not a native <Modal> (see the
          +/⋮ menu note below for why: a real Modal's dismissal animation
          can still be swallowing touches right after it closes, which is
          the likely cause of "+ sometimes doesn't respond" — it may have
          been fired right after this, the sketch preview, or the photo
          preview was still finishing its native close transition). */}
      {labelOpen && (
        <View style={s.menuOverlay} pointerEvents="box-none">
          {/* paddingBottom: kbHeight keeps this card riding just above the
              toolbar — the toolbar itself is pushed up by kbHeight when the
              keyboard is open, so this overlay (which spans the whole
              screen, ignoring that padding) needs the same offset or the
              card would land behind/near the keyboard instead of above it. */}
          <TouchableOpacity style={[s.popBackdrop, { paddingBottom: kbHeight }]} activeOpacity={1} onPress={() => setLabelOpen(false)}>
            <TouchableOpacity activeOpacity={1} style={[s.labelCard, { backgroundColor: colors.bgInput }]}>
              {LABELS.map(l => (
                <TouchableOpacity key={l.key} style={[s.labelOpt, { backgroundColor: colors.bgCard }]} activeOpacity={0.85}
                  onPress={() => { setTag(tag === l.key ? undefined : l.key); setLabelOpen(false); }}>
                  {JOURNAL_TYPE_ICONS[l.key] ? (
                    <ExpoImage source={JOURNAL_TYPE_ICONS[l.key]} style={s.labelOptGif} contentFit="contain" autoplay />
                  ) : (
                    <Text style={{ fontSize: 22 }}>{l.emoji}</Text>
                  )}
                  <AppText variant="caption" color={colors.textPrimary}>{l.label}</AppText>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* + / ⋮ menu — a plain overlay View, not a native <Modal>. Camera,
          Gallery, and Share hand off to native OS UI right after this
          closes; using a real <Modal> here meant that hand-off could race
          the Modal's own native dismissal (iOS especially will drop a new
          picker/share sheet if one is requested while the previous native
          view is still mid-dismissal), which showed up as those buttons
          doing nothing at all. A plain View has no native presentation of
          its own, so there's nothing to race. */}
      {menu !== 'none' && (
        <View style={s.menuOverlay} pointerEvents="box-none">
          {/* Same kbHeight offset as the label dropdown above, so this card
              rides just above the (keyboard-raised) toolbar too. */}
          <TouchableOpacity style={[s.popBackdrop, { paddingBottom: kbHeight }]} activeOpacity={1} onPress={() => setMenu('none')}>
            <TouchableOpacity activeOpacity={1} style={[s.menuCard, { backgroundColor: colors.bgCard }]}>
              <View style={s.menuGrid}>
                {menuItems.map(it => (
                  <TouchableOpacity key={it.key} style={[s.menuItem, { backgroundColor: colors.bgInput }]} activeOpacity={0.85}
                    onPress={() => (menu === 'add' ? onAddItem(it.key) : onOptionItem(it.key))}>
                    {'Icon' in it && it.Icon ? <it.Icon width={30} height={30} /> : <Text style={{ fontSize: 22 }}>{(it as any).emoji}</Text>}
                    <AppText variant="caption" color={colors.textSecondary}>{it.label}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Sketch full-screen preview — read-only, same viewBox as the
          thumbnail. Plain overlay, not a native <Modal> (see label dropdown
          note above). */}
      {!!sketchPreview && (
        <View style={s.menuOverlay} pointerEvents="box-none">
          <TouchableOpacity style={s.previewBackdrop} activeOpacity={1} onPress={() => setSketchPreview(null)}>
            <View style={s.previewCanvas}>
              <Svg width="100%" height="100%" viewBox={SCRIBBLE_VIEW_BOX}>
                {sketchPreview.paths.map((p, pi) => (
                  <SvgPath key={pi} d={p.d} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ))}
              </Svg>
            </View>
            <TouchableOpacity style={s.previewClose} onPress={() => setSketchPreview(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.previewCloseText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo full-screen preview — plain overlay, not a native <Modal>
          (see label dropdown note above). */}
      {!!photoPreview && (
        <View style={s.menuOverlay} pointerEvents="box-none">
          <TouchableOpacity style={s.previewBackdrop} activeOpacity={1} onPress={() => setPhotoPreview(null)}>
            <View style={s.previewCanvas}>
              <Image source={{ uri: photoPreview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
            <TouchableOpacity style={s.previewClose} onPress={() => setPhotoPreview(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.previewCloseText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { fontSize: 26 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pin: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleInput: { flex: 1, fontSize: 24, paddingVertical: 6 },
  labelPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  labelEmoji: { fontSize: 13 },
  labelGif: { width: 16, height: 16 },
  labelOptGif: { width: 26, height: 26 },
  checklist: { marginTop: Spacing.md, gap: Spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkInput: { flex: 1, fontSize: 16, paddingVertical: 6 },
  addCheckRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  previewBackdrop: { flex: 1, backgroundColor: '#000000E6', alignItems: 'center', justifyContent: 'center' },
  previewCanvas: { width: '90%', aspectRatio: 3 / 4, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden' },
  previewClose: { position: 'absolute', top: 50, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  previewCloseText: { fontSize: 18, color: '#FFFFFF' },
  rich: { minHeight: 300, marginTop: Spacing.md },
  formatBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  fmtBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  tool: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toolTxt: { fontSize: 18 },
  // Same dimensions as Journal's WriteEntryScreen micBtn.
  micBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50 },
  popBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000033' },
  labelCard: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.base, margin: Spacing.lg, borderRadius: Radius.xl, justifyContent: 'center', marginBottom: 120 },
  labelOpt: { width: 84, height: 84, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 6 },
  menuCard: { padding: Spacing.base, margin: Spacing.lg, borderRadius: Radius.xl, marginBottom: 96, alignSelf: 'flex-start' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 240 },
  menuItem: { width: 72, height: 72, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 5, margin: 4 },
});
