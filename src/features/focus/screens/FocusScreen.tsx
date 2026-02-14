import React, {useEffect, useRef, useState, useCallback} from 'react';
import {StyleSheet, Text, View, Pressable, FlatList, TextInput, Alert, Modal} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {useFocusStore} from '../store/useFocusStore';
import type {FocusTask} from '../../../core/types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function TaskItem({task, onToggle}: {task: FocusTask; onToggle: () => void}) {
  return (
    <Pressable onPress={onToggle} style={styles.taskItem}>
      <View
        style={[styles.checkbox, task.is_completed && styles.checkboxCompleted]}>
        {task.is_completed && (
          <Icon name="check" size={16} color={colors.backgroundDark} />
        )}
      </View>
      <Text style={[styles.taskText, task.is_completed && styles.taskTextCompleted]}>
        {task.title}
      </Text>
    </Pressable>
  );
}

export function FocusScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    tasks,
    currentSession,
    totalSessions,
    timerSeconds,
    isRunning,
    loadTasks,
    loadSessions,
    addTask,
    toggleTask,
    completeSession,
    setTimerSeconds,
    setIsRunning,
    resetTimer,
    skipSession,
    sessionDuration,
    setSessionDuration,
    loadSessionDuration,
  } = useFocusStore();

  const [newTask, setNewTask] = useState('');
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const durationOptions = [15, 20, 25, 30, 45, 60, 90];
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTasks();
    loadSessions();
    loadSessionDuration();
  }, [loadTasks, loadSessions, loadSessionDuration]);

  useEffect(() => {
    if (isRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(timerSeconds - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isRunning) {
      setIsRunning(false);
      completeSession();
      Alert.alert('Sesión completada', '¡Buen trabajo! Tomá un descanso.');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timerSeconds]);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await addTask(newTask.trim());
    setNewTask('');
  };

  const completedTasks = tasks.filter(t => t.is_completed).length;
  const progress = timerSeconds / (sessionDuration * 60);

  const handleSelectDuration = useCallback(async (minutes: number) => {
    await setSessionDuration(minutes);
    setShowDurationPicker(false);
  }, [setSessionDuration]);
  // SVG-like circle progress using border trick
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - (1 - progress));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>DEEP WORK</Text>
          <Text style={styles.headerSub}>
            Sesión {currentSession} de {totalSessions}
          </Text>
        </View>
        <Pressable
          style={styles.durationBadge}
          onPress={() => !isRunning && setShowDurationPicker(true)}>
          <Icon name="timer" size={16} color={colors.primary} />
          <Text style={styles.durationBadgeText}>{sessionDuration}m</Text>
        </Pressable>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <View
            style={[
              styles.timerRing,
              {
                borderColor: isRunning ? colors.primary : colors.borderGold,
              },
            ]}
          />
          <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
          <Text style={styles.timerLabel}>MINUTOS RESTANTES</Text>
        </View>
      </View>

      {/* Tasks */}
      <View style={styles.tasksSection}>
        <View style={styles.tasksHeader}>
          <Text style={styles.tasksTitle}>Enfoque de Hoy</Text>
          <Text style={styles.tasksCount}>
            {completedTasks}/{tasks.length} Hechas
          </Text>
        </View>

        <FlatList
          data={tasks}
          renderItem={({item}) => (
            <TaskItem task={item} onToggle={() => toggleTask(item.id)} />
          )}
          keyExtractor={item => String(item.id)}
          style={styles.tasksList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Sin tareas para hoy</Text>
          }
        />

        <Pressable style={styles.addTaskBtn} onPress={handleAddTask}>
          <Icon name="add-circle-outline" size={18} color={colors.primary} />
          <TextInput
            style={styles.addTaskInput}
            placeholder="Agregar tarea de enfoque"
            placeholderTextColor={colors.primary}
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
        </Pressable>
      </View>

      {/* Controls */}
      <View style={[styles.controls, {paddingBottom: insets.bottom + 24}]}>
        <Pressable style={styles.controlBtn} onPress={resetTimer}>
          <Icon name="refresh" size={24} color={colors.primary} />
        </Pressable>
        <Pressable
          style={styles.playBtn}
          onPress={() => setIsRunning(!isRunning)}>
          <Icon
            name={isRunning ? 'pause' : 'play-arrow'}
            size={36}
            color={colors.backgroundDark}
          />
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={skipSession}>
          <Icon name="skip-next" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Duration Picker Modal */}
      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDurationPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Duración de sesión</Text>
            <View style={styles.durationGrid}>
              {durationOptions.map(min => (
                <Pressable
                  key={min}
                  style={[
                    styles.durationOption,
                    sessionDuration === min && styles.durationOptionActive,
                  ]}
                  onPress={() => handleSelectDuration(min)}>
                  <Text
                    style={[
                      styles.durationOptionText,
                      sessionDuration === min && styles.durationOptionTextActive,
                    ]}>
                    {min}
                  </Text>
                  <Text
                    style={[
                      styles.durationOptionLabel,
                      sessionDuration === min && styles.durationOptionTextActive,
                    ]}>
                    min
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  timerCircle: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
  },
  timerText: {
    fontFamily: fontFamily.light,
    fontSize: 64,
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  timerLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  tasksSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  tasksCount: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 8,
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
  taskText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addTaskInput: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.primary,
    padding: 0,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 16,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  durationBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  durationOption: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationOptionText: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  durationOptionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -2,
  },
  durationOptionTextActive: {
    color: colors.backgroundDark,
  },
});
