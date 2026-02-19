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
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {CategoryChip} from '../components/CategoryChip';
import {useTasksStore} from '../store/useTasksStore';

const reminderOptions = [
  {label: 'Sin recordatorio', value: null},
  {label: '5 min antes', value: 5},
  {label: '10 min antes', value: 10},
  {label: '15 min antes', value: 15},
  {label: '30 min antes', value: 30},
];

const frequencyOptions: {label: string; value: 'daily' | 'weekly' | 'monthly' | 'custom'}[] = [
  {label: 'Diaria', value: 'daily'},
  {label: 'Semanal', value: 'weekly'},
  {label: 'Mensual', value: 'monthly'},
  {label: 'Personalizada', value: 'custom'},
];

export function AddTaskScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {addTask, addRecurring, categories, loadCategories} = useTasksStore();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [intervalDays, setIntervalDays] = useState('7');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (isRecurring) {
      await addRecurring({
        title: title.trim(),
        priority,
        category_id: categoryId,
        notes: notes.trim() || null,
        time,
        frequency,
        interval_days: frequency === 'custom' ? parseInt(intervalDays, 10) || 7 : null,
        reminder_minutes: reminderMinutes,
      });
    } else {
      await addTask({
        title: title.trim(),
        priority,
        date,
        time,
        category_id: categoryId,
        notes: notes.trim() || null,
        reminder_minutes: reminderMinutes,
      });
    }

    navigation.goBack();
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

  return (
    <View style={styles.container}>
      <Header
        title="Nueva Tarea"
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
          placeholder="¿Qué tenés que hacer?"
          placeholderTextColor={colors.textMuted}
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
              <Pressable
                onPress={() => setDate(null)}
                hitSlop={8}>
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
                  <Pressable
                    onPress={() => setTime(null)}
                    hitSlop={8}>
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

        {/* Recurring */}
        <View style={styles.recurringToggle}>
          <Text style={styles.label}>Tarea recurrente</Text>
          <Pressable
            style={[styles.toggle, isRecurring && styles.toggleActive]}
            onPress={() => setIsRecurring(!isRecurring)}>
            <View
              style={[
                styles.toggleThumb,
                isRecurring && styles.toggleThumbActive,
              ]}
            />
          </Pressable>
        </View>

        {isRecurring && (
          <View style={styles.recurringSection}>
            <View style={styles.frequencyRow}>
              {frequencyOptions.map(opt => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.frequencyChip,
                    frequency === opt.value && styles.frequencyChipActive,
                  ]}
                  onPress={() => setFrequency(opt.value)}>
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === opt.value && styles.frequencyTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {frequency === 'custom' && (
              <View style={styles.customInterval}>
                <Text style={styles.customLabel}>Cada</Text>
                <TextInput
                  style={styles.customInput}
                  value={intervalDays}
                  onChangeText={setIntervalDays}
                  keyboardType="number-pad"
                />
                <Text style={styles.customLabel}>días</Text>
              </View>
            )}
          </View>
        )}
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
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutralDark,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textSecondary,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: colors.backgroundDark,
  },
  recurringSection: {
    marginTop: 12,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.cardDark,
  },
  frequencyChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  frequencyText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  frequencyTextActive: {
    color: colors.primary,
  },
  customInterval: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  customLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  customInput: {
    width: 60,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
