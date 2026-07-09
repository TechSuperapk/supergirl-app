// ─────────────────────────────────────────────────────────────────────────────
// JournalTopTabs — the module switcher shown under the app bar:
//   Me · Journal · Goals · Fits · Club
// The active tab is emphasised with a solid underline. Icons use 3D-style emoji
// (design assets not exported); swap for <Image> when the icon set is available.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing } from '../../../../shared/theme/spacing';
import HomeIcon from '../../../../../assets/images/HomeIcon';
import JournalLogos from '../../../../../assets/images/JournalLogos';
import OutfitsLogo from '../../../../../assets/images/OutfitsLogo';
import ClubLogo from '../../../../../assets/images/ClubLogo';
import TrackersLogo from '../../../../../assets/images/TrackersLogo';
export type TopTabKey = 'me' | 'journal' | 'goals' | 'fits' | 'club';

interface TabDef { key: TopTabKey; label: string; Icon: React.FC<{ width?: number; height?: number }>; }

   const TABS: TabDef[] = [
     { key: 'me',      label: 'Me',      Icon: HomeIcon },
     { key: 'journal', label: 'Journal', Icon: JournalLogos },
     { key: 'goals',   label: 'Goals',   Icon: TrackersLogo },
     { key: 'fits',    label: 'Fits',    Icon: OutfitsLogo },
     { key: 'club',    label: 'Club',    Icon: ClubLogo },

     
   ];

interface Props {
  active:   TopTabKey;
  onSelect: (key: TopTabKey) => void;
}

export function JournalTopTabs({ active, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { borderBottomColor: colors.divider }]}>
      {TABS.map(tab => {
        const focused = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            activeOpacity={0.75}
            onPress={() => onSelect(tab.key)}
          >
            {/* <Text style={s.emoji}>{tab.emoji}</Text> */}
            <tab.Icon width={36} height={36} />
            <AppText
              variant="label"
              color={focused ? colors.textPrimary : colors.textMuted}
              style={s.label}
            >
              {tab.label}
            </AppText>
            <View style={[s.underline, { backgroundColor: focused ? colors.textPrimary : 'transparent' }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 4 },
  emoji: { fontSize: 26, marginBottom: 2 },
  label: { marginBottom: 6 },
  underline: { height: 2.5, width: 26, borderRadius: 2 },
});
