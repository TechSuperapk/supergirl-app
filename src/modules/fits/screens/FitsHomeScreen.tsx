import React from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector }  from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useWardrobe, useOutfits, usePlanner } from '../hooks/useFits';
import { OutfitCard }    from '../components/OutfitCard';
import { AppText }       from '../../../shared/components/AppText';
import { AppCard }       from '../../../shared/components/AppCard';
import { AppEmptyState } from '../../../shared/components/AppEmptyState';
import { AppTopNav }     from '../../../shared/components/AppTopNav';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';

type Props = NativeStackScreenProps<any, 'FitsHome'>;

function StatCard({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <View style={[stat.card, { borderColor: color + '40' }]}>
      <AppText style={{ fontSize: 28 }}>{emoji}</AppText>
      <AppText variant="headingLarge" color={color}>{value}</AppText>
      <AppText variant="caption" color={Colors.textMuted} align="center">{label}</AppText>
    </View>
  );
}

const stat = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
});

function QuickAction({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={qa.btn} onPress={onPress} activeOpacity={0.8}>
      <AppText style={{ fontSize: 26 }}>{emoji}</AppText>
      <AppText variant="caption" color={Colors.textSecondary} align="center" numberOfLines={2}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const qa = StyleSheet.create({
  btn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
});

export function FitsHomeScreen({ navigation }: Props) {
  const user         = useSelector((s: RootState) => s.auth.user);
  const { wardrobe } = useWardrobe();
  const { outfits, resolveItems } = useOutfits();
  const { entryForDate } = usePlanner();

  const today      = new Date().toISOString().split('T')[0];
  const todayEntry = entryForDate(today);
  const todayOutfit = todayEntry?.outfitId
    ? outfits.find(o => o.id === todayEntry.outfitId) ?? null
    : null;

  const firstName  = user?.name?.split(' ')[0] ?? 'there';
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const categories = [...new Set(wardrobe.map(i => i.category))].length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top nav — identical on every feature's home screen */}
      <AppTopNav active="fits" />

      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Fits</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {greeting}, {firstName} 👗
          </AppText>
        </View>
        <TouchableOpacity
          style={s.aiBtn}
          onPress={() => navigation.navigate('AISuggestions')}
        >
          <AppText style={{ fontSize: 18 }}>✨</AppText>
          <AppText variant="caption" color={Colors.fits} style={{ fontFamily: 'DMSans-Bold' }}>
            AI Stylist
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard emoji="👚" value={wardrobe.length} label="Items"    color={Colors.fits} />
          <StatCard emoji="💃" value={outfits.length}  label="Outfits"  color={Colors.primary} />
          <StatCard emoji="🗂️" value={categories}      label="Categories" color={Colors.trackers} />
        </View>

        {/* Today's outfit */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>Today's Outfit</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('WeeklyPlanner')}>
              <AppText variant="caption" color={Colors.primary}>Planner →</AppText>
            </TouchableOpacity>
          </View>
          {todayOutfit ? (
            <OutfitCard
              outfit={todayOutfit}
              items={resolveItems(todayOutfit)}
              onPress={() => navigation.navigate('OutfitDetail', { outfitId: todayOutfit.id })}
            />
          ) : (
            <TouchableOpacity
              style={s.emptyToday}
              onPress={() => navigation.navigate('WeeklyPlanner')}
              activeOpacity={0.8}
            >
              <AppText style={{ fontSize: 36 }}>📅</AppText>
              <AppText variant="body" color={Colors.textMuted} align="center">
                No outfit planned for today.{'\n'}Tap to plan one.
              </AppText>
              <AppText variant="bodySmall" color={Colors.fits}>Open Planner →</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick actions */}
        <View style={s.section}>
          <AppText variant="headingSmall" color={Colors.textPrimary} style={s.sectionHeader}>
            Quick Actions
          </AppText>
          <View style={s.actionsRow}>
            <QuickAction emoji="➕" label="Add clothing" onPress={() => navigation.navigate('AddClothing', {})} />
            <QuickAction emoji="💃" label="Build outfit" onPress={() => navigation.navigate('OutfitBuilder', {})} />
            <QuickAction emoji="✨" label="AI suggest"  onPress={() => navigation.navigate('AISuggestions')} />
            <QuickAction emoji="📅" label="Weekly plan" onPress={() => navigation.navigate('WeeklyPlanner')} />
          </View>
        </View>

        {/* Recent outfits */}
        {outfits.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <AppText variant="headingSmall" color={Colors.textPrimary}>Recent Outfits</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('OutfitsList')}>
                <AppText variant="caption" color={Colors.primary}>See all →</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.outfitRow}>
              {outfits.slice(0, 5).map(outfit => (
                <View key={outfit.id} style={{ width: 160 }}>
                  <OutfitCard
                    outfit={outfit}
                    items={resolveItems(outfit)}
                    onPress={() => navigation.navigate('OutfitDetail', { outfitId: outfit.id })}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {outfits.length === 0 && wardrobe.length === 0 && (
          <AppEmptyState
            emoji="👗"
            title="Start your wardrobe"
            subtitle="Add your first clothing item to begin building outfits and getting AI suggestions."
            actionLabel="Add first item"
            onAction={() => navigation.navigate('AddClothing', {})}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.fits + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.fits + '40',
  },
  scroll:       { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 40 },
  statsRow:     { flexDirection: 'row', gap: Spacing.sm },
  section:      { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsRow:   { flexDirection: 'row', gap: Spacing.sm },
  emptyToday: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  outfitRow:    { gap: Spacing.sm },
});
