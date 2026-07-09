import React, { useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }         from '../../../store';
import {
  useMoodTracker, useSleepTracker, useHabitTracker,
  usePeriodTracker, useHealthTracker, useExpenseTracker,
  useMilestones,
} from '../hooks/useTrackers';
import { AppText }           from '../../../shared/components/AppText';
import { AppCard }           from '../../../shared/components/AppCard';
import { AppTopNav }         from '../../../shared/components/AppTopNav';
import { Colors }            from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { MOOD_OPTIONS }      from '../components/MoodSelector';

type Props = NativeStackScreenProps<any, 'TrackersHome'>;

interface TrackerTileProps {
  emoji:    string;
  title:    string;
  value:    string;
  subtitle: string;
  color:    string;
  onPress:  () => void;
}

function TrackerTile({ emoji, title, value, subtitle, color, onPress }: TrackerTileProps) {
  return (
    <TouchableOpacity
      style={[tile.card, { borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[tile.iconWrap, { backgroundColor: color + '15' }]}>
        <AppText style={{ fontSize: 26 }}>{emoji}</AppText>
      </View>
      <AppText variant="label" color={Colors.textMuted}>{title}</AppText>
      <AppText variant="headingMedium" color={color}>{value}</AppText>
      <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>{subtitle}</AppText>
    </TouchableOpacity>
  );
}

const tile = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 5,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export function TrackersHomeScreen({ navigation }: Props) {
  const user               = useSelector((s: RootState) => s.auth.user);
  const { todayEntry: todayMood, avgMood } = useMoodTracker();
  const { avgHours }       = useSleepTracker();
  const { habits, todayCompleted } = useHabitTracker();
  const { activePeriod, prediction } = usePeriodTracker();
  const { todayEntry: todayHealth } = useHealthTracker();
  const { totalMonth }     = useExpenseTracker();
  const { milestones, checkAndAward } = useMilestones();

  useEffect(() => { checkAndAward(); }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const todayMoodOpt = MOOD_OPTIONS.find(o => o.level === todayMood?.mood);

  const daysToNext = prediction.nextStart
    ? Math.ceil((new Date(prediction.nextStart).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top nav — identical on every feature's home screen */}
      <AppTopNav active="goals" />

      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Trackers</AppText>
          <AppText variant="caption" color={Colors.textMuted}>How are you doing, {firstName}?</AppText>
        </View>
        <TouchableOpacity
          style={s.insightsBtn}
          onPress={() => navigation.navigate('InsightsDashboard')}
        >
          <AppText style={{ fontSize: 18 }}>💡</AppText>
          <AppText variant="caption" color={Colors.trackers} style={{ fontFamily: 'DMSans-Bold' }}>
            Insights
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Today quick-log prompt */}
        {!todayMood && (
          <TouchableOpacity
            style={s.logPrompt}
            onPress={() => navigation.navigate('MoodTracker')}
            activeOpacity={0.85}
          >
            <AppText style={{ fontSize: 28 }}>😊</AppText>
            <View style={{ flex: 1 }}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>Log today's mood</AppText>
              <AppText variant="caption" color={Colors.textMuted}>How are you feeling right now?</AppText>
            </View>
            <AppText style={{ fontSize: 20, color: Colors.textLight }}>›</AppText>
          </TouchableOpacity>
        )}

        {/* Tracker grid 2×3 */}
        <View style={s.grid}>
          <View style={s.gridRow}>
            <TrackerTile
              emoji="😊" title="Mood"
              value={todayMoodOpt ? todayMoodOpt.emoji : avgMood ? `${avgMood}/5` : '—'}
              subtitle={todayMoodOpt ? todayMoodOpt.label : 'Tap to log'}
              color="#FF7043"
              onPress={() => navigation.navigate('MoodTracker')}
            />
            <TrackerTile
              emoji="😴" title="Sleep"
              value={avgHours ? `${avgHours}h` : '—'}
              subtitle="7-day avg"
              color="#7B1FA2"
              onPress={() => navigation.navigate('SleepTracker')}
            />
          </View>
          <View style={s.gridRow}>
            <TrackerTile
              emoji="✅" title="Habits"
              value={habits.length > 0 ? `${todayCompleted}/${habits.length}` : '—'}
              subtitle="Today"
              color={Colors.trackers}
              onPress={() => navigation.navigate('HabitTracker')}
            />
            <TrackerTile
              emoji="🌸" title="Period"
              value={activePeriod ? 'Active' : daysToNext !== null ? `${daysToNext}d` : '—'}
              subtitle={activePeriod ? 'Period ongoing' : daysToNext !== null ? 'until next cycle' : 'Tap to log'}
              color="#E91E63"
              onPress={() => navigation.navigate('PeriodTracker')}
            />
          </View>
          <View style={s.gridRow}>
            <TrackerTile
              emoji="💪" title="Health"
              value={todayHealth?.steps ? `${(todayHealth.steps / 1000).toFixed(1)}k` : '—'}
              subtitle="Steps today"
              color={Colors.info}
              onPress={() => navigation.navigate('HealthTracker')}
            />
            <TrackerTile
              emoji="💸" title="Expenses"
              value={totalMonth > 0 ? `₹${(totalMonth / 1000).toFixed(1)}k` : '—'}
              subtitle="This month"
              color={Colors.warning}
              onPress={() => navigation.navigate('ExpenseTracker')}
            />
          </View>
        </View>

        {/* Milestones strip */}
        {milestones.length > 0 && (
          <TouchableOpacity
            style={s.milestonesStrip}
            onPress={() => navigation.navigate('Milestones')}
            activeOpacity={0.85}
          >
            <AppText style={{ fontSize: 20 }}>🏆</AppText>
            <AppText variant="body" color={Colors.textPrimary} style={{ flex: 1 }}>
              {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} earned
            </AppText>
            <AppText variant="caption" color={Colors.primary}>View all →</AppText>
          </TouchableOpacity>
        )}

        {/* Quick nav */}
        <View style={s.quickNav}>
          {[
            { label: 'Progress', emoji: '📈', screen: 'Progress' },
            { label: 'Insights', emoji: '💡', screen: 'InsightsDashboard' },
            { label: 'Milestones', emoji: '🏆', screen: 'Milestones' },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={s.quickNavBtn}
              onPress={() => navigation.navigate(item.screen)}
            >
              <AppText style={{ fontSize: 22 }}>{item.emoji}</AppText>
              <AppText variant="caption" color={Colors.textSecondary}>{item.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  insightsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.trackers + '15',
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.trackers + '40',
  },
  scroll:      { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  logPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.base, borderWidth: 1.5,
    borderColor: '#FF7043' + '40', ...Shadows.sm,
  },
  grid:     { gap: Spacing.sm },
  gridRow:  { flexDirection: 'row', gap: Spacing.sm },
  milestonesStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.premiumLight,
    borderRadius: Radius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.premium + '40',
  },
  quickNav: { flexDirection: 'row', gap: Spacing.sm },
  quickNavBtn: {
    flex: 1, alignItems: 'center', gap: 5,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
});
