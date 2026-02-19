import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {fontFamily, borderRadius} from '../../../core/theme';

const priorityConfig = {
  high: {label: 'ALTA', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)'},
  medium: {label: 'MEDIA', color: '#e8ba30', bg: 'rgba(232, 186, 48, 0.15)'},
  low: {label: 'BAJA', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)'},
};

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
}

export function PriorityBadge({priority}: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <View style={[styles.badge, {backgroundColor: config.bg}]}>
      <Text style={[styles.text, {color: config.color}]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
