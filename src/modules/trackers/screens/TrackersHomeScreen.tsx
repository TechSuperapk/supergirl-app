import React, { useState } from 'react';
import { habitsActiveOn } from '../utils/habitSchedule';
import {
  View, ScrollView, TouchableOpacity, Image, StyleSheet, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SvgProps } from 'react-native-svg';

import { RootState }   from '../../../store';
import { useHabitTracker } from '../hooks/useTrackers';
import { useHabitBuilder } from '../hooks/useHabitBuilder';
import { HabitProgressRow } from '../components/HabitProgressRow';
import { HabitActionSheet } from '../components/HabitActionSheet';
import { UpdateProgressSheet } from '../components/UpdateProgressSheet';
import PeriodIcon      from '../components/PeriodIcon';
import IntimecyIcon    from '../components/IntimecyIcon';
import BmiIcon         from '../components/BmiIcon';
import MoodIcon        from '../components/MoodIcon';
import WaterIcon       from '../components/WaterIcon';
import SleepIcon       from '../components/SleepIcon';
import ExpenseIcon     from '../components/ExpenseIcon';
import SicknessIcon    from '../components/SicknessIcon';
import MeasurementIcon from '../components/MeasurementIcon';
import { AppText }     from '../../../shared/components/AppText';
import { AppTopBar }   from '../../../shared/components/AppTopBar';
import { Colors }      from '../../../shared/theme/colors';
import { FontFamily }  from '../../../shared/theme/typography';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';

type Props = NativeStackScreenProps<any, 'TrackersHome'>;
type TabKey = 'all' | 'my' | 'group';
const SEGS: { key: TabKey; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'my',    label: 'My Habits' },
  { key: 'group', label: 'Group Habits' },
];
const todayISO = () => new Date().toISOString().split('T')[0];
const ava = (n: number) => `https://i.pravatar.cc/100?img=${n}`;

// Group habit challenges the user has already joined — shown as an "activity
// log" style card (progress bar + Pause/Update), reused on both the All tab
// preview and the full Group Habits tab. No backend yet (see module note).
/**
 * Challenges reuse the matching tracker's icon where one exists, so a Water
 * challenge reads as the Water tracker. Categories with no tracker equivalent
 * (steps, reading) fall back to an emoji. `iconBg` is the tinted circle behind
 * the icon, per the design.
 */
interface GroupChallenge {
  id: string;
  Icon?: React.ComponentType<SvgProps>;
  emoji?: string;
  iconBg: string;
  title: string;
  goal: string;              // human-readable target, e.g. "Drink 4L"
  color: string;
  /** Update-sheet config — the unit differs per category (ml / km / pages). */
  question: string;
  unit: string;
  target: number;            // in `unit`
  step: number;
  decimals: number;
  /** Format the running value for the card. */
  format: (v: number) => string;
}

const GROUP_CHALLENGES: GroupChallenge[] = [
  {
    id: 'c-water', Icon: WaterIcon, iconBg: '#E4F6FF', title: 'Water Challenge',
    goal: 'Drink 4L', color: '#02D529',
    question: 'How much water did you drink?',
    unit: 'ml', target: 4000, step: 100, decimals: 0,
    format: v => `${Math.round((v / 1000) * 10) / 10}L`,
  },
  {
    id: 'c-steps', emoji: '👟', iconBg: '#D9FCFF', title: '10k Steps',
    goal: '10k Steps', color: '#2563EB',
    question: 'How far did you walk today?',
    unit: 'km', target: 8, step: 0.5, decimals: 1,
    format: v => `${v} km`,
  },
  {
    id: 'c-read', emoji: '📚', iconBg: '#FFF2D9', title: 'Read book',
    goal: '10 Books', color: '#7A02D5',
    question: 'How many pages did you read?',
    unit: 'pages', target: 300, step: 10, decimals: 0,
    format: v => `${v} pages`,
  },
];

