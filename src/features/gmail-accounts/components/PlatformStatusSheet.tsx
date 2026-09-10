import React from 'react';
import {StyleSheet, Text, View, Pressable, Modal} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {AccountPlatform, PlatformStatus} from '../../../core/types';
import {PLATFORM_STATUS_META, PLATFORM_STATUSES} from '../utils/platformStatus';

interface PlatformStatusSheetProps {
  visible: boolean;
  platform: AccountPlatform | null;
  email: string;
  onSelect: (status: PlatformStatus) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function PlatformStatusSheet({
  visible,
  platform,
  email,
  onSelect,
  onRemove,
  onClose,
}: PlatformStatusSheetProps) {
  const insets = useSafeAreaInsets();

  if (!platform) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: 20 + insets.bottom}]}
          onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{platform.platform_name}</Text>
          <Text style={styles.subtitle}>{email}</Text>

          {PLATFORM_STATUSES.map(status => {
            const meta = PLATFORM_STATUS_META[status];
            const isCurrent = status === platform.status;
            return (
              <Pressable
                key={status}
                onPress={() => onSelect(status)}
                style={({pressed}) => [styles.option, pressed && styles.pressed]}>
                <View style={[styles.dot, {backgroundColor: meta.color}]} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, {color: meta.color}]}>
                    {meta.label}
                  </Text>
                  <Text style={styles.optionHint}>{meta.hint}</Text>
                </View>
                {isCurrent && (
                  <Icon name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}

          <Pressable
            onPress={onRemove}
            style={({pressed}) => [
              styles.option,
              styles.removeOption,
              pressed && styles.pressed,
            ]}>
            <Icon name="delete-outline" size={20} color={colors.dangerRed} />
            <Text style={styles.removeLabel}>Quitar de esta cuenta</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutralDark,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
  },
  optionHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeOption: {
    marginTop: 4,
  },
  removeLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.dangerRed,
  },
});
