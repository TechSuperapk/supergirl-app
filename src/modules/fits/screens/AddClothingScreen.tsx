import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useSelector }   from 'react-redux';
import * as ImagePicker  from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootState }     from '../../../store';
import { useWardrobe }   from '../hooks/useFits';
import { AppHeader }     from '../../../shared/components/AppHeader';
import { AppInput }      from '../../../shared/components/AppInput';
import { AppButton }     from '../../../shared/components/AppButton';
import { AppText }       from '../../../shared/components/AppText';
import { CategoryFilter, CATEGORIES } from '../components/CategoryFilter';
import { Colors }        from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { ClothingCategory } from '../types';

type Props = NativeStackScreenProps<any, 'AddClothing'>;

const COLOR_PRESETS = [
  '#000000','#FFFFFF','#FF0000','#0000FF','#008000',
  '#FFFF00','#FFA500','#800080','#FFC0CB','#A52A2A',
  '#808080','#00FFFF','#FFD700','#40E0D0','#F5F5DC',
];

export function AddClothingScreen({ route, navigation }: Props) {
  const { itemId } = (route.params ?? {}) as { itemId?: string };
  const isEdit     = !!itemId;

  const { wardrobe, addItem, editItem } = useWardrobe();
  const existing = wardrobe.find(i => i.id === itemId);

  const [name,       setName]       = useState(existing?.name ?? '');
  const [category,   setCategory]   = useState<ClothingCategory>(existing?.category ?? 'tops');
  const [colorTags,  setColorTags]  = useState<string[]>(existing?.colorTags ?? []);
  const [brand,      setBrand]      = useState(existing?.brand ?? '');
  const [notes,      setNotes]      = useState(existing?.notes ?? '');
  const [localUri,   setLocalUri]   = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);

  const displayImage = localUri ?? existing?.imageUri;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:   ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:       [1, 1],
      quality:      0.85,
    });
    if (!result.canceled) setLocalUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect:        [1, 1],
      quality:       0.85,
    });
    if (!result.canceled) setLocalUri(result.assets[0].uri);
  };

  const toggleColor = (hex: string) => {
    setColorTags(prev =>
      prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex],
    );
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    try {
      if (isEdit && itemId) {
        await editItem(
          itemId,
          { name: name.trim(), category, colorTags, brand: brand.trim(), notes: notes.trim() },
          localUri ?? undefined,
        );
      } else {
        await addItem(
          {
            name:        name.trim(),
            category,
            colorTags,
            brand:       brand.trim() || undefined,
            imageUri:    '',
            isFavourite: false,
            notes:       notes.trim() || undefined,
          },
          localUri ?? undefined,
        );
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title={isEdit ? 'Edit Item' : 'Add to Wardrobe'}
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.fits}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Image picker */}
          <View style={s.imageSection}>
            {/* Shadow lives on this outer wrapper (no overflow:'hidden' here) —
                the inner TouchableOpacity clips the photo to its rounded
                corners. overflow:'hidden' + a shadow on the same view
                suppresses the shadow on Android. */}
            <View style={s.imageTileShadowWrap}>
            <TouchableOpacity style={s.imageTile} onPress={pickImage} activeOpacity={0.85}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={s.imagePlaceholder}>
                  <AppText style={{ fontSize: 40 }}>📷</AppText>
                  <AppText variant="caption" color={Colors.textMuted}>Tap to add photo</AppText>
                </View>
              )}
            </TouchableOpacity>
            </View>
            <View style={s.imageActions}>
              <AppButton label="Gallery" onPress={pickImage} variant="secondary" size="sm" />
              <AppButton label="Camera"  onPress={takePhoto} variant="ghost"     size="sm" />
            </View>
          </View>

          {/* Name */}
          <AppInput
            label="Item name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. White linen shirt"
          />

          {/* Category */}
          <View style={s.fieldGroup}>
            <AppText variant="label" color={Colors.textSecondary}>Category *</AppText>
            <CategoryFilter
              active={category}
              onChange={(cat) => cat !== 'all' && setCategory(cat as ClothingCategory)}
            />
          </View>

          {/* Color tags */}
          <View style={s.fieldGroup}>
            <AppText variant="label" color={Colors.textSecondary}>Colors</AppText>
            <View style={s.colorGrid}>
              {COLOR_PRESETS.map(hex => (
                <TouchableOpacity
                  key={hex}
                  style={[
                    s.colorSwatch,
                    { backgroundColor: hex, borderColor: hex === '#FFFFFF' ? Colors.border : hex },
                    colorTags.includes(hex) && s.colorSelected,
                  ]}
                  onPress={() => toggleColor(hex)}
                >
                  {colorTags.includes(hex) && (
                    <AppText style={{ fontSize: 12, color: hex === '#FFFFFF' || hex === '#FFFF00' || hex === '#F5F5DC' ? '#333' : '#FFF' }}>✓</AppText>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Brand */}
          <AppInput
            label="Brand (optional)"
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Zara, H&M"
          />

          {/* Notes */}
          <AppInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Size, care instructions…"
            multiline
            numberOfLines={3}
            style={{ minHeight: 70, textAlignVertical: 'top' }}
          />

          <AppButton
            label={isEdit ? 'Save Changes' : 'Add to Wardrobe'}
            onPress={save}
            loading={saving}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.md, paddingBottom: 40 },
  imageSection: { alignItems: 'center', gap: Spacing.sm },
  // Shadow-casting wrapper — no overflow/clipping of its own so the shadow
  // renders fully on both iOS (shadow* props) and Android (elevation).
  imageTileShadowWrap: {
    width: 180, height: 180, borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  imageTile: {
    width: 180, height: 180, borderRadius: Radius.lg,
    backgroundColor: Colors.bgInput, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imageActions: { flexDirection: 'row', gap: Spacing.sm },
  fieldGroup: { gap: 8 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSelected: { transform: [{ scale: 1.15 }], borderWidth: 3 },
});
