// ─────────────────────────────────────────────────────────────────────────────
// GuidedEntryScreen — guided journaling.
//   • Dream variant  (Figma node 380-5011)
//   • Morning/Night/Vent "reflection" variant (Figma node 1028-7338)
//   • Simple prompt variant for Quotes/Ideas/Affirmation
// Saves as a normal journal entry (rich fields serialised into the body).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from 'react';
import {
  View, ScrollView, TextInput, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Image, Modal, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { RootState } from '../../../store';
import { saveDraft, deleteDraft } from '../store/journalSlice';
import { JournalStackParamList } from '../../../navigation/JournalNavigator';
import { AppText } from '../../../shared/components/AppText';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import {
  JournalEntry, JournalTheme, Mood, MOOD_OPTIONS, JOURNAL_THEMES,
  StickerPlacement, ContentBlock, detectHashtags,
} from '../types';
import { blocksFromEntry, bodyFromBlocks, newTextBlock, newImageBlock, newScribbleBlock } from '../contentBlocks';
import { mergeAttachments } from '../attachmentOrder';
import { useOfflineJournal } from '../offline/useOfflineJournal';
import { promptsFor } from '../guidedPrompts';
import { JournalTypePicker } from '../components/JournalTypePicker';
import { JournalTypeDef } from '../components/home';
import {
  SectionCard, ChipMultiSelectAdd, StepSlider, PeopleGrid,
  TaskChecklist, TaskItem, VoiceTextArea, CardCheckGrid,
  GuidedHeader, CalendarPickerSheet, ModeToggle, EntryMode,
  BottomSaveBar, AudioClip, FreestyleToolbar, MoodPickerSheet,
  ThemePickerSheet, TextStylePickerSheet,
  StickerPickerSheet, TagPickerSheet, AttachTooltip, AttachmentGrid,
  JournalCanvas,
  EMOTIONS, SYMBOLS, PEOPLE, EMOTION_TO_MOOD,
  DREAM_EMOTIONS, NIGHT_MOODS, TRIGGERS, NEEDS, PLACES, DREAM_DETAILS, AFFIRMATIONS,
  ChipDef,
} from '../components/guided';

type Props = NativeStackScreenProps<JournalStackParamList, 'GuidedEntry'>;
const gid = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SUBTITLE: Record<string, string> = {
  dream:   'Capture your dreams before they fade away ✨',
  morning: 'Start your day with clarity and intention.',
  night:   'Wind down and reflect on your day.',
  vent:    'Let it all out — this space is yours.',
};

// Only these journal types offer the guided flow (matches HomeScreen); the
// rest open the freestyle editor directly when picked from the type popup.
const GUIDED_TYPES = new Set(['morning', 'night', 'dream', 'vent']);

export function GuidedEntryScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { saveEntry } = useOfflineJournal();
  const userId = useSelector((s: RootState) => s.auth.user?.id);

  // Editing an existing entry (opened via the pencil icon on EntryDetail)
  // hydrates every field below from it instead of starting blank, and Save
  // updates that same entry rather than creating a new one.
  const routeEntryId = route.params?.entryId;
  const allEntries = useSelector((s: RootState) => s.journal.entries);
  const allDrafts  = useSelector((s: RootState) => s.journal.drafts);
  const existing = routeEntryId
    ? (allEntries.find(e => e.id === routeEntryId) ?? allDrafts.find(d => d.id === routeEntryId))
    : undefined;

  // Stable id, generated once, so the Scribble pad and any draft snapshot
  // both refer to the same in-progress entry before it's actually saved —
  // or, when editing, the id of the entry being edited.
  const [eid] = useState(() => existing?.id ?? gid());
  // Reactive window size for the full-screen media preview below, instead
  // of the module-level Dimensions.get('window') snapshot this used to use
  // (stale if the window itself changes — Android split-screen, foldables,
  // iPad multitasking).
  const { width: winW, height: winH } = useWindowDimensions();

  const category = existing?.category ?? route.params?.category ?? 'morning';
  // A brand-new journal starts black & white regardless of type — color
  // only comes in once the person actively picks a theme from the Theme
  // popup for this entry. Editing an existing entry keeps whatever theme it
  // was actually saved with.
  const [theme, setTheme] = useState<JournalTheme>(existing?.theme ?? 'default');
  const th = JOURNAL_THEMES.find(t => t.id === theme) ?? JOURNAL_THEMES[0];
  const variant: 'dream' | 'reflection' | 'simple' =
    category === 'dream' ? 'dream'
      : ['morning', 'night', 'vent'].includes(category) ? 'reflection'
        : 'simple';

  const typeWord = cap(category);
  const headerTitle = variant === 'dream' ? 'New Dream' : (route.params?.title ?? `${typeWord} Journal`);
  const subtitle = SUBTITLE[category] ?? 'Take a mindful moment.';
  const saveLabel = 'Save';

  // ── type-switch popup (journal name + chevron) and date popup ──
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [date, setDate] = useState(() => (existing ? new Date(existing.createdAt) : new Date()));
  // Freestyle vs Guided — a tab inside this screen (see ModeToggle below).
  // A brand-new entry always lands on Freestyle first; editing an existing
  // one reopens on whichever tab it was actually written in.
  const [mode, setMode] = useState<EntryMode>((existing?.mode as EntryMode) ?? 'freestyle');
  // Mood chip shown top-right of the Freestyle canvas.
  const [mood, setMood] = useState<Mood>(existing?.mood ?? 'happy');
  const [moodPickerOpen, setMoodPickerOpen] = useState(false);
  const moodEmoji = MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? '😊';

  // Picking a new type from the popup behaves exactly like tapping it on
  // Home: guided-capable types land straight on this same screen (its own
  // Freestyle tab shows first); the rest go straight to the freeform editor.
  const selectType = (t: JournalTypeDef) => {
    setTypeSheetVisible(false);
    if (GUIDED_TYPES.has(t.key)) {
      navigation.replace('GuidedEntry', { title: t.label, theme: t.theme, category: t.key });
      return;
    }
    navigation.replace('WriteEntry', { title: t.label, theme: t.theme, category: t.key, skipMood: true });
  };

  // ── shared field state — hydrated from `existing` when editing ──
  const [title, setTitle]         = useState(existing?.title ?? '');
  const [emotions, setEmotions]   = useState<string[]>([]);
  const [mainText, setMainText]   = useState(existing?.body ?? '');       // describe / gratitude
  const [notes, setNotes]         = useState('');
  const [clips, setClips]         = useState<AudioClip[]>(existing?.voiceNoteUrl ? [{ id: gid(), uri: existing.voiceNoteUrl }] : []);
  const [people, setPeople]       = useState<string[]>([]);
  const [symbols, setSymbols]     = useState<string[]>([]);
  const [intensity, setIntensity] = useState(5);

  // ── custom ("+ Add your own") chips per picker, kept separate so keys
  // never collide between different question cards ──
  const [customFeelings, setCustomFeelings]   = useState<ChipDef[]>([]);
  const [customTriggers, setCustomTriggers]   = useState<ChipDef[]>([]);
  const [customPlaces, setCustomPlaces]       = useState<ChipDef[]>([]);
  const [customSymbols, setCustomSymbols]     = useState<ChipDef[]>([]);
  const [customAffirmations, setCustomAffirmations] = useState<ChipDef[]>([]);
  const addCustomChip = (set: React.Dispatch<React.SetStateAction<ChipDef[]>>, selectSet: React.Dispatch<React.SetStateAction<string[]>>) =>
    (label: string) => {
      set(p => [...p, { key: label, label, emoji: '' }]);
      selectSet(p => [...p, label]);
    };

  // ── Morning ──
  const [manifestation, setManifestation] = useState('');
  const [todos, setTodos] = useState<TaskItem[]>([{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }]);
  const [affirmations, setAffirmations] = useState<string[]>([]);

  // ── Night ──
  const [gratitudeTexts, setGratitudeTexts] = useState<string[]>(['', '', '']);
  const [gratitudeTasks, setGratitudeTasks] = useState<TaskItem[]>([{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }]);

  // ── Vent ──
  const [triggers, setTriggers] = useState<string[]>([]);
  const [needs, setNeeds]       = useState<string[]>([]);

  // ── Dream ──
  const [dreamDetails, setDreamDetails] = useState<string[]>([]);
  const [dreamPlaces, setDreamPlaces]   = useState<string[]>([]);
  // Defaults to public (not private) — the Home/Journal lists only show
  // entries where isPrivate is false, and there's no toggle in this screen
  // to flip it, so defaulting to true here would make every new journal
  // silently vanish from Recents right after saving.
  const [priv, setPriv]           = useState(existing?.isPrivate ?? false);
  const [answers, setAnswers]     = useState<Record<string, string>>({});

  // ── Freestyle extras: stickers, text style, media, tags, scribbles ──
  const [stickers, setStickers]   = useState<StickerPlacement[]>(existing?.stickerPlacements ?? []);
  // Body — an ordered sequence of text/image blocks. Inserting a photo
  // splits whichever block the cursor was in, so it lands exactly there and
  // typing afterwards continues in a fresh block right underneath it (no
  // more freeform x/y placement). Seeded from the entry's own contentBlocks
  // if it has any, else migrated from its flat body + any legacy freeform
  // imagePlacements so nothing from before this existed is lost. Videos and
  // scribbles still show in the plain grid below the text (see `attachments`
  // below) — only photos live inline.
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => blocksFromEntry(existing));
  const [canvasActive, setCanvasActive] = useState(false); // disables ScrollView while dragging a sticker
  const [textColor, setTextColor] = useState(existing?.textColor ?? '#111111');
  const [fontSize, setFontSize]   = useState(existing?.fontSize ?? 16);
  const [bold, setBold]           = useState(existing?.bold ?? false);
  const [italic, setItalic]       = useState(existing?.italic ?? false);
  const [underline, setUnderline] = useState(existing?.underline ?? false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(existing?.textAlign ?? 'left');
  const [media, setMedia]         = useState<string[]>(existing?.mediaUrls ?? []);
  const [tags, setTags]           = useState<string[]>(existing?.tags ?? []);
  const [important, setImportant] = useState(existing?.isImportant ?? false);
  const [imagePreview, setImagePreview] = useState<{ url: string; isVid: boolean } | null>(null);
  // Order tokens (`media:<uri>` / `scribble:<pageId>`) recorded the moment
  // each attachment is added, so they can be shown interleaved in the order
  // they were actually placed rather than as two fixed sections.
  const [attachmentOrder, setAttachmentOrder] = useState<string[]>(existing?.attachmentOrder ?? []);
  // Pages already accounted for in attachmentOrder (either from the saved
  // entry, or ones committed in an earlier visit to this screen) so the
  // effect below only appends tokens for genuinely new scribble pages.
  const knownScribbleIds = useRef<Set<string>>(new Set(existing?.scribblePages?.map(p => p.id) ?? []));

  // Scribble pages live in the redux draft (ScribbleScreen writes there
  // directly via saveScribblePage) — read them back so new pages show here
  // as soon as we return from the Scribble pad. Falls back to the saved
  // entry's own pages when editing and no draft has been created yet.
  const draftScribbles = useSelector((s: RootState) => s.journal.drafts.find(d => d.id === eid)?.scribblePages);
  const scribblePages = draftScribbles ?? existing?.scribblePages ?? [];
  // Any brand-new scribble page (drawn just now, not one already placed as
  // an inline block or already sitting in the legacy grid) gets inserted at
  // the cursor exactly like a photo/video — see the effect further down,
  // once insertScribbleAtCursor exists.

  // ── panel visibility ──
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [textStyleOpen, setTextStyleOpen]         = useState(false);
  const [tagPickerOpen, setTagPickerOpen]         = useState(false);
  const [themePickerOpen, setThemePickerOpen]     = useState(false);
  const [attachOpen, setAttachOpen]               = useState(false);

  const prompts = useMemo(() => promptsFor(category), [category]);
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) =>
    set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k]);

  const labelsOf = (defs: { key: string; label: string }[], keys: string[]) =>
    defs.filter(d => keys.includes(d.key)).map(d => d.label).join(', ');

  // ── stickers ──
  const addSticker = (key: string) => {
    setStickers(p => [...p, { id: gid(), asset: key, x: 60, y: 60, scale: 1, rotation: 0 }]);
    setStickerPickerOpen(false);
  };
  const onStickerCommit = (id: string, x: number, y: number, scale: number, rotation: number) =>
    setStickers(p => p.map(sp => (sp.id === id ? { ...sp, x, y, scale, rotation } : sp)));
  const onStickerDelete = (id: string) => setStickers(p => p.filter(sp => sp.id !== id));

  // ── per-block refs / cursor tracking — every text block is its own
  // TextInput, so we track which one is focused and where its cursor last
  // was, both for bullet-list insertion and for "drop the image exactly
  // where the cursor is" image insertion below. ──
  const blockRefs = useRef<Map<string, TextInput | null>>(new Map());
  const selByBlock = useRef<Map<string, { start: number; end: number }>>(new Map());
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [bulletMode, setBulletMode] = useState(false);

  const onFocusBlock = (id: string) => setFocusedBlockId(id);
  const onSelectionChangeBlock = (id: string, sel: { start: number; end: number }) => {
    selByBlock.current.set(id, sel);
  };
  // Whichever text block the cursor was last in, or the last text block in
  // the sequence if nothing's been focused yet (e.g. a toolbar button
  // tapped before typing anywhere).
  const activeTextBlockId = () => focusedBlockId ?? [...blocks].reverse().find(b => b.type === 'text')?.id;

  // ── bullets — tapping the toolbar icon starts a bullet list at the
  // cursor; every Enter afterwards continues it with a fresh "• ", and
  // pressing Enter twice in a row (an empty bullet) exits back to normal
  // text, matching how bullet lists behave in most note apps. ──
  const insertBullet = () => {
    const targetId = activeTextBlockId();
    const idx = targetId ? blocks.findIndex(b => b.id === targetId) : -1;
    if (idx === -1) return;
    const text = blocks[idx].text ?? '';
    const sel = selByBlock.current.get(blocks[idx].id) ?? { start: text.length, end: text.length };
    const pos = sel.start ?? text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const insertion = (before.length === 0 || before.endsWith('\n')) ? '• ' : '\n• ';
    const newText = before + insertion + after;
    setBlocks(bs => bs.map(b => (b.id === blocks[idx].id ? { ...b, text: newText } : b)));
    setBulletMode(true);
    const newPos = pos + insertion.length;
    const id = blocks[idx].id;
    requestAnimationFrame(() => blockRefs.current.get(id)?.setNativeProps({ selection: { start: newPos, end: newPos } }));
  };

  const onChangeBlockText = (id: string, next: string) => {
    setBlocks(bs => {
      const idx = bs.findIndex(b => b.id === id);
      if (idx === -1) return bs;
      const prev = bs[idx].text ?? '';
      // Only intercept a plain single Enter keystroke while list mode is on
      // — anything else (typing, pasting, deleting) passes straight through.
      if (bulletMode && next.length === prev.length + 1 && next.slice(0, -1) === prev && next.endsWith('\n')) {
        const upToNewline = next.slice(0, -1);
        const lastLineStart = upToNewline.lastIndexOf('\n') + 1;
        const lastLine = upToNewline.slice(lastLineStart);
        const out = [...bs];
        if (lastLine.trim() === '•') {
          // Empty bullet + Enter → drop the empty bullet line, exit list mode.
          out[idx] = { ...out[idx], text: upToNewline.slice(0, lastLineStart) };
          setBulletMode(false);
          return out;
        }
        // Continue the list with a fresh bullet.
        out[idx] = { ...out[idx], text: next + '• ' };
        return out;
      }
      const out = [...bs];
      out[idx] = { ...out[idx], text: next };
      return out;
    });
  };

  // ── photo/video attach — the media always drops in below whatever's
  // already been typed in the block you're working in (never spliced into
  // the middle of a sentence, wherever the cursor happens to sit), and a
  // fresh block opens right underneath it so the next words you type
  // continue there. Adding several items in one go repeats the same
  // pattern for each one, in order. Photos, videos, and scribbles (see
  // insertScribbleAtCursor below) all go through this same inline
  // placement now. `allowsEditing` gives the OS's own native crop UI at
  // insert time. ──
  const insertMediaAtCursor = (uris: string[], isVideo: boolean) => {
    setBlocks(bs => {
      const targetId = focusedBlockId ?? [...bs].reverse().find(b => b.type === 'text')?.id;
      const idx = targetId ? bs.findIndex(b => b.id === targetId) : -1;
      if (idx === -1) {
        // No text block found at all — just append to the end.
        const imgs = uris.map(u => newImageBlock(u, isVideo));
        return [...bs, ...imgs, newTextBlock()];
      }
      const text = bs[idx].text ?? '';

      const inserted: ContentBlock[] = [];
      uris.forEach((uri, i) => {
        inserted.push(newImageBlock(uri, isVideo));
        if (i < uris.length - 1) inserted.push(newTextBlock());
      });
      const beforeBlock: ContentBlock = { ...bs[idx], text }; // keeps its id and all its text, unchanged
      const afterBlock = newTextBlock('');

      const next = [...bs];
      next.splice(idx, 1, beforeBlock, ...inserted, afterBlock);

      // Focus shifts to the fresh block right after the image, so whatever
      // gets typed next continues below it.
      requestAnimationFrame(() => {
        setFocusedBlockId(afterBlock.id);
        blockRefs.current.get(afterBlock.id)?.focus();
      });
      return next;
    });
  };

  const onDeleteImageBlock = (id: string) => {
    setBlocks(bs => {
      const idx = bs.findIndex(b => b.id === id);
      if (idx === -1) return bs;
      const prev = bs[idx - 1];
      const next = bs[idx + 1];
      // Merge the surrounding text blocks back together so removing an
      // image doesn't leave a stray empty paragraph gap in the text.
      if (prev?.type === 'text' && next?.type === 'text') {
        const merged: ContentBlock = { ...prev, text: `${prev.text ?? ''}${next.text ?? ''}` };
        const out = [...bs];
        out.splice(idx - 1, 3, merged);
        return out;
      }
      return bs.filter(b => b.id !== id);
    });
  };

  const onPressImageBlock = (id: string) => {
    const b = blocks.find(x => x.id === id);
    if (b?.type === 'image' && b.uri) setImagePreview({ url: b.uri, isVid: !!b.isVideo });
  };

  // ── scribble — same "drop in below whatever's typed, fresh block opens
  // underneath" placement as photos/videos, just carrying a pageId instead
  // of a uri (the actual paths still live in scribblePages/redux, unchanged). ──
  const insertScribbleAtCursor = (pageId: string) => {
    setBlocks(bs => {
      const targetId = focusedBlockId ?? [...bs].reverse().find(b => b.type === 'text')?.id;
      const idx = targetId ? bs.findIndex(b => b.id === targetId) : -1;
      const scribbleBlock = newScribbleBlock(pageId);
      if (idx === -1) {
        return [...bs, scribbleBlock, newTextBlock()];
      }
      const text = bs[idx].text ?? '';
      const beforeBlock: ContentBlock = { ...bs[idx], text };
      const afterBlock = newTextBlock('');
      const next = [...bs];
      next.splice(idx, 1, beforeBlock, scribbleBlock, afterBlock);
      requestAnimationFrame(() => {
        setFocusedBlockId(afterBlock.id);
        blockRefs.current.get(afterBlock.id)?.focus();
      });
      return next;
    });
  };

  const onDeleteScribbleBlock = (id: string) => {
    setBlocks(bs => {
      const idx = bs.findIndex(b => b.id === id);
      if (idx === -1) return bs;
      const prev = bs[idx - 1];
      const next = bs[idx + 1];
      if (prev?.type === 'text' && next?.type === 'text') {
        const merged: ContentBlock = { ...prev, text: `${prev.text ?? ''}${next.text ?? ''}` };
        const out = [...bs];
        out.splice(idx - 1, 3, merged);
        return out;
      }
      return bs.filter(b => b.id !== id);
    });
    // The scribble page's drawing itself stays in scribblePages/redux either
    // way — only the inline placement is removed, matching how removing a
    // legacy attachment only drops its order token, not the underlying data.
  };

  const onPressScribbleBlock = (pageId: string) => {
    navigation.navigate('Scribble', { entryId: eid, pageId });
  };

  // Any brand-new scribble page (drawn just now, not one from a page we've
  // already placed) gets inserted inline at the cursor exactly once.
  React.useEffect(() => {
    const fresh = scribblePages.filter(p => !knownScribbleIds.current.has(p.id));
    if (fresh.length) {
      fresh.forEach(p => {
        knownScribbleIds.current.add(p.id);
        insertScribbleAtCursor(p.id);
      });
    }
  }, [scribblePages]);

  // Guided/Simple modes have no text canvas to insert inline images into —
  // photos/videos picked there are stored the same way legacy attachments
  // always have been (media + an order token) so they persist on save and
  // show up in the "Attachments" card at the bottom of the screen.
  const addLegacyMedia = (uris: string[], isVideo: boolean) => {
    setMedia(m => [...m, ...uris]);
    setAttachmentOrder(o => [...o, ...uris.map(u => `media:${u}`)]);
  };
  const isFreestyleCanvas = mode === 'freestyle' && variant !== 'simple';
  const addPicked = (uris: string[], isVideo: boolean) =>
    isFreestyleCanvas ? insertMediaAtCursor(uris, isVideo) : addLegacyMedia(uris, isVideo);

  const pickPhoto = async () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Take Photo', onPress: async () => {
          const cp = await ImagePicker.requestCameraPermissionsAsync();
          if (!cp.granted) { Alert.alert('Camera permission needed', 'Please allow camera access in Settings.'); return; }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true });
          if (!r.canceled) addPicked(r.assets.map(a => a.uri), false);
      }},
      { text: 'Choose from Gallery', onPress: async () => {
          const lp = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!lp.granted) { Alert.alert('Gallery permission needed'); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.85 });
          if (!r.canceled) addPicked(r.assets.map(a => a.uri), false);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const pickVideo = async () => {
    Alert.alert('Add Video', 'Choose source', [
      { text: 'Record Video', onPress: async () => {
          const cp = await ImagePicker.requestCameraPermissionsAsync();
          if (!cp.granted) { Alert.alert('Camera permission needed', 'Please allow camera access in Settings.'); return; }
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 120 });
          if (!r.canceled) addPicked(r.assets.map(a => a.uri), true);
      }},
      { text: 'Choose from Gallery', onPress: async () => {
          const lp = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!lp.granted) { Alert.alert('Gallery permission needed'); return; }
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsMultipleSelection: true });
          if (!r.canceled) addPicked(r.assets.map(a => a.uri), true);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const removeAttachment = (item: { kind: string; uri?: string; page?: { id: string } }) => {
    if (item.kind === 'scribble' && (item as any).page) {
      const id = (item as any).page.id as string;
      setAttachmentOrder(o => o.filter(t => t !== `scribble:${id}`));
      // Scribble pages themselves live in the redux draft; simplest is to
      // just drop the order token so it stops showing here.
    } else if ((item as any).uri) {
      const uri = (item as any).uri as string;
      setMedia(m => m.filter(u => u !== uri));
      setAttachmentOrder(o => o.filter(t => t !== `media:${uri}`));
    }
  };

  // ── scribble ──
  const buildBody = (): string => {
    const lines: string[] = [];

    if (mode === 'freestyle' && variant !== 'simple') {
      // Freestyle tab — the flattened text of every block, in order (image
      // blocks contribute nothing here; they're not part of the searchable
      // hashtag-detected text).
      const flat = bodyFromBlocks(blocks);
      if (flat.trim()) lines.push(flat.trim());
    } else if (variant === 'dream') {
      if (mainText.trim()) lines.push(mainText.trim());
      if (emotions.length) lines.push(`Feelings: ${labelsOf([...DREAM_EMOTIONS, ...customFeelings], emotions)}`);
      if (dreamDetails.length) lines.push(`Dream details: ${labelsOf(DREAM_DETAILS, dreamDetails)}`);
      if (dreamPlaces.length) lines.push(`Where: ${labelsOf([...PLACES, ...customPlaces], dreamPlaces)}`);
      if (people.length) lines.push(`People: ${labelsOf(PEOPLE, people)}`);
      if (symbols.length) lines.push(`Symbols: ${labelsOf([...SYMBOLS, ...customSymbols], symbols)}`);
    } else if (variant === 'reflection' && category === 'morning') {
      if (emotions.length) lines.push(`Feeling: ${labelsOf([...EMOTIONS, ...customFeelings], emotions)}`);
      if (manifestation.trim()) lines.push(`Manifesting: ${manifestation.trim()}`);
      const tasks = todos.map(t => t.text.trim()).filter(Boolean);
      if (tasks.length) lines.push('To-Do:\n' + todos.filter(t => t.text.trim()).map(t => `• ${t.text.trim()}`).join('\n'));
      if (affirmations.length) lines.push(`Affirmations: ${labelsOf([...AFFIRMATIONS, ...customAffirmations], affirmations)}`);
    } else if (variant === 'reflection' && category === 'night') {
      if (emotions.length) lines.push(`Feeling: ${labelsOf([...NIGHT_MOODS, ...customFeelings], emotions)}`);
      const gt = gratitudeTexts.map(x => x.trim()).filter(Boolean);
      if (gt.length) lines.push('Grateful for:\n' + gt.map(x => `• ${x}`).join('\n'));
      const gTasks = gratitudeTasks.filter(t => t.text.trim());
      if (gTasks.length) lines.push('Grateful for (tasks):\n' + gTasks.map(t => `• ${t.text.trim()}`).join('\n'));
    } else if (variant === 'reflection' && category === 'vent') {
      if (mainText.trim()) lines.push(mainText.trim());
      if (emotions.length) lines.push(`Feeling: ${labelsOf([...EMOTIONS, ...customFeelings], emotions)}`);
      if (triggers.length) lines.push(`Triggered by: ${labelsOf([...TRIGGERS, ...customTriggers], triggers)}`);
      lines.push(`Intensity: ${intensity}/10`);
      if (needs.length) lines.push(`Needs: ${labelsOf(NEEDS, needs)}`);
    } else {
      prompts.forEach(pr => { const v = (answers[pr.id] ?? '').trim(); if (v) lines.push(`${pr.label}\n${v}`); });
    }
    if (notes.trim()) lines.push(`Notes: ${notes.trim()}`);
    return lines.join('\n\n');
  };

  const build = (isDraft: boolean): JournalEntry => {
    const body = buildBody();
    // Freestyle uses the mood chip the person picked; Guided derives it from
    // the selected emotion chips (no mood chip shown in that tab).
    const finalMood: Mood = mode === 'freestyle' ? mood : ((EMOTION_TO_MOOD[emotions[0]] ?? 'happy') as Mood);
    const now = new Date().toISOString();
    return {
      id: eid, title: title.trim() || headerTitle, body, detectedHashtags: detectHashtags(body), mood: finalMood,
      tags, mediaUrls: media, voiceNoteUrl: clips[0]?.uri,
      stickers: stickers.map(sp => sp.asset ?? sp.emoji ?? ''), stickerPlacements: stickers,
      // contentBlocks is only meaningful for entries actually written on the
      // Freestyle canvas — Guided-mode saves leave it undefined so the view
      // screen's migration path falls back to the composed `body` above
      // instead of showing whatever blocks happened to be seeded on load.
      contentBlocks: (mode === 'freestyle' && variant !== 'simple') ? blocks : undefined,
      imagePlacements: [], // superseded by contentBlocks — old freeform data was already migrated into blocks on load
      bold, italic, underline, textAlign,
      scribblePages, attachmentOrder,
      isPrivate: priv, isImportant: important, theme, category: category as any,
      textColor, fontSize, createdAt: date.toISOString(), updatedAt: now, isDraft,
      mode: variant !== 'simple' ? mode : 'guided',
    };
  };

  // Snapshot to a draft before navigating to the Scribble pad, so
  // ScribbleScreen can find this in-progress entry by id and attach its page.
  const persistDraft = () => dispatch(saveDraft(build(true)));
  const openScribble = () => {
    persistDraft();
    navigation.navigate('Scribble', { entryId: eid, pageId: `scribble_${eid}_${scribblePages.length + 1}` });
  };

  const onSave = () => {
    if (!userId) { Alert.alert('Sign in required', 'You must be logged in to save entries.'); return; }
    const body = buildBody();
    if (!title.trim() && !body.trim()) { Alert.alert('Nothing yet', 'Add a title or fill in a section to save.'); return; }

    const entry = build(false);
    // Let saveEntry auto-detect new-vs-existing (it checks whether this id
    // is already in the entries list) so editing an existing journal
    // updates it in place instead of creating a duplicate.
    saveEntry(entry);
    dispatch(deleteDraft(eid));
    navigation.navigate('Journal');
  };

  const dateLabel = date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
  // Scribble pages already placed inline (as a block) must NOT also flow
  // into the legacy grid below — mergeAttachments' fallback shows any
  // scribblePage missing an attachmentOrder token (so nothing from older
  // entries silently vanishes), but new scribbles deliberately skip that
  // token now, so without this filter every one would show up twice: once
  // inline, once again at the bottom.
  const inlineScribbleIds = useMemo(
    () => new Set(blocks.filter(b => b.type === 'scribble').map(b => b.pageId)),
    [blocks],
  );
  const legacyScribblePages = useMemo(
    () => scribblePages.filter(p => !inlineScribbleIds.has(p.id)),
    [scribblePages, inlineScribbleIds],
  );
  const attachments = useMemo(
    () => mergeAttachments(media, legacyScribblePages, attachmentOrder),
    [media, legacyScribblePages, attachmentOrder],
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgApp }]} edges={['top', 'bottom']}>
      <GuidedHeader
        title={headerTitle}
        subtitle={subtitle}
        dateLabel={dateLabel}
        typeKey={category}
        onBack={() => navigation.goBack()}
        onPressTitle={() => setTypeSheetVisible(true)}
        onPressDate={() => setCalendarVisible(true)}
        rightSlot={mode === 'freestyle' && variant !== 'simple' ? (
          <TouchableOpacity style={[s.topSaveBtn, { backgroundColor: colors.textPrimary }]} activeOpacity={0.85} onPress={onSave}>
            <AppText variant="button" color={colors.bgCard}>{saveLabel}</AppText>
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Journal-name popup — switch to a different type, same flow as Home. */}
      {/* Switching type from inside a Journal entry only offers other Journal
          types (Morning/Night/Dream/Vent) — Notes (Quotes/Ideas/Affirmation)
          live in their own tab and shouldn't show up in this popup. */}
      <JournalTypePicker visible={typeSheetVisible} onSelect={selectType} onClose={() => setTypeSheetVisible(false)} />
      <CalendarPickerSheet
        visible={calendarVisible}
        date={date}
        onSelect={d => { setDate(d); setCalendarVisible(false); }}
        onClose={() => setCalendarVisible(false)}
      />

      {variant !== 'simple' && <ModeToggle value={mode} onChange={setMode} />}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!canvasActive}
        >

          {/* Freestyle tab — a plain, cardless canvas: mood chip, a bare
              title field, then an open body field that fills the rest of
              the screen. No SectionCard wrappers here, matching the
              freeform-editor look (as opposed to Guided's stacked cards). */}
          {mode === 'freestyle' && variant !== 'simple' ? (
            // The exact same JournalCanvas component EntryDetailScreen renders
            // read-only — this IS the journal page, not a separate "editing
            // layout", so there's nothing to drift out of sync with the view.
            <JournalCanvas
              editable
              th={th}
              colors={colors}
              title={title}
              onChangeTitle={setTitle}
              blocks={blocks}
              onChangeBlockText={onChangeBlockText}
              onFocusBlock={onFocusBlock}
              onSelectionChangeBlock={onSelectionChangeBlock}
              blockRefs={blockRefs}
              onDeleteImageBlock={onDeleteImageBlock}
              onPressImageBlock={onPressImageBlock}
              scribblePages={scribblePages}
              onPressScribbleBlock={onPressScribbleBlock}
              onDeleteScribbleBlock={onDeleteScribbleBlock}
              textColor={textColor}
              fontSize={fontSize}
              bold={bold}
              italic={italic}
              underline={underline}
              textAlign={textAlign}
              mood={mood}
              onPressMood={() => setMoodPickerOpen(true)}
              tags={tags}
              onRemoveTag={t => setTags(p => p.filter(x => x !== t))}
              detectedHashtags={detectHashtags(bodyFromBlocks(blocks))}
              stickers={stickers}
              onCommitSticker={onStickerCommit}
              onDeleteSticker={onStickerDelete}
              legacyAttachments={attachments}
              onPressLegacyImage={url => setImagePreview({ url, isVid: false })}
              onPressLegacyVideo={url => setImagePreview({ url, isVid: true })}
              onPressLegacyScribble={pageId => navigation.navigate('Scribble', { entryId: eid, pageId })}
              onRemoveLegacy={removeAttachment}
              onActiveChange={setCanvasActive}
            />
          ) : variant === 'simple' ? (
            <>
              {/* Title */}
              <SectionCard title={`${typeWord} Journal Title`}>
                <View style={[s.titleField, { borderColor: colors.border }]}>
                  <TextInput
                    style={[s.titleInput, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
                    placeholder="Give your Journal a title"
                    placeholderTextColor={colors.textMuted}
                    value={title} onChangeText={setTitle}
                  />
                  <Text style={s.sparkle}>✨</Text>
                </View>
              </SectionCard>
            </>
          ) : null}

          {mode === 'guided' && variant === 'dream' && (
            <>
              <SectionCard title="What was your dream?" subtitle="Write or speak your dream in as much detail as you remember">
                <VoiceTextArea value={mainText} onChange={setMainText} placeholder="Type here or Tap the mic to speak…" clips={clips} onChangeClips={setClips} />
              </SectionCard>

              <SectionCard title="How did you feel?" subtitle="Select all that apply.">
                <ChipMultiSelectAdd
                  options={DREAM_EMOTIONS} extra={customFeelings}
                  selected={emotions} onToggle={k => toggle(emotions, setEmotions, k)}
                  onAddCustom={addCustomChip(setCustomFeelings, setEmotions)}
                />
              </SectionCard>

              <SectionCard title="Dream details" subtitle="Select all that apply.">
                <CardCheckGrid options={DREAM_DETAILS} selected={dreamDetails} onToggle={k => toggle(dreamDetails, setDreamDetails, k)} variant="grid2" />
              </SectionCard>

              <SectionCard title="Where did it happen?" subtitle="Add or choose from suggestions.">
                <ChipMultiSelectAdd
                  options={PLACES} extra={customPlaces}
                  selected={dreamPlaces} onToggle={k => toggle(dreamPlaces, setDreamPlaces, k)}
                  onAddCustom={addCustomChip(setCustomPlaces, setDreamPlaces)}
                  addLabel="+ Other"
                />
              </SectionCard>

              <SectionCard title="People In Dream" subtitle="Who was in your dream?" action="+Add">
                <PeopleGrid options={PEOPLE} selected={people} onToggle={k => toggle(people, setPeople, k)} />
              </SectionCard>

              <SectionCard title="What symbols stood out in your dream?" subtitle="Select all that apply">
                <ChipMultiSelectAdd
                  options={SYMBOLS} extra={customSymbols}
                  selected={symbols} onToggle={k => toggle(symbols, setSymbols, k)}
                  onAddCustom={addCustomChip(setCustomSymbols, setSymbols)}
                  addLabel="+ Other"
                />
              </SectionCard>
            </>
          )}

          {mode === 'guided' && category === 'morning' && (
            <>
              <SectionCard title="How are you feeling this morning?" subtitle="Pick words that best describe how you feel.">
                <ChipMultiSelectAdd
                  options={EMOTIONS} extra={customFeelings}
                  selected={emotions} onToggle={k => toggle(emotions, setEmotions, k)}
                  onAddCustom={addCustomChip(setCustomFeelings, setEmotions)}
                />
              </SectionCard>

              <SectionCard title="What are you manifesting?" subtitle="What are you calling in today?">
                <TextArea value={manifestation} onChange={setManifestation} placeholder="e.g. I am attracting opportunities that align with my purpose." showCount={false} />
              </SectionCard>

              <SectionCard title="What's On Your To-Do List Today?" subtitle="How energized do you feel?">
                <TaskChecklist items={todos} onChange={setTodos} placeholder="Add your task…." addLabel="+ Add task" />
              </SectionCard>

              <SectionCard title="Affirmations For Today" subtitle="Choose or write your affirmations.">
                <ChipMultiSelectAdd
                  options={AFFIRMATIONS} extra={customAffirmations}
                  selected={affirmations} onToggle={k => toggle(affirmations, setAffirmations, k)}
                  onAddCustom={addCustomChip(setCustomAffirmations, setAffirmations)}
                  addLabel="+ Add your own affirmation"
                />
              </SectionCard>

              <SectionCard title="Anything On Your Mind?" subtitle="Write it out. Let your thoughts flow.">
                <VoiceTextArea value={notes} onChange={setNotes} placeholder="Type here or use voice to text…" clips={clips} onChangeClips={setClips} />
              </SectionCard>

              <SectionCard title="Mark this as Special journal" subtitle="Pick hashtags that best describe how you feel.">
                <View style={s.hashRow}>
                  {['Birthday', 'ImportantDay'].map(h => {
                    const on = tags.includes(h);
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[s.hashChip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primaryLight : 'transparent' }]}
                        activeOpacity={0.75}
                        onPress={() => setTags(p => (p.includes(h) ? p.filter(x => x !== h) : [...p, h]))}
                      >
                        <AppText variant="bodySmall" color={on ? colors.primary : colors.textSecondary}># {h === 'ImportantDay' ? 'Importantday' : h}</AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SectionCard>
            </>
          )}

          {mode === 'guided' && category === 'night' && (
            <>
              <SectionCard title="How are you feeling this morning?" subtitle="Pick words that best describe how you feel.">
                <ChipMultiSelectAdd
                  options={NIGHT_MOODS} extra={customFeelings}
                  selected={emotions} onToggle={k => toggle(emotions, setEmotions, k)}
                  onAddCustom={addCustomChip(setCustomFeelings, setEmotions)}
                />
              </SectionCard>

              <SectionCard title="What's Are You Grateful For Today?" subtitle="List the things that made you feel grateful.">
                <TaskChecklist
                  items={gratitudeTexts.map(t => ({ text: t, done: false }))}
                  onChange={items => setGratitudeTexts(items.map(i => i.text))}
                  placeholder="I am grateful for…" addLabel="+ Add Another" showCheckbox={false}
                />
              </SectionCard>

              <SectionCard title="What's Are You Grateful For Today?" subtitle="List the things that made you feel grateful.">
                <TaskChecklist items={gratitudeTasks} onChange={setGratitudeTasks} placeholder="Add your task" addLabel="+ Add Another" />
              </SectionCard>

              <SectionCard title="Anything You Want To Let Go Or Note Down?" subtitle="Write it out. use voice if want to.">
                <VoiceTextArea value={notes} onChange={setNotes} placeholder="Type here or use voice to text…" clips={clips} onChangeClips={setClips} />
              </SectionCard>
            </>
          )}

          {mode === 'guided' && category === 'vent' && (
            <>
              <SectionCard title="What's On Your Mind Right Now?" subtitle="Write or speak Freely. No judgment, just you.">
                <VoiceTextArea value={mainText} onChange={setMainText} placeholder="Type here or Tap the mic to speak…" clips={clips} onChangeClips={setClips} />
              </SectionCard>

              <SectionCard title="How are you feeling right now?" subtitle="Select all that apply">
                <ChipMultiSelectAdd
                  options={EMOTIONS} extra={customFeelings}
                  selected={emotions} onToggle={k => toggle(emotions, setEmotions, k)}
                  onAddCustom={addCustomChip(setCustomFeelings, setEmotions)}
                />
              </SectionCard>

              <SectionCard title="What triggered this?" subtitle="Select all that apply">
                <ChipMultiSelectAdd
                  options={TRIGGERS} extra={customTriggers}
                  selected={triggers} onToggle={k => toggle(triggers, setTriggers, k)}
                  onAddCustom={addCustomChip(setCustomTriggers, setTriggers)}
                />
              </SectionCard>

              <SectionCard title="How intense is this feeling" subtitle="On scale of 1 to 10">
                <StepSlider value={intensity} onChange={setIntensity} showScale />
              </SectionCard>

              <SectionCard title="What do you need right now?" subtitle="Select all that apply">
                <CardCheckGrid options={NEEDS} selected={needs} onToggle={k => toggle(needs, setNeeds, k)} variant="row3" />
              </SectionCard>

              <SectionCard title="Is there anything you want to let go of?" subtitle="Write it down and release it.">
                <VoiceTextArea value={notes} onChange={setNotes} placeholder="Type here or Tap the mic to speak…" clips={clips} onChangeClips={setClips} />
              </SectionCard>
            </>
          )}

          {variant === 'simple' && prompts.map(pr => (
            <SectionCard key={pr.id} title={pr.label}>
              <TextArea value={answers[pr.id] ?? ''} onChange={v => setAnswers(a => ({ ...a, [pr.id]: v }))} placeholder={pr.placeholder ?? 'Write here…'} showCount={false} />
            </SectionCard>
          ))}

          {/* Additional Notes — only the plain "simple" variant (Quotes/Ideas/
              Affirmation); Morning/Night/Vent each already have their own
              dedicated "notes" card above (bound to the same `notes` state),
              and Freestyle is just the bare title + body canvas above. */}
          {variant === 'simple' && (
            <SectionCard title="Additional Notes" subtitle="Anything else you want to add?">
              <TextArea value={notes} onChange={setNotes} placeholder="Add any other details, insights or feelings…" showCount={false} />
            </SectionCard>
          )}

          {/* Attachments — Guided/Simple modes don't have their own canvas
              (that's Freestyle-only via JournalCanvas), so photos/videos
              picked from the bottom attach button show here instead. */}
          {!(mode === 'freestyle' && variant !== 'simple') && attachments.length > 0 && (
            <SectionCard title="Attachments" subtitle="Photos and videos added to this entry">
              <AttachmentGrid
                items={attachments}
                onPressImage={url => setImagePreview({ url, isVid: false })}
                onPressVideo={url => setImagePreview({ url, isVid: true })}
                onPressScribble={pageId => navigation.navigate('Scribble', { entryId: eid, pageId })}
                onRemove={removeAttachment}
              />
            </SectionCard>
          )}
        </ScrollView>

        {/* Toolbar + Save bar live inside the same KeyboardAvoidingView as the
            ScrollView so they shift up together and dock flush above the
            keyboard, instead of sitting fixed at the screen bottom with a
            gap underneath the keyboard. */}
        {mode === 'freestyle' && variant !== 'simple' && (
          <FreestyleToolbar
            onSticker={() => setStickerPickerOpen(true)}
            onTextStyle={() => setTextStyleOpen(true)}
            onBullets={insertBullet}
            onScribble={openScribble}
            onTag={() => setTagPickerOpen(true)}
            onTheme={() => setThemePickerOpen(true)}
            onPhoto={pickPhoto}
            onVideo={pickVideo}
          />
        )}
        {/* Freestyle's Save now lives up top next to the journal type name,
            and Photo/Video attach directly from the toolbar — so the bottom
            bar (with its paperclip) is only needed for Guided/other modes. */}
        {!(mode === 'freestyle' && variant !== 'simple') && (
          <BottomSaveBar saveLabel={saveLabel} onSave={onSave} onAttach={() => setAttachOpen(true)} />
        )}
      </KeyboardAvoidingView>

      <MoodPickerSheet
        visible={moodPickerOpen}
        value={mood}
        onSelect={m => { setMood(m); setMoodPickerOpen(false); }}
        onClose={() => setMoodPickerOpen(false)}
      />
      <StickerPickerSheet
        visible={stickerPickerOpen}
        onSelect={addSticker}
        onClose={() => setStickerPickerOpen(false)}
      />
      <TextStylePickerSheet
        visible={textStyleOpen}
        fontSize={fontSize} textColor={textColor}
        onChangeSize={setFontSize} onChangeColor={setTextColor}
        bold={bold} italic={italic} underline={underline} textAlign={textAlign}
        onToggleBold={() => setBold(b => !b)}
        onToggleItalic={() => setItalic(i => !i)}
        onToggleUnderline={() => setUnderline(u => !u)}
        onChangeAlign={setTextAlign}
        onClose={() => setTextStyleOpen(false)}
      />
      <ThemePickerSheet
        visible={themePickerOpen}
        value={theme}
        onSelect={t => { setTheme(t); setThemePickerOpen(false); }}
        onClose={() => setThemePickerOpen(false)}
      />
      <TagPickerSheet
        visible={tagPickerOpen}
        tags={tags} important={important}
        onChangeTags={setTags} onChangeImportant={setImportant}
        onClose={() => setTagPickerOpen(false)}
      />
      <AttachTooltip
        visible={attachOpen}
        onPhoto={pickPhoto}
        onVideo={pickVideo}
        onClose={() => setAttachOpen(false)}
      />

      {/* Full-screen preview for a tapped photo/video — same modal pattern as
          EntryDetailScreen, so tapping an image mid-edit behaves exactly like
          tapping it in the read-only view. */}
      <Modal visible={!!imagePreview} transparent animationType="fade">
        <View style={s.prevOver}>
          {imagePreview ? (
            imagePreview.isVid
              ? <Video source={{ uri: imagePreview.url }} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode={ResizeMode.CONTAIN} shouldPlay useNativeControls />
              : <Image source={{ uri: imagePreview.url }} style={[s.prevImg,{width:winW,height:winH*0.8}]} resizeMode="contain" />
          ) : null}
          <TouchableOpacity style={s.prevClose} onPress={() => setImagePreview(null)}>
            <Text style={s.prevCloseT}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Inline textarea with optional char counter ──
function TextArea({ value, onChange, placeholder, showCount = true }:
  { value: string; onChange: (v: string) => void; placeholder: string; showCount?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[ta.wrap, { borderColor: colors.border }]}>
      <TextInput
        style={[ta.input, { color: colors.textPrimary, fontFamily: 'DMSans-Regular' }]}
        placeholder={placeholder} placeholderTextColor={colors.textMuted}
        value={value} onChangeText={onChange} multiline textAlignVertical="top" maxLength={showCount ? 1000 : undefined}
      />
      {showCount && <AppText variant="caption" color={colors.textMuted} align="right">{value.length}/1000</AppText>}
    </View>
  );
}

const ta = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  input: { fontSize: 15, lineHeight: 22, minHeight: 90 },
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  topToggleRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  titleField: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14 },
  titleInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  sparkle: { fontSize: 16, color: '#7C4DFF' },

  hashRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  hashChip: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },

  // Freestyle canvas — old WriteEntryScreen look: big date+mood row, then a
  // themed "write area" card holding title/divider/body/auto-tagged row.
  scrollContent: { paddingBottom: 24 },
  canvas: { flex: 1, position: 'relative', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  topSaveBtn: { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  writeArea: { flex: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, marginBottom: Spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleInputFlex: { flex: 1 },
  moodBubbleSm: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  plainTitle: { fontSize: 20, fontWeight: '800', paddingVertical: Spacing.xs },
  bodyWrap: { flex: 1, minHeight: 200 },
  plainBody: { flex: 1, fontSize: 16, lineHeight: 24, paddingTop: 0, minHeight: 200 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  tagChip: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  detRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  detChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  // Full-screen image/video preview overlay (matches EntryDetailScreen).
  prevOver: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  prevImg: {},
  prevClose: { position: 'absolute', top: 50, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  prevCloseT: { fontSize: 18, color: '#FFF' },
});
