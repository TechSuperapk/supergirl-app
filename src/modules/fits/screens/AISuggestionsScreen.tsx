import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useSelector }   from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }        from '../../../store';
import { useAIStylist, useOutfits } from '../hooks/useFits';
import { AISuggestionCard } from '../components/AISuggestionCard';
import { AppText }          from '../../../shared/components/AppText';
import { AppButton }        from '../../../shared/components/AppButton';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppEmptyState }    from '../../../shared/components/AppEmptyState';
import { AppHeader }        from '../../../shared/components/AppHeader';
import { Colors }           from '../../../shared/theme/colors';
import { Spacing, Radius }  from '../../../shared/theme/spacing';
import { FontFamily }       from '../../../shared/theme/typography';
import { useWardrobe }      from '../hooks/useFits';
import { AISuggestion }     from '../types';

type Props = NativeStackScreenProps<any, 'AISuggestions'>;

const OCCASIONS = ['Any', 'Casual', 'Work', 'Date', 'Party', 'Gym', 'Formal'];
const WEATHERS  = ['Any', 'Hot', 'Mild', 'Cold', 'Rainy'];

export function AISuggestionsScreen({ navigation }: Props) {
  const { wardrobe }    = useWardrobe();
  const { suggestions, loading, insight, error, generate } = useAIStylist();
  const { createOutfit, resolveItems } = useOutfits();

  const [occasion, setOccasion] = useState('Any');
  const [weather,  setWeather]  = useState('Any');

  const handleGenerate = () => {
    generate(
      occasion === 'Any' ? undefined : occasion.toLowerCase(),
      weather  === 'Any' ? undefined : weather.toLowerCase(),
    );
  };

  const handleSaveOutfit = async (ids: string[], name: string) => {
    await createOutfit(name, ids, ['AI Generated']);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="AI Stylist"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.fits}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Wardrobe count */}
        <View style={s.wardrobeChip}>
          <AppText style={{ fontSize: 20 }}>👗</AppText>
          <AppText variant="body" color={Colors.textSecondary}>
            {wardrobe.length} item{wardrobe.length !== 1 ? 's' : ''} in your wardrobe
          </AppText>
        </View>

        {/* Insight */}
        {!!insight && (
          <View style={s.insightCard}>
            <AppText style={{ fontSize: 20 }}>💡</AppText>
            <AppText variant="bodySmall" color={Colors.textSecondary} style={{ flex: 1, lineHeight: 20 }}>
              {insight}
            </AppText>
          </View>
        )}

        {/* Filters */}
        <View style={s.filters}>
          <AppText variant="label" color={Colors.textMuted} style={s.filterLabel}>Occasion</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {OCCASIONS.map(occ => (
              <TouchableOpacity
                key={occ}
                style={[s.chip, occasion === occ && s.chipActive]}
                onPress={() => setOccasion(occ)}
              >
                <AppText
                  variant="caption"
                  color={occasion === occ ? Colors.white : Colors.textSecondary}
                  style={{ fontFamily: occasion === occ ? FontFamily.bold : FontFamily.regular }}
                >
                  {occ}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <AppText variant="label" color={Colors.textMuted} style={s.filterLabel}>Weather</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {WEATHERS.map(w => (
              <TouchableOpacity
                key={w}
                style={[s.chip, weather === w && s.chipActive]}
                onPress={() => setWeather(w)}
              >
                <AppText
                  variant="caption"
                  color={weather === w ? Colors.white : Colors.textSecondary}
                  style={{ fontFamily: weather === w ? FontFamily.bold : FontFamily.regular }}
                >
                  {w === 'Hot' ? '☀️ Hot' : w === 'Cold' ? '🥶 Cold' : w === 'Rainy' ? '🌧️ Rainy' : w === 'Mild' ? '⛅ Mild' : w}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Generate button */}
        <AppButton
          label={loading ? 'Styling you…' : '✨ Generate Outfits'}
          onPress={handleGenerate}
          loading={loading}
          disabled={wardrobe.length < 3}
          variant="primary"
          size="lg"
          fullWidth
          style={{ backgroundColor: Colors.fits }}
        />

        {wardrobe.length < 3 && (
          <AppText variant="caption" color={Colors.textMuted} align="center">
            Add at least 3 items to your wardrobe to unlock AI suggestions.
          </AppText>
        )}

        {/* Error */}
        {!!error && (
          <View style={s.errorCard}>
            <AppText variant="bodySmall" color={Colors.error}>⚠️  {error}</AppText>
          </View>
        )}

        {/* Loading skeleton */}
        {loading && (
          <View style={s.loadingCard}>
            <AppLoadingSpinner message="Your AI stylist is reviewing your wardrobe…" color={Colors.fits} />
          </View>
        )}

        {/* Suggestions */}
        {!loading && suggestions.length > 0 && (
          <View style={s.suggestionsSection}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>
              Your outfits ✨
            </AppText>
            {suggestions.map((s_item: AISuggestion) => {
              const items = s_item.outfitItemIds
                .map((id: string) => wardrobe.find(w => w.id === id))
                .filter(Boolean) as any[];
              return (
                <AISuggestionCard
                  key={s_item.id}
                  suggestion={s_item}
                  items={items}
                  onSaveOutfit={handleSaveOutfit}
                />
              );
            })}
          </View>
        )}

        {!loading && suggestions.length === 0 && wardrobe.length >= 3 && (
          <AppEmptyState
            emoji="✨"
            title="Let AI style you"
            subtitle="Tap Generate to get 3 personalized outfit ideas from your wardrobe."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  wardrobeChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.fits + '10',
    borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.fits + '30',
  },
  filters:    { gap: 8 },
  filterLabel:{ marginBottom: 2 },
  chips:      { gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.fits, borderColor: Colors.fits },
  errorCard: {
    backgroundColor: Colors.error + '12',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  loadingCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg, padding: Spacing['2xl'],
    alignItems: 'center',
  },
  suggestionsSection: { gap: Spacing.md },
});
