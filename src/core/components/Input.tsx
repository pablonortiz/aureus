import React from 'react';
import {StyleSheet, TextInput, View, TextInputProps} from 'react-native';
import {colors, borderRadius, fontFamily} from '../theme';
import {Icon} from './Icon';

interface InputProps extends TextInputProps {
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

export function Input({icon, rightIcon, onRightIconPress, style, ...props}: InputProps) {
  return (
    <View style={[styles.container, style as any]}>
      {icon && <Icon name={icon} size={20} color={colors.textMuted} />}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
      {rightIcon && (
        <Icon name={rightIcon} size={20} color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
});
