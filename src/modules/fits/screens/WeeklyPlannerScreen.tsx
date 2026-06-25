import React, { useState } from 'react';
import {
  View, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { usePlanner, useOutfits, useWardrobe } from '../hooks/useFits';
import { PlannerDayCell } from '../components/PlannerDayCell';
import { OutfitCard }     from '../components/OutfitCard';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppEmptyState }  from '../../../shared/components/AppEmptyState';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { Outfit }         from '../types';

type Props = NativeStackScreenProps<any, 'WeeklyPlanner'>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function WeeklyPlannerScreen({ navigation }: Props) {
  const { weekDates, entryForDate, planOutfit, clearDay } = usePlanner();
  const { outfits, resolveItems } = useOutfits();
  const { wardrobe } = useWardrobe();

  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPicker,   setShowPicker]   = useState(false);

  const openPicker = (date: string) => {
    setSelectedDate(date);
    setShowPicker(true);
  };

  const pickOutfit = async (outfit: Outfit) => {
    if (!selectedDate) return;
    await planOutfit(selectedDate, outfit.id);
    setShowPicker(false);
  };

  const clearSelected = async () => {
    if (!selectedDate) return;
    await clearDay(selectedDate);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Planner</AppText>
          <AppText variant="caption" color={Colors.textMuted}>This week's outfits</AppText>
        </View>
        <AppButton
          label="Build outfit"
          onPress={() => navigation.navigate('OutfitBuilder', {})}
          variant="ghost"
          size="sm"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Weekly grid — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.weekRow}
        >
          {weekDates.map(date => {
            const entry  = entryForDate(date);
            const outfit = entry?.outfitId ? outfits.find(o => o.id === entry.outfitId) ?? null : null;
            const items  = outfit ? resolveItems(outfit) : [];
            return (
              <PlannerDayCell
                key={date}
                date={date}
                outfit={outfit}
                items={items}
                isToday={date === today}
                onPress={() => openPicker(date)}
              />
            );
          })}
        </ScrollView>

        {/* Day detail — show today's planned outfit */}
        <View style={s.todaySection}>
          <AppText variant="headingSmall" color={Colors.textPrimary}>Today</AppText>
          {(() => {
            const entry  = entryForDate(today);
            const outfit = entry?.outfitId ? outfits.find(o => o.id === entry.outfitId) ?? null : null;
            if (!outfit) {
              return (
                <AppEmptyState
                  emoji="📅"
                  title="No outfit planned today"
                  subtitle="Tap a day in the planner above to assign an outfit."
                  actionLabel="Plan today"
                  onAction={() => openPicker(today)}
                />
              );
            }
            return (
              <OutfitCard
                outfit={outfit}
                items={resolveItems(outfit)}
                onPress={() => navigation.navigate('OutfitDetail', { outfitId: outfit.id })}
              />
            );
          })()}
        </View>

        {/* Upcoming days list */}
        <AppText variant="headingSmall" color={Colors.textPrimary} style={s.upcomingTitle}>
          Coming up
        </AppText>
        {weekDates.slice(1).map(date => {
          const entry  = entryForDate(date);
          const outfit = entry?.outfitId ? outfits.find(o => o.id === entry.outfitId) ?? null : null;
          return (
            <TouchableOpacity
              key={date}
              style={s.dayRow}
              onPress={() => openPicker(date)}
              activeOpacity={0.8}
            >
              <View style={s.dayLabel}>
                <AppText variant="headingSmall" color={Colors.textPrimary}>
                  {formatFullDate(date)}
                </AppText>
                {outfit && (
                  <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                    {outfit.name}
                  </AppText>
                )}
              </View>
              <AppText style={{ fontSize: 22 }}>{outfit ? '👗' : '+'}</AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Outfit picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <AppText variant="headingMedium" color={Colors.textPrimary}>
                {selectedDate ? formatFullDate(selectedDate) : 'Pick outfit'}
              </AppText>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <AppText variant="headingSmall" color={Colors.textMuted}>✕</AppText>
              </TouchableOpacity>
            </View>

            {entryForDate(selectedDate ?? '')?.outfitId && (
              <TouchableOpacity onPress={clearSelected} style={s.clearBtn}>
                <AppText variant="bodySmall" color={Colors.error}>🗑️ Remove outfit for this day</AppText>
              </TouchableOpacity>
            )}

            {outfits.length === 0 ? (
              <AppEmptyState
                emoji="👗"
                title="No outfits yet"
                subtitle="Build an outfit first, then assign it to a day."
                actionLabel="Build outfit"
                onAction={() => { setShowPicker(false); navigation.navigate('OutfitBuilder', {}); }}
              />
            ) : (
              <FlatList
                data={outfits}
                keyExtractor={o => o.id}
                numColumns={2}
                columnWrapperStyle={{ gap: Spacing.sm }}
                contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 40 }}
                renderItem={({ item }) => (
                  <View style={{ flex: 1 }}>
                    <OutfitCard
                      outfit={item}
                      items={resolveItems(item)}
                      onPress={() => pickOutfit(item)}
                    />
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  scroll:         { gap: Spacing.base, paddingBottom: 40 },
  weekRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: 10,
  },
  todaySection:   { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  upcomingTitle:  { paddingHorizontal: Spacing.base, marginTop: Spacing.sm },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  dayLabel:       { flex: 1, gap: 2 },
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.base,
    maxHeight: '80%',
    gap: Spacing.sm,
  },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearBtn: {
    backgroundColor: Colors.error + '12',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
});
