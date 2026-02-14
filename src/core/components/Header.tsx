import React from 'react';
import {StyleSheet, Text, View, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography} from '../theme';
import {Icon} from './Icon';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

export function Header({title, onBack, rightIcon, onRightPress}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {paddingTop: insets.top + 12}]}>
      <View style={styles.content}>
        <View style={styles.left}>
          {onBack && (
            <Pressable onPress={onBack} style={styles.backButton}>
              <Icon name="chevron-left" size={24} color={colors.primary} />
            </Pressable>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightIcon && (
          <Pressable onPress={onRightPress} style={styles.rightButton}>
            <Icon name={rightIcon} size={24} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGoldLight,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  rightButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
