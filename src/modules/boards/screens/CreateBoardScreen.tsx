import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useBoards }      from '../hooks/useBoards';
import { BOARD_TYPE_META } from '../components/BoardCard';
import { AppHeader }      from '../../../shared/components/AppHeader';
import { AppInput }       from '../../../shared/components/AppInput';
import { AppButton }      from '../../../shared/components/AppButton';
import { AppText }        from '../../../shared/components/AppText';
import { Colors }         from '../../../shared/theme/colors';
import { Spacing, Radius, Shadows } from '../../../shared/theme/spacing';
import { BoardType }      from '../types';

type Props = NativeStackScreenProps<any, 'CreateBoard'>;

const BOARD_TYPES = Object.entries(BOARD_TYPE_META) as [BoardType, typeof BOARD_TYPE_META[BoardType]][];

const BG_PRESETS = [
  { color: '#FFFFFF', label: 'White'    },
  { color: '#FDFAF7', label: 'Cream'    },
  { color: '#FFF0F3', label: 'Rose'     },
  { color: '#F0FFF4', label: 'Mint'     },
  { color: '#F3F0FF', label: 'Lavender' },
  { color: '#E3F2FD', label: 'Sky'      },
  { color: '#FFF8E1', label: 'Gold'     },
  { color: '#1A1A2E', label: 'Dark'     },
];

export function CreateBoardScreen({ navigation }: Props) {
  const { create }     = useBoards();
  const [title,      setTitle]      = useState('');
  const [type,       setType]       = useState<BoardType>('vision');
  const [bgColor,    setBgColor]    = useState('#FFFFFF');
  const [isPublic,   setIsPublic]   = useState(false);
  const [creating,   setCreating]   = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Give your board a title.'); return; }
    setCreating(true);
    try {
      const board = await create(title.trim(), type, bgColor, isPublic);
      // Navigate straight into the editor
      navigation.replace('BoardEditor', { boardId: board.id });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create board.');
    } finally {
      setCreating(false);
    }
  };

  const meta = BOARD_TYPE_META[type];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title="New Board"
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={Colors.boards}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Preview card */}
        <View style={[s.preview, { backgroundColor: bgColor }]}>
          <AppText style={{ fontSize: 56 }}>{meta.emoji}</AppText>
          <AppText variant="headingMedium" color={bgColor === '#1A1A2E' ? Colors.white : Colors.textPrimary} align="center">
            {title.trim() || 'My Board'}
          </AppText>
        </View>

        {/* Title */}
        <AppInput
          label="Board title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. 2025 Vision Board"
          autoFocus
        />

        {/* Board type */}
        <View style={s.field}>
          <AppText variant="label" color={Colors.textSecondary}>Type</AppText>
          <View style={s.typeGrid}>
            {BOARD_TYPES.map(([key, meta]) => (
              <TouchableOpacity
                key={key}
                style={[s.typeBtn, type === key && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
                onPress={() => setType(key)}
                activeOpacity={0.8}
              >
                <AppText style={{ fontSize: 22 }}>{meta.emoji}</AppText>
                <AppText
                  variant="caption"
                  color={type === key ? meta.color : Colors.textSecondary}
                  style={type === key ? { fontFamily: 'DMSans-Bold' } : undefined}
                >
                  {meta.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Background color */}
        <View style={s.field}>
          <AppText variant="label" color={Colors.textSecondary}>Background</AppText>
          <View style={s.bgRow}>
            {BG_PRESETS.map(p => (
              <TouchableOpacity
                key={p.color}
                style={[
                  s.bgSwatch,
                  { backgroundColor: p.color },
                  bgColor === p.color && s.bgSwatchSelected,
                ]}
                onPress={() => setBgColor(p.color)}
              />
            ))}
          </View>
        </View>

        {/* Visibility */}
        <TouchableOpacity
          style={s.toggleRow}
          onPress={() => setIsPublic(v => !v)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="headingSmall" color={Colors.textPrimary}>
              {isPublic ? '🌍 Public' : '🔒 Private'}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {isPublic ? 'Others can view this board' : 'Only you can see this board'}
            </AppText>
          </View>
          <View style={[s.toggle, isPublic && s.toggleOn]}>
            <View style={[s.toggleThumb, isPublic && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        <AppButton
          label={creating ? 'Creating…' : 'Create & Open Editor'}
          onPress={handleCreate}
          loading={creating}
          variant="primary"
          size="lg"
          fullWidth
          style={{ backgroundColor: Colors.boards, marginTop: Spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bgApp },
  scroll:  { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 40 },
  preview: {
    height: 160, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.border,
    ...Shadows.md,
  },
  field:    { gap: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.md, backgroundColor: Colors.bgInput,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  bgRow:    { flexDirection: 'row', gap: 10 },
  bgSwatch: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  bgSwatchSelected: { borderWidth: 3, borderColor: Colors.boards, transform: [{ scale: 1.2 }] },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
    padding: Spacing.base, borderWidth: 1, borderColor: Colors.border,
  },
  toggle: {
    width: 50, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.boards },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
});
