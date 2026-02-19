import React from 'react';
import {StyleSheet, Text, Pressable, View} from 'react-native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';

interface CategoryChipProps {
  name: string;
  color: string;
  active?: boolean;
  onPress?: () => void;
}

export function CategoryChip({name, color, active, onPress}: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {borderColor: color, backgroundColor: `${color}15`},
      ]}>
      <View style={[styles.dot, {backgroundColor: color}]} />
      <Text
        style={[
          styles.text,
          active && {color: colors.textPrimary},
        ]}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.cardDark,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
