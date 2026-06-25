import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import BoardsLogo   from '../../../assets/images/BoardsLogo';
import ClubLogo     from '../../../assets/images/ClubLogo';
import JournalLogo  from '../../../assets/images/JournalLogo';
import OutfitsLogo  from '../../../assets/images/OutfitsLogo';
import TrackersLogo from '../../../assets/images/TrackersLogo';
import SearchLogo   from '../../../assets/SearchLogo';
import LockLogo     from '../../../assets/LockLogo';
import HomeLogo     from '../../../assets/HomeLogo';
import CalendarLogo from '../../../assets/CalenderLogo';

interface IconProps { size?: number; color?: string; focused?: boolean }

// Module Row Icons
export const ClubIcon  = ({ size=32 }: IconProps) => <ClubLogo    width={size} height={size}/>;
export const NoteIcon  = ({ size=32 }: IconProps) => <JournalLogo width={size} height={size}/>;
export const FitsIcon  = ({ size=32 }: IconProps) => <OutfitsLogo width={size} height={size}/>;
export const TrackIcon = ({ size=32 }: IconProps) => <TrackersLogo width={size} height={size}/>;
export const BoardIcon = ({ size=32 }: IconProps) => <BoardsLogo  width={size} height={size}/>;

// Bottom Tab Icons — fixed container prevents iOS double-icon / misalignment
const TAB_SIZE = 26;

export function TabHomeIcon({ size=TAB_SIZE }: IconProps) {
  return (
    <View style={[ic.wrap, {width:size,height:size}]}>
      <HomeLogo width={size} height={size}/>
    </View>
  );
}
export function TabCalendarIcon({ size=TAB_SIZE }: IconProps) {
  return (
    <View style={[ic.wrap, {width:size,height:size}]}>
      <CalendarLogo width={size} height={size}/>
    </View>
  );
}
export function TabSearchIcon({ size=TAB_SIZE }: IconProps) {
  return (
    <View style={[ic.wrap, {width:size,height:size}]}>
      <SearchLogo width={size} height={size}/>
    </View>
  );
}
export function TabLockIcon({ size=TAB_SIZE }: IconProps) {
  return (
    <View style={[ic.wrap, {width:size,height:size}]}>
      <LockLogo width={size} height={size}/>
    </View>
  );
}
export function TabPlusIcon({ size=28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Line x1="14" y1="6" x2="14" y2="22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"/>
      <Line x1="6"  y1="14" x2="22" y2="14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"/>
    </Svg>
  );
}

const ic = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Critical for iOS: prevent SVG from bleeding outside bounds
    ...Platform.select({ ios: { marginBottom: 0, marginTop: 0 } }),
  },
});
