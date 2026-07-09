import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AppText } from './AppText';
import { Colors } from '../theme/colors';
import { FontFamily, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface Props extends TextInputProps {
  label?:       string;
  error?:       string;
  leftIcon?:    React.ReactNode;
  rightIcon?:   React.ReactNode;
  onRightPress?: () => void;
}

export function AppInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightPress,
  style,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.wrapper}>
      {!!label && (
        <AppText variant="label" color={Colors.textSecondary} style={s.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          s.inputRow,
          focused && s.focused,
          !!error && s.errored,
        ]}
      >
        {leftIcon && <View style={s.icon}>{leftIcon}</View>}
        <TextInput
          style={[s.input, style]}
          placeholderTextColor={Colors.textLight}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity
            style={s.icon}
            onPress={onRightPress}
            disabled={!onRightPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {!!error && (
        <AppText variant="caption" color={Colors.error} style={s.errorText}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:   { gap: 6 },
  label:     { marginBottom: 2 },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgInput,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.md,
  },
  focused:   { borderColor: Colors.primary },
  errored:   { borderColor: Colors.error },
  icon:      { marginRight: Spacing.sm },
  input: {
    flex:            1,
    fontFamily:      FontFamily.regular,
    fontSize:        FontSize.base,
    color:           Colors.textPrimary,
    paddingVertical: Spacing.md,
    // Android reserves extra glyph padding that iOS doesn't, which makes a
    // single-line input's text sit visibly higher/lower than its container
    // (and throws off the row's perceived spacing vs. the iOS build).
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : null),
  },
  errorText: { marginTop: 2 },
});
