import React from 'react';
import {StyleSheet, Text, View, Pressable} from 'react-native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {PriorityBadge} from './PriorityBadge';
import type {Task} from '../../../core/types';

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
}

export function TaskCard({task, onToggle, onPress}: TaskCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <View
          style={[styles.checkbox, task.is_completed && styles.checkboxCompleted]}>
          {task.is_completed && (
            <Text style={styles.checkIcon}>✓</Text>
          )}
        </View>
      </Pressable>

      <View style={styles.content}>
        <Text
          style={[styles.title, task.is_completed && styles.titleCompleted]}
          numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          {task.category && (
            <View style={styles.categoryTag}>
              <View
                style={[styles.categoryDot, {backgroundColor: task.category.color}]}
              />
              <Text style={styles.categoryText}>{task.category.name}</Text>
            </View>
          )}
          {task.time && (
            <Text style={styles.timeText}>{task.time}</Text>
          )}
        </View>
      </View>

      <PriorityBadge priority={task.priority} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 8,
  },
  cardPressed: {
    borderColor: colors.borderGold,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkIcon: {
    fontSize: 14,
    color: colors.backgroundDark,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
