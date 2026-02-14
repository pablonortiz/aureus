import React from 'react';
import {StyleSheet, Text, Pressable, View} from 'react-native';
import {colors, borderRadius, fontFamily} from '../theme';
import {Icon} from './Icon';

interface ChipProps {
  label: string;
  completed?: boolean;
  onPress?: () => void;
  active?: boolean;
  icon?: string;
}

export function Chip({label, completed, onPress, active, icon}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        completed && styles.completed,
        active && styles.active,
      ]}>
      {icon && (
        <Icon
          name={completed ? 'check-circle' : icon}
          size={14}
          color={completed ? colors.textMuted : colors.primary}
        />
      )}
      <Text
        style={[
          styles.label,
          completed && styles.labelCompleted,
          active && styles.labelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  completed: {
    borderColor: colors.transparent,
    backgroundColor: colors.neutralDark,
    opacity: 0.4,
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  labelCompleted: {
    color: colors.textPrimary,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  labelActive: {
    color: colors.backgroundDark,
  },
});
