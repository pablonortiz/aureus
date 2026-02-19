import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {CategoryChip} from '../components/CategoryChip';
import {useTasksStore} from '../store/useTasksStore';
import {getDatabase} from '../../../core/database';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {Task} from '../../../core/types';

const reminderOptions = [
  {label: 'Sin recordatorio', value: null},
  {label: '5 min antes', value: 5},
  {label: '10 min antes', value: 10},
  {label: '15 min antes', value: 15},
  {label: '30 min antes', value: 30},
];

export function EditTaskScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTask'>>();
  const {taskId} = route.params;
  const {updateTask, deleteTask, categories, loadCategories} = useTasksStore();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTask();
  }, []);

  const loadTask = async () => {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      setTitle(row.title as string);
      setPriority((row.priority as Task['priority']) || 'medium');
      setDate((row.date as string) || null);
      setTime((row.time as string) || null);
      setCategoryId((row.category_id as number) || null);
      setNotes((row.notes as string) || '');
      setReminderMinutes((row.reminder_minutes as number) ?? null);
      setLoaded(true);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    await updateTask(taskId, {
      title: title.trim(),
      priority,
      date,
      time,
      category_id: categoryId,
      notes: notes.trim() || null,
      reminder_minutes: reminderMinutes,
    });

    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Eliminar tarea', '¿Estás seguro?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(taskId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleDateConfirm = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      setDate(dateInput);
    }
    setShowDatePicker(false);
  };

  const handleTimeConfirm = () => {
    if (/^\d{2}:\d{2}$/.test(timeInput)) {
      setTime(timeInput);
    }
    setShowTimePicker(false);
  };

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Header
        title="Editar Tarea"
        onBack={() => navigation.goBack()}
        rightIcon="check"
        onRightPress={handleSave}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: 40 + insets.bottom},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        {/* Priority */}
        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.priorityRow}>
          {(['high', 'medium', 'low'] as const).map(p => {
            const config = {
              high: {label: 'Alta', color: '#ef4444'},
              medium: {label: 'Media', color: '#e8ba30'},
              low: {label: 'Baja', color: '#94a3b8'},
            };
            const c = config[p];
            const isActive = priority === p;
            return (
              <Pressable
                key={p}
                style={[
                  styles.priorityChip,
                  isActive && {
                    backgroundColor: `${c.color}20`,
                    borderColor: c.color,
                  },
                ]}
                onPress={() => setPriority(p)}>
                <Text
                  style={[
                    styles.priorityText,
                    isActive && {color: c.color},
                  ]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date */}
        <Text style={styles.label}>Fecha</Text>
        {showDatePicker ? (
          <View style={styles.inlineInput}>
            <TextInput
              style={styles.dateTimeInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={dateInput}
              onChangeText={setDateInput}
              autoFocus
              onSubmitEditing={handleDateConfirm}
            />
            <Pressable onPress={handleDateConfirm}>
              <Icon name="check" size={20} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.pickerButton}
            onPress={() => {
              setDateInput(date || '');
              setShowDatePicker(true);
            }}>
            <Icon name="calendar-today" size={18} color={colors.textMuted} />
            <Text style={styles.pickerText}>
              {date || 'Sin fecha (siempre hoy)'}
            </Text>
            {date && (
              <Pressable onPress={() => setDate(null)} hitSlop={8}>
                <Icon name="close" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>
        )}

        {/* Time */}
        {date && (
          <>
            <Text style={styles.label}>Hora</Text>
            {showTimePicker ? (
              <View style={styles.inlineInput}>
                <TextInput
                  style={styles.dateTimeInput}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  value={timeInput}
                  onChangeText={setTimeInput}
                  autoFocus
                  onSubmitEditing={handleTimeConfirm}
                />
                <Pressable onPress={handleTimeConfirm}>
                  <Icon name="check" size={20} color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.pickerButton}
                onPress={() => {
                  setTimeInput(time || '');
                  setShowTimePicker(true);
                }}>
                <Icon name="schedule" size={18} color={colors.textMuted} />
                <Text style={styles.pickerText}>
                  {time || 'Sin hora'}
                </Text>
                {time && (
                  <Pressable onPress={() => setTime(null)} hitSlop={8}>
                    <Icon name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </Pressable>
            )}
          </>
        )}

        {/* Category */}
        <Text style={styles.label}>Categoría</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}>
          <CategoryChip
            name="Ninguna"
            color={colors.textMuted}
            active={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.map(cat => (
            <CategoryChip
              key={cat.id}
              name={cat.name}
              color={cat.color}
              active={categoryId === cat.id}
              onPress={() => setCategoryId(cat.id)}
            />
          ))}
        </ScrollView>

        {/* Notes */}
        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notas adicionales..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Reminder */}
        {date && time && (
          <>
            <Text style={styles.label}>Recordatorio</Text>
            <View style={styles.reminderRow}>
              {reminderOptions.map(opt => (
                <Pressable
                  key={String(opt.value)}
                  style={[
                    styles.reminderChip,
                    reminderMinutes === opt.value && styles.reminderChipActive,
                  ]}
                  onPress={() => setReminderMinutes(opt.value)}>
                  <Text
                    style={[
                      styles.reminderText,
                      reminderMinutes === opt.value && styles.reminderTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Delete */}
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Icon name="delete" size={18} color={colors.dangerRed} />
          <Text style={styles.deleteText}>Eliminar tarea</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.cardDark,
  },
  priorityText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  inlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateTimeInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  categoriesScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.cardDark,
  },
  reminderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  reminderText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reminderTextActive: {
    color: colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.dangerRed,
  },
});
