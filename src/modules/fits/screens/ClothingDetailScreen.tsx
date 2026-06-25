import React from 'react';
import {
  View, Image, ScrollView, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useWardrobe }    from '../hooks/useFits';
import { AppHeader }      from '../../../shared/components/AppHeader';
import { AppText }        from '../../../shared/components/AppText';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { CATEGORIES }     from '../components/CategoryFilter';

type Props = NativeStackScreenProps<any, 'ClothingDetail'>;

const { width: W } = Dimensions.get('window');

export function ClothingDetailScreen({ route, navigation }: Props) {
  const { itemId }  = route.params as { itemId: string };
  const { wardrobe, removeItem, toggleFavourite } = useWardrobe();
  const item = wardrobe.find(i => i.id === itemId);

  if (!item) return <AppLoadingSpinner fullscreen />;

  const catMeta = CATEGORIES.find(c => c.key === item.category);

  const handleDelete = () =>
    Alert.alert('Remove item?', `Remove "${item.name}" from your wardrobe?`, [
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeItem(item.id);
        navigation.goBack();
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title={item.name}
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.fits}
        rightIcon={<AppText style={{ fontSize: 22 }}>{item.isFavourite ? '⭐' : '☆'}</AppText>}
        onRightPress={() => toggleFavourite(item.id)}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Image */}
        <View style={s.imageWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={s.image} resizeMode="cover" />
          ) : (
            <View style={[s.image, s.imagePlaceholder]}>
              <AppText style={{ fontSize: 60 }}>👗</AppText>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={s.card}>
          <View style={s.detailRow}>
            <AppText variant="label" color={Colors.textMuted}>Name</AppText>
            <AppText variant="body" color={Colors.textPrimary}>{item.name}</AppText>
          </View>
          <View style={s.divider} />

          <View style={s.detailRow}>
            <AppText variant="label" color={Colors.textMuted}>Category</AppText>
            <AppText variant="body" color={Colors.textPrimary}>
              {catMeta?.emoji} {catMeta?.label ?? item.category}
            </AppText>
          </View>
          <View style={s.divider} />

          {item.brand && (
            <>
              <View style={s.detailRow}>
                <AppText variant="label" color={Colors.textMuted}>Brand</AppText>
                <AppText variant="body" color={Colors.textPrimary}>{item.brand}</AppText>
              </View>
              <View style={s.divider} />
            </>
          )}

          {item.colorTags.length > 0 && (
            <>
              <View style={s.detailRow}>
                <AppText variant="label" color={Colors.textMuted}>Colors</AppText>
                <View style={s.colorRow}>
                  {item.colorTags.map(c => (
                    <View
                      key={c}
                      style={[s.colorDot, {
                        backgroundColor: c.startsWith('#') ? c : Colors.bgInput,
                        borderColor: c === '#FFFFFF' ? Colors.border : c,
                      }]}
                    />
                  ))}
                </View>
              </View>
              <View style={s.divider} />
            </>
          )}

          {item.notes && (
            <View style={s.detailRow}>
              <AppText variant="label" color={Colors.textMuted}>Notes</AppText>
              <AppText variant="bodySmall" color={Colors.textSecondary}>{item.notes}</AppText>
            </View>
          )}
        </View>

        {/* Added date */}
        <AppText variant="caption" color={Colors.textMuted} align="center">
          Added {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </AppText>

        {/* Actions */}
        <View style={s.actions}>
          <AppButton
            label="Edit Item"
            onPress={() => navigation.navigate('AddClothing', { itemId: item.id })}
            variant="secondary"
            size="md"
            fullWidth
          />
          <AppButton
            label="Remove from wardrobe"
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
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.base, paddingBottom: 40 },
  imageWrap: { alignItems: 'center' },
  image: {
    width: W - Spacing.base * 2,
    height: W - Spacing.base * 2,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgInput,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.fits + '10' },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  divider:  { height: 0.5, backgroundColor: Colors.divider },
  colorRow: { flexDirection: 'row', gap: 6 },
  colorDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5,
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
