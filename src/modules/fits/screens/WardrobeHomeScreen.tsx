import React from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useWardrobe }      from '../hooks/useFits';
import { ClothingCard }     from '../components/ClothingCard';
import { CategoryFilter }   from '../components/CategoryFilter';
import { AppText }          from '../../../shared/components/AppText';
import { AppEmptyState }    from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }           from '../../../shared/theme/colors';
import { Spacing }          from '../../../shared/theme/spacing';
import { ClothingItem }     from '../types';

type Props = NativeStackScreenProps<any, 'WardrobeHome'>;

const { width: SCREEN_W } = Dimensions.get('window');
const COLS    = 2;
const ITEM_W  = (SCREEN_W - Spacing.base * 2 - Spacing.sm) / COLS;

export function WardrobeHomeScreen({ navigation }: Props) {
  const {
    filtered, loading, activeCategory,
    setActiveCategory, removeItem, toggleFavourite,
  } = useWardrobe();

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <View style={{ width: ITEM_W }}>
      <ClothingCard
        item={item}
        onPress={() => navigation.navigate('ClothingDetail', { itemId: item.id })}
        onLongPress={() =>
          Alert.alert(item.name, undefined, [
            { text: 'View details',   onPress: () => navigation.navigate('ClothingDetail', { itemId: item.id }) },
            { text: 'Edit',           onPress: () => navigation.navigate('AddClothing', { itemId: item.id }) },
            { text: item.isFavourite ? 'Remove favourite' : 'Add favourite',
              onPress: () => toggleFavourite(item.id) },
            { text: 'Delete', style: 'destructive', onPress: () => removeItem(item.id) },
            { text: 'Cancel',  style: 'cancel' },
          ])
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Wardrobe</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AddClothing', {})}
        >
          <AppText variant="headingMedium" color={Colors.white}>+</AppText>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <CategoryFilter active={activeCategory} onChange={setActiveCategory} />

      {/* Grid */}
      {loading && filtered.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading wardrobe…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={COLS}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppEmptyState
              emoji="👗"
              title="Your wardrobe is empty"
              subtitle="Start adding your clothes to build outfit suggestions."
              actionLabel="Add first item"
              onAction={() => navigation.navigate('AddClothing', {})}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddClothing', {})}
        activeOpacity={0.85}
      >
        <AppText style={s.fabIcon}>+</AppText>
      </TouchableOpacity>
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
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.fits,
    alignItems: 'center', justifyContent: 'center',
  },
  grid:   { padding: Spacing.base, paddingBottom: 100 },
  row:    { gap: Spacing.sm, marginBottom: Spacing.sm },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.fits,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.fits,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },
  fabIcon: { fontSize: 28, color: Colors.white, lineHeight: 32 },
});
