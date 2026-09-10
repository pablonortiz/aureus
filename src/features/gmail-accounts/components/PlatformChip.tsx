import React from 'react';
import {StyleSheet, Text, Pressable} from 'react-native';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {PlatformStatus} from '../../../core/types';
import {PLATFORM_STATUS_META} from '../utils/platformStatus';

interface PlatformChipProps {
  label: string;
  status: PlatformStatus;
  onPress: () => void;
  onLongPress: () => void;
}

export function PlatformChip({
  label,
  status,
  onPress,
  onLongPress,
}: PlatformChipProps) {
  const meta = PLATFORM_STATUS_META[status];

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      style={({pressed}) => [
        styles.base,
        statusStyles[status],
        pressed && styles.pressed,
      ]}>
      <Icon name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.label, {color: meta.color}, labelStyles[status]]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AddPlatformChip({onPress}: {onPress: () => void}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        styles.add,
        pressed && styles.pressed,
      ]}>
      <Icon name="add" size={14} color={colors.primary} />
      <Text style={[styles.label, {color: colors.primary}]}>Agregar</Text>
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
  },
  pressed: {
    opacity: 0.6,
  },
  pending: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  created: {
    borderColor: colors.successGreen,
    backgroundColor: colors.successGreenLight,
  },
  finished: {
    borderColor: colors.transparent,
    backgroundColor: colors.neutralDark,
    opacity: 0.5,
  },
  add: {
    borderColor: colors.primaryMuted,
    borderStyle: 'dashed',
    backgroundColor: colors.transparent,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
  labelFinished: {
    textDecorationLine: 'line-through',
  },
});

const statusStyles = {
  pending: styles.pending,
  created: styles.created,
  finished: styles.finished,
};

const labelStyles = {
  pending: undefined,
  created: undefined,
  finished: styles.labelFinished,
};
