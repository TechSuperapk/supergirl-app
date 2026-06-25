import React from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Share, Dimensions,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useBoards }         from '../hooks/useBoards';
import { BoardCanvas, CANVAS_H, CANVAS_W } from '../components/BoardCanvas';
import { BOARD_TYPE_META }   from '../components/BoardCard';
import { AppHeader }         from '../../../shared/components/AppHeader';
import { AppText }           from '../../../shared/components/AppText';
import { AppButton }         from '../../../shared/components/AppButton';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }            from '../../../shared/theme/colors';
import { Spacing, Radius }   from '../../../shared/theme/spacing';

type Props = NativeStackScreenProps<any, 'BoardDetail'>;

const { width: W } = Dimensions.get('window');
const PREVIEW_SCALE = W / CANVAS_W;

export function BoardDetailScreen({ route, navigation }: Props) {
  const { boardId }   = route.params as { boardId: string };
  const { boards, remove, updateMeta } = useBoards();
  const board = boards.find(b => b.id === boardId);

  if (!board) return <AppLoadingSpinner fullscreen />;

  const meta = BOARD_TYPE_META[board.type];

  const handleShare = async () => {
    await Share.share({
      title:   board.title,
      message: `Check out my ${meta.label} board: "${board.title}" — made with SuperGirl`,
    });
  };

  const handleDelete = () =>
    Alert.alert('Delete board?', 'This cannot be undone.', [
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await remove(board.id);
        navigation.goBack();
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);

  const togglePublic = () =>
    updateMeta(board.id, { isPublic: !board.isPublic });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader
        title={board.title}
        leftIcon={<AppText variant="body" color={Colors.primary}>‹</AppText>}
        onLeftPress={() => navigation.goBack()}
        accentColor={meta.color}
        rightIcon={<AppText style={{ fontSize: 20 }}>✏️</AppText>}
        onRightPress={() => navigation.navigate('BoardEditor', { boardId: board.id })}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Scaled canvas preview */}
        <View style={s.canvasWrapper}>
          <View
            style={[
              s.canvasScaler,
              { transform: [{ scale: PREVIEW_SCALE }] },
            ]}
            pointerEvents="none"
          >
            <BoardCanvas
              elements={board.elements}
              bgColor={board.bgColor}
              selected={null}
              onSelect={() => {}}
              onMove={() => {}}
              onResize={() => {}}
              onRotate={() => {}}
            />
          </View>
        </View>

        {/* Info */}
        <View style={s.infoSection}>
          <View style={s.metaRow}>
            <View style={[s.typePill, { backgroundColor: meta.color + '18' }]}>
              <AppText style={{ fontSize: 16 }}>{meta.emoji}</AppText>
              <AppText variant="label" color={meta.color}>{meta.label}</AppText>
            </View>
            <AppText variant="caption" color={Colors.textMuted}>
              {board.elements.length} element{board.elements.length !== 1 ? 's' : ''}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              {board.isPublic ? '🌍 Public' : '🔒 Private'}
            </AppText>
          </View>

          <AppText variant="caption" color={Colors.textMuted}>
            Updated {new Date(board.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </AppText>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <AppButton
            label="Open Editor"
            onPress={() => navigation.navigate('BoardEditor', { boardId: board.id })}
            variant="primary"
            size="lg"
            fullWidth
            style={{ backgroundColor: Colors.boards }}
          />
          <View style={s.secondaryActions}>
            <AppButton
              label="Share"
              onPress={handleShare}
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
            />
            <AppButton
              label={board.isPublic ? 'Make private' : 'Make public'}
              onPress={togglePublic}
              variant="ghost"
              size="md"
              style={{ flex: 1 }}
            />
          </View>
          <AppButton
            label="Delete board"
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
  scroll:  { paddingBottom: 40 },
  canvasWrapper: {
    width:    W,
    height:   CANVAS_H * (W / CANVAS_W),
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  canvasScaler: {
    width:             CANVAS_W,
    height:            CANVAS_H,
    transformOrigin:   'top left',
  },
  infoSection: {
    padding: Spacing.base,
    gap: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  actions: { padding: Spacing.base, gap: Spacing.sm },
  secondaryActions: { flexDirection: 'row', gap: Spacing.sm },
});
