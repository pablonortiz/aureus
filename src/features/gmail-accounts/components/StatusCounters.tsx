import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {colors, fontFamily} from '../../../core/theme';
import {statusCountSegments, type StatusCounts} from '../utils/platformStatus';

interface StatusCountersProps {
  counts: StatusCounts;
  /** Leading muted segment, e.g. "En 4 cuentas". */
  prefix?: string;
  /** Shown when every count is zero. */
  emptyText: string;
}

export function StatusCounters({
  counts,
  prefix,
  emptyText,
}: StatusCountersProps) {
  const segments = statusCountSegments(counts);

  if (segments.length === 0 && !prefix) {
    return <Text style={styles.text}>{emptyText}</Text>;
  }

  return (
    <Text style={styles.text}>
      {prefix}
      {segments.map((segment, index) => (
        <Text key={segment.status} style={{color: segment.color}}>
          {(index > 0 || !!prefix) && (
            <Text style={styles.separator}>{'  ·  '}</Text>
          )}
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  separator: {
    color: colors.textMuted,
  },
});