/** Starting progress per challenge. No backend yet — see module note. */
const INITIAL_PROGRESS: Record<string, number> = {
  'c-water': 3500,
  'c-steps': 3.2,
  'c-read': 120,
};
/** Tracker tiles — each renders its own SVG icon component. */
const ALL_TRACKERS: { Icon: React.ComponentType<SvgProps>; label: string; screen?: string }[] = [
  { Icon: PeriodIcon,      label: 'Period',   screen: 'PeriodHome' },
  { Icon: IntimecyIcon,    label: 'Intimacy', screen: 'IntimacyHome' },
  { Icon: BmiIcon,         label: 'BMI',      screen: 'BMIHome' },
  { Icon: MoodIcon,        label: 'Mood',     screen: 'MoodHome' },
  { Icon: WaterIcon,       label: 'Water',    screen: 'WaterHome' },
  { Icon: SleepIcon,       label: 'Sleep',    screen: 'SleepHome' },
  { Icon: ExpenseIcon,     label: 'Expense',  screen: 'ExpenseHome' },
  { Icon: SicknessIcon,    label: 'Sickness', screen: 'SicknessHome' },
  { Icon: MeasurementIcon, label: 'Measure',  screen: 'MeasurementHome' },
];

function ChallengeCard({
  c, wide, value, onUpdate,
}: { c: GroupChallenge; wide?: boolean; value: number; onUpdate: () => void }) {
  const { width } = useWindowDimensions();
  const pct = c.target > 0 ? Math.min(1, value / c.target) : 0;
  // On the All tab's horizontal preview, size the card relative to the
  // screen (not a fixed px) so it reads well on small phones and doesn't
  // look like a tiny sliver on tablets.
  const wideWidth = Math.min(320, Math.max(240, width * 0.72));
  return (
    <View style={[s.challengeCardFull, wide ? { width: wideWidth } : undefined]}>
      <View style={s.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.challengeIconWrap, { backgroundColor: c.iconBg }]}>
            {c.Icon
              ? <c.Icon width={30} height={30} />
              : <AppText style={{ fontSize: 20 }}>{c.emoji}</AppText>}
          </View>
          <AppText variant="headingSmall" color={Colors.textPrimary}>{c.title}</AppText>
        </View>
      </View>

      <View style={[s.rowBetween, { marginTop: 10 }]}>
        <AppText variant="caption" color={Colors.textMuted}>Today's Progress</AppText>
        <AppText variant="caption" color={Colors.textMuted}>{c.goal}</AppText>
      </View>
      <AppText variant="headingLarge" color={c.color} style={{ marginTop: 2 }}>{c.format(value)}</AppText>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: c.color }]} />
      </View>

      {/* Update only — group challenges aren't yours to pause, and the Pause
          button here never had a handler behind it. */}
      <View style={s.challengeBtnRow}>
        <TouchableOpacity style={s.updateBtn} activeOpacity={0.85} onPress={onUpdate}>
          <AppText style={{ fontSize: 13 }}>✏️</AppText>
          <AppText variant="label" color={Colors.primary}>Update</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TrackersHomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  // Cap the content column on tablets/large screens instead of letting a
  // 3-column grid and text stretch edge-to-edge; phones just get full width.
  const contentMaxWidth = Math.min(width, 640);
  const user = useSelector((s: RootState) => s.auth.user);
  const { habits, isCompleted, getProgress, logProgress, resetProgress } = useHabitTracker();
  const { pauseHabit, resumeHabit, softDeleteHabit } = useHabitBuilder();
  // Land on "All" — it's the overview, and the trackers grid lives there.
  const [tab, setTab] = useState<TabKey>('all');
  const [completedOpen, setCompletedOpen] = useState(true);
  const [pausedOpen, setPausedOpen] = useState(false);
  // Group-challenge progress is local for now — there's no backend for these yet.
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>(INITIAL_PROGRESS);
  const [updatingChallenge, setUpdatingChallenge] = useState<GroupChallenge | null>(null);
  const today = todayISO();

  // Today's habits = active, not paused, AND scheduled to occur today.
  // isHabitActiveOn also covers status/paused and the start/end window, so the
  // repeat rule finally decides what appears: a Mon/Wed/Fri habit no longer
  // shows on a Tuesday, and a "last day of the month" habit shows only then.
  const active = habitsActiveOn(habits, today);
  const inProgress = active.filter(h => !isCompleted(h.id, today));
  const completed  = active.filter(h => isCompleted(h.id, today));
  // Paused habits are excluded from `active` by isHabitActiveOn, so they're
  // pulled straight from the full list.
  const paused = habits.filter(h => h.isPaused && (h.status ?? 'active') !== 'deleted');
  const total = active.length;

  const goAdd = () => navigation.navigate('AddHabit');

  // ── Habit row handlers (tap-to-target, edit/pause/delete) ──
  const targetOf = (h: any) => (h.timesMode === 'many' ? (h.timesPerPeriod ?? 1) : 1);
  const renderHabit = (h: any, i?: number, arr?: any[]) => {
    const p = getProgress(h.id, today, targetOf(h));
    return (
      <HabitProgressRow
        key={h.id}
        habit={h}
        flat
        isLast={arr ? i === arr.length - 1 : false}
        progress={p.progress}
        target={p.target}
        completed={p.completed}
        onTap={() => logProgress(h.id, today, targetOf(h))}
        onEdit={() => navigation.navigate('AddHabit', { habitId: h.id })}
        onPause={() => (h.isPaused ? resumeHabit(h) : pauseHabit(h))}
        onDelete={() => softDeleteHabit(h)}
        onUndo={() => resetProgress(h.id, today)}
      />
    );
  };

  // "My Habits" tab uses a simpler pill-card row (outline circle + chevron for
  // in-progress, filled check + name only for completed); long-press opens the
  // same Edit/Pause/Delete/Resume bottom sheet that the "All" tab's row
  // exposes via ⋮.
  const [menuHabit, setMenuHabit] = useState<any>(null);
  const renderMyHabitRow = (h: any) => {
    const p = getProgress(h.id, today, targetOf(h));
    return (
      <TouchableOpacity key={h.id} style={s.myHabitRow} activeOpacity={0.85}
        onPress={() => logProgress(h.id, today, targetOf(h))}
        onLongPress={() => setMenuHabit(h)}>
        {p.completed
          ? <View style={s.checkDone}><AppText style={{ fontSize: 13, color: Colors.white }}>✓</AppText></View>
          : <View style={s.checkEmpty} />}
        {h.icon ? <AppText style={{ fontSize: 20 }}>{h.icon}</AppText> : null}
        <View style={{ flex: 1 }}>
          <AppText variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>{h.name}</AppText>
          {!p.completed && (
            <AppText variant="caption" color={Colors.textMuted}>
              {p.target > 1 ? `${p.progress} / ${p.target}` : (h.isPaused ? 'Paused' : 'Tap to complete')}
            </AppText>
          )}
        </View>
        {!p.completed && <AppText style={{ fontSize: 20, color: Colors.textLight }}>›</AppText>}
      </TouchableOpacity>
    );
  };

  // ── Segmented control ──
  const Segments = (
    <View style={s.segRow}>
      {SEGS.map(seg => (
        <TouchableOpacity key={seg.key} style={[s.seg, tab === seg.key && s.segActive]} onPress={() => setTab(seg.key)} activeOpacity={0.85}>
          <AppText variant="label" color={tab === seg.key ? Colors.white : Colors.textSecondary}>{seg.label}</AppText>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── MY HABITS ──
  const MyHabits = (
    <View style={{ gap: Spacing.md }}>
      <View style={s.rowBetween}>
        <AppText variant="headingLarge" color={Colors.textPrimary}>Today's Habits</AppText>
        {total ? <TouchableOpacity onPress={goAdd}><AppText variant="label" color={Colors.textLight}>Edit</AppText></TouchableOpacity> : null}
      </View>

      {total === 0 ? (
        <TouchableOpacity style={s.createBtn} activeOpacity={0.9} onPress={goAdd}>
          <AppText style={{ fontSize: 18, color: Colors.white }}>＋</AppText>
          <AppText variant="button" color={Colors.white}>Create Habit</AppText>
        </TouchableOpacity>
      ) : (
        <>
          <View>
            <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: 8, letterSpacing: 0.5 }}>IN PROGRESS</AppText>
            {inProgress.map(renderMyHabitRow)}
            {inProgress.length === 0 ? (
              <AppText variant="caption" color={Colors.textMuted} style={{ paddingVertical: 8 }}>All done for today 🎉</AppText>
            ) : null}
          </View>

          <View>
            <TouchableOpacity style={s.rowBetween} activeOpacity={0.7} onPress={() => setCompletedOpen(v => !v)}>
              <AppText variant="caption" color={Colors.success} style={{ letterSpacing: 0.5 }}>COMPLETED</AppText>
              <AppText variant="caption" color={Colors.textMuted}>{completedOpen ? '⌃' : '⌄'}</AppText>
            </TouchableOpacity>
            {completedOpen && (
              <View style={{ marginTop: 8 }}>
                {completed.length ? completed.map(renderMyHabitRow) : (
                  <AppText variant="caption" color={Colors.textMuted} style={{ paddingVertical: 8 }}>Nothing completed yet today.</AppText>
                )}
              </View>
            )}
          </View>

          {/* Paused habits sit below completed rather than disappearing —
              they're still yours, just not running, and this is where you come
              to resume one. Deleted habits stay out; they live in History. */}
          {paused.length > 0 && (
            <View>
              <TouchableOpacity style={s.rowBetween} activeOpacity={0.7} onPress={() => setPausedOpen(v => !v)}>
                <AppText variant="caption" color={Colors.warning} style={{ letterSpacing: 0.5 }}>
                  PAUSED · {paused.length}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>{pausedOpen ? '⌃' : '⌄'}</AppText>
              </TouchableOpacity>
              {pausedOpen && (
                <View style={{ marginTop: 8 }}>
                  {paused.map(renderMyHabitRow)}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );

  // ── GROUP HABITS ──
  const GroupHabits = (
    <View style={{ gap: Spacing.lg }}>
      {/* Featured challenge */}
      <View style={s.card}>
        <View style={s.rowBetween}>
          <AppText variant="headingMedium" color={Colors.textPrimary}>Girls Glow Challenge ✨</AppText>
          <View style={s.pillDark}><AppText variant="caption" color={Colors.white}>12 Days Left</AppText></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <View style={s.cluster}>
            {[45, 9, 16, 12, 33].map((n, i) => (
              <Image key={n} source={{ uri: ava(n) }} style={[s.clusterAva, { marginLeft: i === 0 ? 0 : -10 }]} />
            ))}
          </View>
          <AppText variant="body" color={Colors.textMuted}>128 Members</AppText>
        </View>
        <View style={[s.rowBetween, { marginTop: 12 }]}>
          <AppText variant="label" color={Colors.textPrimary}>🏅 You are Rank #18</AppText>
          <AppText variant="caption" color={Colors.textMuted}>620 / 1000 pts</AppText>
        </View>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: '62%', backgroundColor: Colors.black }]} /></View>
      </View>

      {/* Active challenges — activity-log style: progress + Pause/Update */}
      <View>
        <AppText variant="headingLarge" color={Colors.textPrimary} style={{ marginBottom: 10 }}>Active Challenges</AppText>
        <View style={{ gap: Spacing.md }}>
          {GROUP_CHALLENGES.map(c => (
            <ChallengeCard
              key={c.id}
              c={c}
              value={challengeProgress[c.id] ?? 0}
              onUpdate={() => setUpdatingChallenge(c)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  // ── ALL ──
  const AllTab = (
    <View style={{ gap: Spacing.lg }}>
      <View>
        <AppText style={s.sectionTitle}>Today</AppText>
        {active.length ? (
          <View style={s.todayCard}>{active.map(renderHabit)}</View>
        ) : (
          <TouchableOpacity style={s.createBtn} activeOpacity={0.9} onPress={goAdd}>
            <AppText style={{ fontSize: 18, color: Colors.white }}>＋</AppText>
            <AppText variant="button" color={Colors.white}>Create Habit</AppText>
          </TouchableOpacity>
        )}
      </View>

      <View>
        <View style={[s.rowBetween, s.sectionTitleRow]}>
          <AppText style={s.sectionTitle}>All trackers</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('AddTracker')}>
            <AppText style={s.viewMore}>View More</AppText>
          </TouchableOpacity>
        </View>
        <View style={s.grid}>
          {ALL_TRACKERS.map(({ Icon, label, screen }) => (
            <TouchableOpacity key={label} style={s.gridTile} activeOpacity={0.85}
              onPress={() => screen && navigation.navigate(screen)}>
              <Icon width={34} height={34} />
              <AppText variant="label" color={Colors.textPrimary}>{label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <View style={[s.rowBetween, s.sectionTitleRow]}>
          <AppText style={s.sectionTitle}>Group habits</AppText>
          <TouchableOpacity onPress={() => setTab('group')}>
            <AppText style={s.viewMore}>View More</AppText>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
          {GROUP_CHALLENGES.slice(0, 2).map(c => (
            <ChallengeCard
              key={c.id}
              c={c}
              wide
              value={challengeProgress[c.id] ?? 0}
              onUpdate={() => setUpdatingChallenge(c)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppTopBar onBellPress={() => {}} onMenuPress={() => {}} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}>
          {Segments}
          {tab === 'all' ? AllTab : tab === 'group' ? GroupHabits : MyHabits}
        </View>
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={goAdd} activeOpacity={0.9}>
        <AppText style={{ fontSize: 30, color: Colors.white, lineHeight: 32, marginTop: -2 }}>+</AppText>
      </TouchableOpacity>

      <UpdateProgressSheet
        visible={!!updatingChallenge}
        question={updatingChallenge?.question ?? ''}
        unit={updatingChallenge?.unit ?? ''}
        value={updatingChallenge ? (challengeProgress[updatingChallenge.id] ?? 0) : 0}
        step={updatingChallenge?.step ?? 1}
        decimals={updatingChallenge?.decimals ?? 0}
        onClose={() => setUpdatingChallenge(null)}
        onSave={next => {
          if (updatingChallenge) {
            setChallengeProgress(p => ({ ...p, [updatingChallenge.id]: next }));
          }
          setUpdatingChallenge(null);
        }}
      />

      <HabitActionSheet
        visible={!!menuHabit}
        habitName={menuHabit?.name}
        isPaused={menuHabit?.isPaused}
        // Today's numbers, so the sheet can offer Undo only when there's
        // something to undo.
        progress={menuHabit ? getProgress(menuHabit.id, today, menuHabit.targetAmount ?? 1).progress : 0}
        target={menuHabit ? getProgress(menuHabit.id, today, menuHabit.targetAmount ?? 1).target : 1}
        onClose={() => setMenuHabit(null)}
        onEdit={() => navigation.navigate('AddHabit', { habitId: menuHabit.id })}
        onPauseResume={() => (menuHabit.isPaused ? resumeHabit(menuHabit) : pauseHabit(menuHabit))}
        onDelete={() => softDeleteHabit(menuHabit)}
        onUndo={() => resetProgress(menuHabit.id, today)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 100, gap: Spacing.md },

  // ── Design tokens taken from the Goals landing spec ──
  // The shared theme caps radius at 24 and uses much softer shadows, so these
  // are local overrides rather than global token changes (which would ripple
  // through every other screen).
  segRow: { flexDirection: 'row', gap: 10, paddingVertical: Spacing.md },
  seg: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(153,153,153,0.06)' },
  segActive: { backgroundColor: '#141414' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.sm },
  /** Section headings: 24 / 600, deliberately low-contrast per the spec. */
  sectionTitle: {
    fontFamily: 'DMSans-SemiBold', fontSize: 24, color: 'rgba(0,0,0,0.20)', marginBottom: 10,
  },
  sectionTitleRow: { marginBottom: 10 },
  viewMore: { fontFamily: 'DMSans-Medium', fontSize: 16, color: 'rgba(26,26,46,0.60)' },

  /** Today list — one grouped card; rows carry their own dividers. */
  todayCard: {
    backgroundColor: Colors.white,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(153,153,153,0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 15,
    elevation: 8,
  },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.black, borderRadius: Radius.full, paddingVertical: 16, ...Shadows.sm,
  },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgInput, marginTop: 10, overflow: 'hidden' },
  progressFill:  { height: 8, borderRadius: 4, backgroundColor: '#FF6B6B' },

  checkEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.borderStrong },
  checkDone:  { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },

  // "My Habits" tab rows (simpler than the All tab's tap-to-log HabitProgressRow)
  myHabitRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    paddingVertical: 14, paddingHorizontal: Spacing.base, marginBottom: 8, ...Shadows.sm,
  },

  // Group
  pillDark: { backgroundColor: Colors.black, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  cluster: { flexDirection: 'row', alignItems: 'center' },
  clusterAva: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.white, backgroundColor: Colors.bgInput },

  // Activity-log style challenge card (Water/Steps/Read — progress + Pause/Update)
  challengeCardFull: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(153,153,153,0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
  },
  challengeIconWrap: { padding: 4, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  challengeBtnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  updateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingVertical: 10,
  },

  // space-between distributes the horizontal gaps evenly for a 3-up grid;
  // rowGap handles the vertical spacing. Mixing `gap` with space-between makes
  // the columns drift, so only rowGap is set here.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
  gridTile: {
    width: '31%', maxWidth: 150, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(153,153,153,0.20)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
  },

  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg,
    width: 70, height: 70, borderRadius: 40, backgroundColor: '#141414',
    alignItems: 'center', justifyContent: 'center', ...Shadows.lg,
  },
});
