import React from 'react';
import {StyleSheet, View, Text, Pressable} from 'react-native';
import {fontFamily, borderRadius} from '../../../core/theme';

interface CategoryBadgeProps {
  name: string;
  color: string;
  active?: boolean;
  onPress?: () => void;
}

export function CategoryBadge({name, color, active, onPress}: CategoryBadgeProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: active ? `${color}30` : `${color}10`,
            borderColor: active ? color : 'transparent',
          },
        ]}>
        <View style={[styles.dot, {backgroundColor: color}]} />
        <Text style={[styles.text, {color: active ? color : `${color}cc`}]}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
