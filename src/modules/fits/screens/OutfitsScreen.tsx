import React from 'react';
import {
  View, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Image, Dimensions,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useOutfits, useWardrobe } from '../hooks/useFits';
import { OutfitCard }     from '../components/OutfitCard';
import { ClothingCard }   from '../components/ClothingCard';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppEmptyState }  from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { AppHeader }      from '../../../shared/components/AppHeader';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius } from '../../../shared/theme/spacing';
import { Outfit }         from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.base * 2 - Spacing.sm) / 2;

// ── OutfitsListScreen ─────────────────────────────────────────────────────────
type ListProps = NativeStackScreenProps<any, 'OutfitsList'>;

export function OutfitsListScreen({ navigation }: ListProps) {
  const { outfits, loading, resolveItems, removeOutfitById } = useOutfits();

  const renderOutfit = ({ item }: { item: Outfit }) => (
    <View style={{ width: CARD_W }}>
      <TouchableOpacity
        onLongPress={() =>
          Alert.alert(item.name, undefined, [
            { text: 'Edit',   onPress: () => navigation.navigate('OutfitBuilder', { outfitId: item.id }) },
            { text: 'Delete', style: 'destructive', onPress: () => removeOutfitById(item.id) },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
        activeOpacity={1}
      >
        <OutfitCard
          outfit={item}
          items={resolveItems(item)}
          onPress={() => navigation.navigate('OutfitDetail', { outfitId: item.id })}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Outfits</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {outfits.length} outfit{outfits.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <AppButton
          label="+ Build"
          onPress={() => navigation.navigate('OutfitBuilder', {})}
          variant="primary"
          size="sm"
          style={{ backgroundColor: Colors.fits }}
        />
      </View>

      {loading && outfits.length === 0 ? (
        <AppLoadingSpinner fullscreen />
      ) : (
        <FlatList
          data={outfits}
          keyExtractor={item => item.id}
          renderItem={renderOutfit}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppEmptyState
              emoji="💃"
              title="No outfits yet"
              subtitle="Build your first outfit from your wardrobe."
              actionLabel="Build outfit"
              onAction={() => navigation.navigate('OutfitBuilder', {})}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── OutfitDetailScreen ────────────────────────────────────────────────────────
type DetailProps = NativeStackScreenProps<any, 'OutfitDetail'>;

export function OutfitDetailScreen({ route, navigation }: DetailProps) {
  const { outfitId }  = route.params as { outfitId: string };
  const { outfits, resolveItems, removeOutfitById, editOutfit } = useOutfits();
  const outfit = outfits.find(o => o.id === outfitId);
  const items  = outfit ? resolveItems(outfit) : [];

  if (!outfit) return <AppLoadingSpinner fullscreen />;

  const handleDelete = () =>
    Alert.alert('Delete outfit?', 'This cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await removeOutfitById(outfitId);
        navigation.goBack();
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);

  const toggleFav = () =>
    editOutfit(outfitId, { isFavourite: !outfit.isFavourite });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title={outfit.name}
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.fits}
        rightIcon={<AppText style={{ fontSize: 22 }}>{outfit.isFavourite ? '⭐' : '☆'}</AppText>}
        onRightPress={toggleFav}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.detailScroll}>

        {/* Meta chips */}
        <View style={s.metaRow}>
          {outfit.occasion && (
            <View style={s.chip}>
              <AppText variant="caption" color={Colors.fits}>{outfit.occasion}</AppText>
            </View>
          )}
          {outfit.season && (
            <View style={s.chip}>
              <AppText variant="caption" color={Colors.fits}>{outfit.season}</AppText>
            </View>
          )}
          {outfit.tags.map(tag => (
            <View key={tag} style={s.chip}>
              <AppText variant="caption" color={Colors.textMuted}>{tag}</AppText>
            </View>
          ))}
        </View>

        {/* Items */}
        <AppText variant="headingSmall" color={Colors.textPrimary} style={s.sectionTitle}>
          Items ({items.length})
        </AppText>
        <View style={s.itemsGrid}>
          {items.map(item => (
            <View key={item.id} style={{ width: (SCREEN_W - Spacing.base * 2 - Spacing.sm * 2) / 3 }}>
              <ClothingCard
                item={item}
                onPress={() => navigation.navigate('ClothingDetail', { itemId: item.id })}
              />
            </View>
          ))}
        </View>

        {/* Notes */}
        {!!outfit.notes && (
          <>
            <AppText variant="headingSmall" color={Colors.textPrimary} style={s.sectionTitle}>Notes</AppText>
            <AppText variant="body" color={Colors.textSecondary}>{outfit.notes}</AppText>
          </>
        )}

        {/* Actions */}
        <View style={s.actions}>
          <AppButton
            label="Edit Outfit"
            onPress={() => navigation.navigate('OutfitBuilder', { outfitId })}
            variant="secondary"
            size="md"
            fullWidth
          />
          <AppButton
            label="Delete"
            onPress={handleDelete}
            variant="danger"
            size="md"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bgApp },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  grid:      { padding: Spacing.base, paddingBottom: 40 },
  row:       { gap: Spacing.sm, marginBottom: Spacing.sm },
  detailScroll: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  metaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.fits + '15',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  sectionTitle: { marginTop: Spacing.sm },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions:   { gap: Spacing.sm, marginTop: Spacing.sm },
});
