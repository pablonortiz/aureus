import React from 'react';
import {StyleSheet, View, Text, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';

interface GalleryHeaderProps {
  title: string;
  onBack?: () => void;
  rightActions?: Array<{icon: string; onPress: () => void}>;
}

export function GalleryHeader({title, onBack, rightActions}: GalleryHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, {paddingTop: insets.top + 8}]}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightActions && rightActions.length > 0 && (
        <View style={styles.right}>
          {rightActions.map((action, i) => (
            <Pressable key={i} onPress={action.onPress} style={styles.actionBtn}>
              <Icon name={action.icon} size={22} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
