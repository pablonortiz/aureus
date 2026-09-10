import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {PLATFORM_STATUS_META, PLATFORM_STATUSES} from '../utils/platformStatus';

export function StatusLegend() {
  return (
    <View style={styles.container}>
      {PLATFORM_STATUSES.map(status => {
        const meta = PLATFORM_STATUS_META[status];
        return (
          <View key={status} style={styles.item}>
            <View style={[styles.dot, {backgroundColor: meta.color}]} />
            <Text style={styles.label}>{meta.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
