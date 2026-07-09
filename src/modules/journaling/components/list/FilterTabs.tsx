// FilterTabs — horizontally scrollable filter row (emoji + label + active underline).
import React from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';
import { JOURNAL_TYPE_ICONS } from '../home';

export interface FilterTab { key: string; label: string; emoji?: string; }

interface Props { tabs: FilterTab[]; active: string; onSelect: (key: string) => void; }

export function FilterTabs({ tabs, active, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.wrap, { borderBottomColor: colors.divider }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {tabs.map(t => {
          const on = t.key === active;
          const gif = JOURNAL_TYPE_ICONS[t.key];
          return (
            <TouchableOpacity key={t.key} style={s.tab} activeOpacity={0.75} onPress={() => onSelect(t.key)}>
              <View style={s.tabInner}>
                {gif ? (
                  <Image source={gif} style={s.gif} contentFit="contain" autoplay />
                ) : (
                  !!t.emoji && <Text style={s.emoji}>{t.emoji}</Text>
                )}
                <AppText variant="label" color={on ? colors.textPrimary : colors.textMuted}>{t.label}</AppText>
              </View>
              <View style={[s.underline, { backgroundColor: on ? colors.textPrimary : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, alignItems: 'flex-end' },
  tab: { alignItems: 'center', paddingTop: 4 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 8 },
  emoji: { fontSize: 15 },
  gif: { width: 20, height: 20 },
  underline: { height: 2.5, width: '100%', minWidth: 24, borderRadius: 2 },
});
