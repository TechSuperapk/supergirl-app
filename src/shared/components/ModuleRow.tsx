import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SvgProps } from 'react-native-svg';
import ClubLogo     from '../../../assets/images/ClubLogo';
import JournalLogo  from '../../../assets/images/JournalLogo';
import OutfitsLogo  from '../../../assets/images/OutfitsLogo';
import TrackersLogo from '../../../assets/images/TrackersLogo';
import BoardsLogo   from '../../../assets/images/BoardsLogo';

export type ModuleName = 'Club' | 'Note' | 'Fits' | 'Track' | 'Board';

interface Props {
  activeModule?: ModuleName;
  onSelect?: (module: ModuleName) => void;
}

interface ModuleDef {
  name: ModuleName;
  Icon: React.FC<SvgProps>;
  activeColor: string;
  live: boolean;
}

const MODULES: ModuleDef[] = [
  { name:'Note',  Icon:JournalLogo,  activeColor:'#1565C0', live:true  },
  { name:'Fits',  Icon:OutfitsLogo,  activeColor:'#BF360C', live:false },
  { name:'Track', Icon:TrackersLogo, activeColor:'#2E7D32', live:false },
  { name:'Board', Icon:BoardsLogo,   activeColor:'#1565C0', live:false },
];

const F  = 'DMSans-Regular';
const FB = 'DMSans-Bold';

export function ModuleRow({ activeModule, onSelect }: Props) {
  return (
    <View style={s.row}>
      {MODULES.map(({ name, Icon, activeColor, live }) => {
        const active = activeModule === name;
        return (
          <TouchableOpacity
            key={name}
            style={[s.item, active && { borderBottomColor: activeColor, borderBottomWidth: 2.5 }]}
            onPress={() => {
              if (live) { onSelect?.(name); }
              else { Alert.alert(`${name} — Coming Soon`, `The ${name} module is under development. Stay tuned! 🚀`); }
            }}
            activeOpacity={0.7}
          >
            <View style={s.iconWrap}>
              <Icon width={30} height={30}/>
              {!live && <View style={s.soonBadge}><Text style={[s.soonT,{fontFamily:F}]}>Soon</Text></View>}
            </View>
            <Text style={[s.label, {fontFamily:F}, active && { color: activeColor, fontFamily:FB }]}>
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row:       { flexDirection:'row', justifyContent:'space-around', paddingHorizontal:8, paddingBottom:10, paddingTop:4, backgroundColor:'#FFFFFF', borderBottomWidth:0.5, borderBottomColor:'#F0F0F0' },
  item:      { alignItems:'center', gap:5, paddingHorizontal:6, paddingBottom:4, borderBottomWidth:2.5, borderBottomColor:'transparent' },
  iconWrap:  { width:48, height:48, borderRadius:14, alignItems:'center', justifyContent:'center', position:'relative' },
  soonBadge: { position:'absolute', top:-2, right:-2, backgroundColor:'#FF7043', borderRadius:6, paddingHorizontal:3, paddingVertical:1 },
  soonT:     { fontSize:7, color:'#FFF' },
  label:     { fontSize:11, color:'#9E9E9E' },
});
