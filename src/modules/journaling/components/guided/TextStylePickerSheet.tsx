// TextStylePickerSheet — font size + text colour for the Freestyle canvas
// (the "Tt" text-style tool).
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../../../shared/components/AppText';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Spacing, Radius } from '../../../../shared/theme/spacing';
import { FONT_SIZES, TEXT_COLORS } from '../../types';

type TextAlign = 'left' | 'center' | 'right';

interface Props {
  visible: boolean;
  fontSize: number;
  textColor: string;
  onChangeSize: (n: number) => void;
  onChangeColor: (c: string) => void;
  onClose: () => void;
  // Live rich-text styling — all optional so screens that don't wire them up
  // yet just don't show that row, instead of crashing.
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: TextAlign;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
  onChangeAlign?: (a: TextAlign) => void;
}

export function TextStylePickerSheet({
  visible, fontSize, textColor, onChangeSize, onChangeColor, onClose,
  bold, italic, underline, textAlign, onToggleBold, onToggleItalic, onToggleUnderline, onChangeAlign,
}: Props) {
  const { colors } = useTheme();
  const showRichRow = onToggleBold || onToggleItalic || onToggleUnderline || onChangeAlign;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[s.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={[s.grabber, { backgroundColor: colors.divider }]} />
          <AppText variant="headingSmall" color={colors.textPrimary} align="center" style={s.title}>Text Style</AppText>

          {!!showRichRow && (
            <>
              <AppText variant="bodySmall" color={colors.textMuted} style={s.label}>Style — live updates as you type</AppText>
              <View style={s.row}>
                {!!onToggleBold && (
                  <TouchableOpacity style={[s.styleBtn, { backgroundColor: bold ? colors.primary : colors.bgInput }]} activeOpacity={0.8} onPress={onToggleBold}>
                    <AppText variant="body" color={bold ? colors.bgCard : colors.textPrimary} style={{ fontWeight: '800' }}>B</AppText>
                  </TouchableOpacity>
                )}
                {!!onToggleItalic && (
                  <TouchableOpacity style={[s.styleBtn, { backgroundColor: italic ? colors.primary : colors.bgInput }]} activeOpacity={0.8} onPress={onToggleItalic}>
                    <AppText variant="body" color={italic ? colors.bgCard : colors.textPrimary} style={{ fontStyle: 'italic' }}>I</AppText>
                  </TouchableOpacity>
                )}
                {!!onToggleUnderline && (
                  <TouchableOpacity style={[s.styleBtn, { backgroundColor: underline ? colors.primary : colors.bgInput }]} activeOpacity={0.8} onPress={onToggleUnderline}>
                    <AppText variant="body" color={underline ? colors.bgCard : colors.textPrimary} style={{ textDecorationLine: 'underline' }}>U</AppText>
                  </TouchableOpacity>
                )}
                {!!onChangeAlign && (['left', 'center', 'right'] as TextAlign[]).map(a => {
                  const on = a === textAlign;
                  const icon = a === 'left' ? '⟸' : a === 'center' ? '≡' : '⟹';
                  return (
                    <TouchableOpacity key={a} style={[s.styleBtn, { backgroundColor: on ? colors.primary : colors.bgInput }]} activeOpacity={0.8} onPress={() => onChangeAlign(a)}>
                      <AppText variant="body" color={on ? colors.bgCard : colors.textPrimary}>{icon}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <AppText variant="bodySmall" color={colors.textMuted} style={s.label}>Size</AppText>
          <View style={s.row}>
            {FONT_SIZES.map(sz => {
              const on = sz === fontSize;
              return (
                <TouchableOpacity
                  key={sz}
                  style={[s.sizeBtn, { backgroundColor: on ? colors.primary : colors.bgInput }]}
                  activeOpacity={0.8}
                  onPress={() => onChangeSize(sz)}
                >
                  <AppText variant="body" color={on ? colors.bgCard : colors.textPrimary}>{sz}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText variant="bodySmall" color={colors.textMuted} style={s.label}>Colour</AppText>
          <View style={s.row}>
            {TEXT_COLORS.map(c => {
              const on = c === textColor;
              return (
                <TouchableOpacity
                  key={c}
                  style={[s.colorDot, { backgroundColor: c, borderColor: on ? colors.primary : colors.border, borderWidth: on ? 3 : 1 }]}
                  activeOpacity={0.8}
                  onPress={() => onChangeColor(c)}
                />
              );
            })}
          </View>

          <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85} onPress={onClose}>
            <AppText variant="button" color={colors.bgCard}>Done</AppText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.base },
  title: { marginBottom: Spacing.base },
  label: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.base },
  sizeBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  styleBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  doneBtn: { borderRadius: Radius.full, paddingVertical: Spacing.base, alignItems: 'center', marginTop: Spacing.sm },
});
