import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { Colors }     from '../../../shared/theme/colors';
import { FontFamily, FontSize } from '../../../shared/theme/typography';
import { Spacing }    from '../../../shared/theme/spacing';

interface BaseProps {
  icon:     string;
  label:    string;
  subtitle?: string;
  danger?:  boolean;
}

interface PressProps extends BaseProps {
  type:    'press';
  onPress: () => void;
  value?:  never;
  onValueChange?: never;
}

interface ToggleProps extends BaseProps {
  type:           'toggle';
  value:          boolean;
  onValueChange:  (v: boolean) => void;
  onPress?:       never;
}

interface InfoProps extends BaseProps {
  type:   'info';
  value:  string;
  onPress?:      never;
  onValueChange?: never;
}

type Props = PressProps | ToggleProps | InfoProps;

export function SettingsRow({ icon, label, subtitle, danger, ...rest }: Props) {
  const labelColor = danger ? Colors.error : Colors.textPrimary;

  const inner = (
    <View style={s.row}>
      {/* Left: icon + text */}
      <View style={s.left}>
        <View style={[s.iconBox, danger && { backgroundColor: Colors.error + '15' }]}>
          <Text style={s.icon}>{icon}</Text>
        </View>
        <View style={s.textCol}>
          <Text style={[s.label, { color: labelColor, fontFamily: FontFamily.medium }]}>
            {label}
          </Text>
          {!!subtitle && (
            <Text style={[s.subtitle, { fontFamily: FontFamily.regular }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Right: chevron / toggle / value */}
      {rest.type === 'toggle' && (
        <Switch
          value={rest.value}
          onValueChange={rest.onValueChange}
          trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
          thumbColor={rest.value ? Colors.primary : Colors.textLight}
        />
      )}
      {rest.type === 'press' && (
        <Text style={s.chevron}>›</Text>
      )}
      {rest.type === 'info' && (
        <Text style={[s.infoVal, { fontFamily: FontFamily.regular }]}>{rest.value}</Text>
      )}
    </View>
  );

  if (rest.type === 'press') {
    return (
      <TouchableOpacity onPress={rest.onPress} activeOpacity={0.7} style={s.wrapper}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={s.wrapper}>{inner}</View>;
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.base,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  iconBox: {
    width:           38,
    height:          38,
    borderRadius:    10,
    backgroundColor: Colors.bgInput,
    alignItems:      'center',
    justifyContent:  'center',
  },
  icon:     { fontSize: 20 },
  textCol:  { flex: 1, gap: 2 },
  label:    { fontSize: FontSize.base },
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted },
  chevron:  { fontSize: 22, color: Colors.textLight, marginRight: -4 },
  infoVal:  { fontSize: FontSize.sm, color: Colors.textMuted },
});
