// GuidedPreview — read-only Q&A rendering of a guided journal entry, driven by
// the structured `guidedData` snapshot (not the flattened body). Each question
// is a light-grey heading; the person's answer sits below it in normal black —
// feelings as emoji, chip answers as emoji pills, to-do/gratitude as bullet
// lists, intensity as a small bar. Matches the reference screenshot.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { JournalEntry } from '../../types';
import {
  EMOTIONS, DREAM_EMOTIONS, NIGHT_MOODS, TRIGGERS, NEEDS, PLACES,
  DREAM_DETAILS, AFFIRMATIONS, SYMBOLS, PEOPLE, ChipDef,
} from './guidedConfig';

const GREY = '#9AA0A6';
const BLACK = '#141414';

interface TaskItem { text: string; done?: boolean; }

function chipOf(defs: { key: string; label: string; emoji?: string }[], custom: ChipDef[], key: string) {
  return [...defs, ...custom].find(d => d.key === key) ?? { key, label: key, emoji: '' };
}

// One question + answer pair.
function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.question}>{q}</Text>
      {children}
    </View>
  );
}

function Para({ text }: { text: string }) {
  return <Text style={s.answer}>{text}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={s.bullets}>
      {items.map((t, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={[s.answer, s.bulletText]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function EmojiPills({ items }: { items: { label: string; emoji?: string }[] }) {
  return (
    <View style={s.pillWrap}>
      {items.map((it, i) => (
        <View key={i} style={s.pill}>
          {!!it.emoji && <Text style={s.pillEmoji}>{it.emoji}</Text>}
          <Text style={s.pillLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Feelings({ items }: { items: { label: string; emoji?: string }[] }) {
  // Show the chosen feeling(s) as their emoji (large), like the screenshot.
  const withEmoji = items.filter(i => i.emoji);
  const withoutEmoji = items.filter(i => !i.emoji);
  return (
    <View>
      {withEmoji.length > 0 && (
        <View style={s.feelingRow}>
          {withEmoji.map((it, i) => <Text key={i} style={s.feelingEmoji}>{it.emoji}</Text>)}
        </View>
      )}
      {withoutEmoji.length > 0 && <EmojiPills items={withoutEmoji} />}
    </View>
  );
}

export function GuidedPreview({ entry, dateLabel }: { entry: JournalEntry; dateLabel?: string }) {
  const g: Record<string, any> = entry.guidedData ?? {};
  const cat = entry.category;

  const emotions: string[] = g.emotions ?? [];
  const cFeel: ChipDef[] = g.customFeelings ?? [];
  const feelingDefs = cat === 'dream' ? DREAM_EMOTIONS : cat === 'night' ? NIGHT_MOODS : EMOTIONS;
  const feelingItems = emotions.map(k => chipOf(feelingDefs, cFeel, k));

  const taskTexts = (arr: TaskItem[] = []) => arr.map(t => (t?.text ?? '').trim()).filter(Boolean);
  const strList = (arr: string[] = []) => arr.map(x => x.trim()).filter(Boolean);

  return (
    <View style={s.wrap}>
      {!!dateLabel && <Text style={s.date}>{dateLabel}</Text>}

      {cat === 'morning' && (
        <>
          {feelingItems.length > 0 && <QA q="How are you feeling this morning?"><Feelings items={feelingItems} /></QA>}
          {!!g.manifestation?.trim() && <QA q="What are you manifesting?"><Para text={g.manifestation.trim()} /></QA>}
          {taskTexts(g.todos).length > 0 && <QA q="What's On Your To-Do List Today?"><Bullets items={taskTexts(g.todos)} /></QA>}
          {(g.affirmations ?? []).length > 0 && (
            <QA q="Affirmations For Today">
              <Bullets items={(g.affirmations as string[]).map(k => chipOf(AFFIRMATIONS, g.customAffirmations ?? [], k).label)} />
            </QA>
          )}
          {!!g.notes?.trim() && <QA q="Anything On Your Mind?"><Para text={g.notes.trim()} /></QA>}
        </>
      )}

      {cat === 'night' && (
        <>
          {feelingItems.length > 0 && <QA q="How are you feeling tonight?"><Feelings items={feelingItems} /></QA>}
          {strList(g.gratitudeTexts).length > 0 && <QA q="What Are You Grateful For Today?"><Bullets items={strList(g.gratitudeTexts)} /></QA>}
          {taskTexts(g.gratitudeTasks).length > 0 && <QA q="Grateful for (tasks)"><Bullets items={taskTexts(g.gratitudeTasks)} /></QA>}
          {!!g.notes?.trim() && <QA q="Anything You Want To Let Go Or Note Down?"><Para text={g.notes.trim()} /></QA>}
        </>
      )}

      {cat === 'vent' && (
        <>
          {!!g.mainText?.trim() && <QA q="What's On Your Mind Right Now?"><Para text={g.mainText.trim()} /></QA>}
          {feelingItems.length > 0 && <QA q="How are you feeling right now?"><Feelings items={feelingItems} /></QA>}
          {(g.triggers ?? []).length > 0 && (
            <QA q="What triggered this?">
              <EmojiPills items={(g.triggers as string[]).map(k => chipOf(TRIGGERS, g.customTriggers ?? [], k))} />
            </QA>
          )}
          {typeof g.intensity === 'number' && (
            <QA q="How intense is this feeling">
              <View style={s.intensityRow}>
                <View style={s.intensityTrack}><View style={[s.intensityFill, { width: `${(g.intensity / 10) * 100}%` }]} /></View>
                <Text style={s.intensityNum}>{g.intensity}/10</Text>
              </View>
            </QA>
          )}
          {(g.needs ?? []).length > 0 && (
            <QA q="What do you need right now?">
              <EmojiPills items={(g.needs as string[]).map(k => chipOf(NEEDS, [], k))} />
            </QA>
          )}
          {!!g.notes?.trim() && <QA q="Is there anything you want to let go of?"><Para text={g.notes.trim()} /></QA>}
        </>
      )}

      {cat === 'dream' && (
        <>
          {!!g.mainText?.trim() && <QA q="What was your dream?"><Para text={g.mainText.trim()} /></QA>}
          {feelingItems.length > 0 && <QA q="How did you feel?"><Feelings items={feelingItems} /></QA>}
          {(g.dreamDetails ?? []).length > 0 && (
            <QA q="Dream details">
              <EmojiPills items={(g.dreamDetails as string[]).map(k => chipOf(DREAM_DETAILS, [], k))} />
            </QA>
          )}
          {(g.dreamPlaces ?? []).length > 0 && (
            <QA q="Where did it happen?">
              <EmojiPills items={(g.dreamPlaces as string[]).map(k => chipOf(PLACES, g.customPlaces ?? [], k))} />
            </QA>
          )}
          {(g.people ?? []).length > 0 && (
            <QA q="People In Dream">
              <EmojiPills items={(g.people as string[]).map(k => chipOf(PEOPLE, g.customPeople ?? [], k))} />
            </QA>
          )}
          {(g.symbols ?? []).length > 0 && (
            <QA q="What symbols stood out in your dream?">
              <EmojiPills items={(g.symbols as string[]).map(k => chipOf(SYMBOLS, g.customSymbols ?? [], k))} />
            </QA>
          )}
        </>
      )}

      {!!g.notes?.trim() && cat !== 'morning' && cat !== 'night' && cat !== 'vent' && (
        <QA q="Notes"><Para text={g.notes.trim()} /></QA>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 8 },
  date: { fontFamily: 'DMSans-Bold', fontSize: 20, color: BLACK, marginBottom: 18 },
  block: { marginBottom: 20 },
  question: { fontFamily: 'DMSans-Regular', fontSize: 15, color: GREY, marginBottom: 8 },
  answer: { fontFamily: 'DMSans-Regular', fontSize: 16, lineHeight: 24, color: BLACK },
  bullets: { gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { fontSize: 16, lineHeight: 24, color: BLACK },
  bulletText: { flex: 1 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E4E4E4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillEmoji: { fontSize: 14 },
  pillLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: BLACK },
  feelingRow: { flexDirection: 'row', gap: 10 },
  feelingEmoji: { fontSize: 30 },
  intensityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  intensityTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EAEAEA', overflow: 'hidden' },
  intensityFill: { height: 6, borderRadius: 3, backgroundColor: BLACK },
  intensityNum: { fontFamily: 'DMSans-Bold', fontSize: 14, color: BLACK },
});
