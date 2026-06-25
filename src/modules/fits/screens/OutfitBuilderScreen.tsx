import React, { useState } from 'react';
import {
  View, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Dimensions, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useWardrobe, useOutfits, useOutfitBuilder } from '../hooks/useFits';
import { ClothingCard }    from '../components/ClothingCard';
import { CategoryFilter }  from '../components/CategoryFilter';
import { AppText }         from '../../../shared/components/AppText';
import { AppButton }       from '../../../shared/components/AppButton';
import { AppHeader }       from '../../../shared/components/AppHeader';
import { AppEmptyState }   from '../../../shared/components/AppEmptyState';
import { Colors }          from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { FontFamily }      from '../../../shared/theme/typography';
import { ClothingItem, ClothingCategory } from '../types';

type Props = NativeStackScreenProps<any, 'OutfitBuilder'>;

const { width: SCREEN_W } = Dimensions.get('window');
const COLS   = 3;
const ITEM_W = (SCREEN_W - Spacing.base * 2 - Spacing.sm * 2) / COLS;

export function OutfitBuilderScreen({ route, navigation }: Props) {
  const { outfitId } = (route.params ?? {}) as { outfitId?: string };

  const { filtered, activeCategory, setActiveCategory } = useWardrobe();
  const { outfits, createOutfit, editOutfit } = useOutfits();
  const existing = outfits.find(o => o.id === outfitId);

  const { selectedIds, selectedItems, toggle, clear, isValid } =
    useOutfitBuilder(existing?.clothingItemIds ?? []);

  const [outfitName, setOutfitName] = useState(existing?.name ?? '');
  const [occasion,   setOccasion]   = useState(existing?.occasion ?? '');
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const OCCASIONS = ['Casual', 'Work', 'Date', 'Party', 'Gym', 'Formal', 'Travel'];

  const handleSave = async () => {
    if (!outfitName.trim()) { Alert.alert('Name required', 'Give your outfit a name.'); return; }
    if (!isValid)           { Alert.alert('Add more items', 'Select at least 2 items.'); return; }

    setSaving(true);
    try {
      if (outfitId && existing) {
        await editOutfit(outfitId, {
          name:            outfitName.trim(),
          clothingItemIds: selectedIds,
          occasion,
        });
      } else {
        await createOutfit(
          outfitName.trim(),
          selectedIds,
          [],
          undefined,
          undefined,
          occasion || undefined,
        );
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save outfit.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <View style={{ width: ITEM_W }}>
      <ClothingCard
        item={item}
        onPress={() => toggle(item.id)}
        selected={selectedIds.includes(item.id)}
        compact={false}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title={outfitId ? 'Edit Outfit' : 'Build Outfit'}
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.fits}
        rightIcon={
          isValid ? (
            <AppText variant="label" color={Colors.fits}>
              {selectedIds.length} selected
            </AppText>
          ) : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Selected items preview strip */}
        {selectedItems.length > 0 && (
          <View style={s.selectedStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectedRow}>
              {selectedItems.map(item => (
                <TouchableOpacity key={item.id} onPress={() => toggle(item.id)} style={s.selectedThumb}>
                  <ClothingCard item={item} onPress={() => toggle(item.id)} compact />
                  <View style={s.removeChip}>
                    <AppText style={{ fontSize: 10, color: Colors.white }}>✕</AppText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <AppText variant="caption" color={Colors.textMuted} style={s.tapHint}>
              Tap item to remove
            </AppText>
          </View>
        )}

        {/* Category filter */}
        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />

        {/* Wardrobe grid */}
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          numColumns={COLS}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppEmptyState
              emoji="👗"
              title="No items in this category"
              subtitle="Add clothes to your wardrobe first."
            />
          }
        />

        {/* Save bar */}
        {isValid && (
          <View style={s.saveBar}>
            {!showForm ? (
              <AppButton
                label={`Name this outfit (${selectedIds.length} items) →`}
                onPress={() => setShowForm(true)}
                variant="primary"
                size="lg"
                fullWidth
                style={{ backgroundColor: Colors.fits }}
              />
            ) : (
              <View style={s.form}>
                <TextInput
                  style={s.nameInput}
                  value={outfitName}
                  onChangeText={setOutfitName}
                  placeholder="Outfit name…"
                  placeholderTextColor={Colors.textLight}
                  autoFocus
                />
                {/* Occasion chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.occasionRow}>
                  {OCCASIONS.map(occ => (
                    <TouchableOpacity
                      key={occ}
                      style={[s.occPill, occasion === occ && s.occPillActive]}
                      onPress={() => setOccasion(occasion === occ ? '' : occ)}
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
                <AppButton
                  label={outfitId ? 'Save Changes' : 'Save Outfit'}
                  onPress={handleSave}
                  loading={saving}
                  variant="primary"
                  size="lg"
                  fullWidth
                  style={{ backgroundColor: Colors.fits }}
                />
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  selectedStrip: {
    backgroundColor: Colors.bgCard,
    paddingTop: Spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  selectedRow: { paddingHorizontal: Spacing.base, gap: 8, paddingBottom: 4 },
  selectedThumb: { position: 'relative' },
  removeChip: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  tapHint: { textAlign: 'center', paddingBottom: 6 },
  grid:    { padding: Spacing.base, paddingBottom: 120 },
  row:     { gap: Spacing.sm, marginBottom: Spacing.sm },
  saveBar: {
    padding: Spacing.base,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 0.5, borderTopColor: Colors.divider,
  },
  form:        { gap: Spacing.sm },
  nameInput: {
    fontFamily:      FontFamily.medium,
    fontSize:        17,
    color:           Colors.textPrimary,
    backgroundColor: Colors.bgInput,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  occasionRow: { gap: 8 },
  occPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  occPillActive: { backgroundColor: Colors.fits, borderColor: Colors.fits },
});
