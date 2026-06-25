import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { AppText }   from '../../../shared/components/AppText';
import { Colors }    from '../../../shared/theme/colors';
import { Radius, Spacing } from '../../../shared/theme/spacing';
import { MoodLevel } from '../types';

interface MoodOption {
  level:  MoodLevel;
  emoji:  string;
  label:  string;
  color:  string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { level: 1, emoji: '😢', label: 'Awful',   color: '#EF5350' },
  { level: 2, emoji: '😔', label: 'Bad',     color: '#FF7043' },
  { level: 3, emoji: '😐', label: 'Okay',    color: '#FFA726' },
  { level: 4, emoji: '😊', label: 'Good',    color: '#66BB6A' },
  { level: 5, emoji: '🤩', label: 'Amazing', color: '#42A5F5' },
];

interface Props {
  selected?:  MoodLevel;
  onSelect:   (level: MoodLevel, emoji: string) => void;
  size?:      'sm' | 'md' | 'lg';
}

export function MoodSelector({ selected, onSelect, size = 'md' }: Props) {
  const emojiSize  = size === 'sm' ? 28 : size === 'lg' ? 48 : 36;
  const circleSize = size === 'sm' ? 46 : size === 'lg' ? 72 : 58;

  return (
    <View style={s.row}>
      {MOOD_OPTIONS.map(opt => {
        const isSelected = selected === opt.level;
        return (
          <TouchableOpacity
            key={opt.level}
            style={[
              s.circle,
              {
                width:           circleSize,
                height:          circleSize,
                borderRadius:    circleSize / 2,
                backgroundColor: isSelected ? opt.color + '25' : Colors.bgInput,
                borderColor:     isSelected ? opt.color : Colors.border,
                borderWidth:     isSelected ? 2.5 : 1.5,
              },
            ]}
            onPress={() => onSelect(opt.level, opt.emoji)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: emojiSize }}>{opt.emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function MoodBar({ entries }: { entries: import('../types').MoodEntry[] }) {
  if (entries.length === 0) return null;

  const last7 = entries.slice(0, 7).reverse();

  return (
    <View style={bar.wrap}>
      {last7.map((entry, i) => {
        const opt = MOOD_OPTIONS.find(o => o.level === entry.mood)!;
        const d   = new Date(entry.date + 'T00:00:00');
        return (
          <View key={entry.id ?? i} style={bar.cell}>
            <Text style={{ fontSize: 18 }}>{opt?.emoji ?? '😐'}</Text>
            <AppText variant="caption" color={Colors.textMuted}>
              {d.toLocaleDateString('en-IN', { weekday: 'narrow' })}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
});

const bar = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cell: { alignItems: 'center', gap: 4 },
});
