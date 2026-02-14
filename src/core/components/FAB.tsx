import React from 'react';
import {StyleSheet, Pressable} from 'react-native';
import {colors} from '../theme';
import {Icon} from './Icon';

interface FABProps {
  onPress: () => void;
  icon?: string;
  size?: number;
}

export function FAB({onPress, icon = 'add', size = 56}: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.container,
        {width: size, height: size, borderRadius: size / 2},
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={32} color={colors.backgroundDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  pressed: {
    transform: [{scale: 0.9}],
  },
});
