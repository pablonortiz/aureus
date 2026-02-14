import React from 'react';
import {StyleSheet, View, ViewStyle, Pressable} from 'react-native';
import {colors, borderRadius} from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'gold' | 'muted';
}

export function Card({children, style, onPress, variant = 'default'}: CardProps) {
  const cardStyle = [
    styles.base,
    variant === 'gold' && styles.gold,
    variant === 'muted' && styles.muted,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  gold: {
    borderColor: colors.borderGold,
  },
  muted: {
    backgroundColor: `${colors.cardDark}80`,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
});
