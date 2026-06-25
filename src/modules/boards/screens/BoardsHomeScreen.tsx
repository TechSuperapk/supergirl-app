import React from 'react';
import {
  View, FlatList, TouchableOpacity,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useBoards }       from '../hooks/useBoards';
import { BoardCard }       from '../components/BoardCard';
import { AppText }         from '../../../shared/components/AppText';
import { AppButton }       from '../../../shared/components/AppButton';
import { AppEmptyState }   from '../../../shared/components/AppEmptyState';
import { AppLoadingSpinner } from '../../../shared/components/AppLoadingSpinner';
import { Colors }          from '../../../shared/theme/colors';
import { Spacing }         from '../../../shared/theme/spacing';
import { Board }           from '../types';

type Props = NativeStackScreenProps<any, 'BoardsHome'>;

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.base * 2 - Spacing.sm) / 2;

export function BoardsHomeScreen({ navigation }: Props) {
  const { boards, loading, remove } = useBoards();

  const handleLongPress = (board: Board) => {
    Alert.alert(board.title, undefined, [
      { text: 'Open',   onPress: () => navigation.navigate('BoardDetail', { boardId: board.id }) },
      { text: 'Edit',   onPress: () => navigation.navigate('BoardEditor', { boardId: board.id }) },
      { text: 'Delete', style: 'destructive', onPress: () =>
        Alert.alert('Delete board?', 'This cannot be undone.', [
          { text: 'Delete', style: 'destructive', onPress: () => remove(board.id) },
          { text: 'Cancel', style: 'cancel' },
        ])
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <AppText variant="headingLarge" color={Colors.textPrimary}>Boards</AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {boards.length} board{boards.length !== 1 ? 's' : ''}
          </AppText>
        </View>
        <AppButton
          label="+ New"
          onPress={() => navigation.navigate('CreateBoard')}
          variant="primary"
          size="sm"
          style={{ backgroundColor: Colors.boards }}
        />
      </View>

      {loading && boards.length === 0 ? (
        <AppLoadingSpinner fullscreen message="Loading boards…" />
      ) : (
        <FlatList
          data={boards}
          keyExtractor={b => b.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ width: CARD_W }}>
              <BoardCard
                board={item}
                onPress={() => navigation.navigate('BoardDetail', { boardId: item.id })}
                onLongPress={() => handleLongPress(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <AppEmptyState
              emoji="🎨"
              title="No boards yet"
              subtitle="Create your first vision board, mood board, or travel board!"
              actionLabel="Create board"
              onAction={() => navigation.navigate('CreateBoard')}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreateBoard')}
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
  grid: { padding: Spacing.base, paddingBottom: 100 },
  row:  { gap: Spacing.sm, marginBottom: Spacing.sm },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.boards,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.boards,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 10,
  },
  fabIcon: { fontSize: 28, color: Colors.white, lineHeight: 32 },
});
