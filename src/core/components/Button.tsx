import React from 'react';
import {StyleSheet, Text, Pressable, ViewStyle, ActivityIndicator} from 'react-native';
import {colors, borderRadius, fontFamily} from '../theme';
import {Icon} from './Icon';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: string;
  style?: ViewStyle;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  loading,
  fullWidth,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({pressed}) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.backgroundDark : colors.primary}
        />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={20}
              color={
                variant === 'primary' ? colors.backgroundDark : colors.primary
              }
            />
          )}
          <Text
            style={[
              styles.label,
              variant !== 'primary' && styles.labelOutline,
            ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.backgroundDark,
  },
  labelOutline: {
    color: colors.primary,
  },
});
