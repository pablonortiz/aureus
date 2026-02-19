import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, Text, View, Alert, ScrollView, Pressable, TextInput} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Input, Header, Icon} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import type {RootStackParamList} from '../../../app/navigation/types';

type AddRecurringRoute = RouteProp<RootStackParamList, 'AddRecurring'>;

type Frequency = 'monthly' | 'installment' | 'annual';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(',');
  const intPart = parts[0] || '';
  const decPart = parts.length > 1 ? parts[1] : null;
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decPart !== null) {
    return `${formatted},${decPart}`;
  }
  return formatted;
}

function parseRawAmount(raw: string): number {
  if (!raw) return 0;
  const normalized = raw.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function amountToRaw(amount: number): string {
  if (amount === 0) return '';
  const str = amount.toFixed(2);
  const [intPart, decPart] = str.split('.');
  if (decPart === '00') return intPart;
  return `${intPart},${decPart}`;
}

export function AddRecurringScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddRecurringRoute>();
  const insets = useSafeAreaInsets();
  const {
    categories,
    recurring,
    loadCategories,
    loadRecurring,
    addRecurring,
    updateRecurring,
  } = useFinanceStore();

  const editId = route.params?.recurringId;
  const isEditing = !!editId;
  const existing = isEditing ? recurring.find(r => r.id === editId) : null;

  const defaultFreq = route.params?.defaultFrequency || 'monthly';

  const [frequency, setFrequency] = useState<Frequency>(
    (existing?.frequency as Frequency) || defaultFreq,
  );
  const [title, setTitle] = useState(existing?.title || '');
  const [rawAmount, setRawAmount] = useState(
    existing ? amountToRaw(existing.amount) : '',
  );
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(
    existing?.currency || 'ARS',
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    existing ? String(existing.day_of_month) : '',
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    existing?.categories.map(c => c.id) || [],
  );
  // Installment fields
  const now = new Date();
  const [totalInstallments, setTotalInstallments] = useState(
    existing?.total_installments ? String(existing.total_installments) : '',
  );
  const [startMonth, setStartMonth] = useState(
    existing?.start_month ? String(existing.start_month) : String(now.getMonth() + 1),
  );
  const [startYear, setStartYear] = useState(
    existing?.start_year ? String(existing.start_year) : String(now.getFullYear()),
  );
  // Annual fields
  const [monthOfYear, setMonthOfYear] = useState(
    existing?.month_of_year ? String(existing.month_of_year) : String(now.getMonth() + 1),
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadRecurring();
  }, [loadCategories, loadRecurring]);

  // Re-populate when existing data loads
  useEffect(() => {
    if (existing && !title) {
      setFrequency((existing.frequency as Frequency) || 'monthly');
      setTitle(existing.title);
      setRawAmount(amountToRaw(existing.amount));
      setCurrency(existing.currency);
      setDayOfMonth(String(existing.day_of_month));
      setSelectedCategories(existing.categories.map(c => c.id));
      if (existing.total_installments) setTotalInstallments(String(existing.total_installments));
      if (existing.start_month) setStartMonth(String(existing.start_month));
      if (existing.start_year) setStartYear(String(existing.start_year));
      if (existing.month_of_year) setMonthOfYear(String(existing.month_of_year));
    }
  }, [existing]);

  const handleAmountChange = useCallback((text: string) => {
    let cleaned = text.replace(/[^0-9,]/g, '');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      const beforeComma = cleaned.slice(0, commaIndex).replace(/,/g, '');
      const afterComma = cleaned.slice(commaIndex + 1).replace(/,/g, '');
      cleaned = `${beforeComma},${afterComma.slice(0, 2)}`;
    }
    if (!cleaned.startsWith('0,') && cleaned.length > 1) {
      cleaned = cleaned.replace(/^0+/, '') || '';
    }
    setRawAmount(cleaned);
  }, []);

  const handleDayChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (cleaned === '' || (num >= 1 && num <= 31)) {
      setDayOfMonth(cleaned);
    }
  }, []);

  const handleNumChange = useCallback((text: string, setter: (v: string) => void, max?: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (max) {
      const num = parseInt(cleaned, 10);
      if (cleaned !== '' && num > max) return;
    }
    setter(cleaned);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Ingresá un título');
      return;
    }
    const numAmount = parseRawAmount(rawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Error', 'Ingresá un día del mes válido (1-31)');
      return;
    }

    let installmentsVal: number | null = null;
    let startMonthVal: number | null = null;
    let startYearVal: number | null = null;
    let monthOfYearVal: number | null = null;

    if (frequency === 'installment') {
      installmentsVal = parseInt(totalInstallments, 10);
      startMonthVal = parseInt(startMonth, 10);
      startYearVal = parseInt(startYear, 10);
      if (!installmentsVal || installmentsVal < 1) {
        Alert.alert('Error', 'Ingresá la cantidad de cuotas');
        return;
      }
      if (!startMonthVal || startMonthVal < 1 || startMonthVal > 12) {
        Alert.alert('Error', 'Ingresá un mes de inicio válido (1-12)');
        return;
      }
      if (!startYearVal || startYearVal < 2020) {
        Alert.alert('Error', 'Ingresá un año de inicio válido');
        return;
      }
    }

    if (frequency === 'annual') {
      monthOfYearVal = parseInt(monthOfYear, 10);
      if (!monthOfYearVal || monthOfYearVal < 1 || monthOfYearVal > 12) {
        Alert.alert('Error', 'Ingresá un mes válido (1-12)');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateRecurring(
          editId!, title, numAmount, currency, day, selectedCategories,
          frequency, installmentsVal, startMonthVal, startYearVal, monthOfYearVal,
        );
      } else {
        await addRecurring(
          title, numAmount, currency, day, selectedCategories,
          frequency, installmentsVal, startMonthVal, startYearVal, monthOfYearVal,
        );
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const amountPrefix = currency === 'USD' ? 'US$' : '$';

  return (
    <View style={styles.container}>
      <Header
        title={isEditing ? 'Editar Recurrente' : 'Nuevo Recurrente'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 24 + insets.bottom}]}>
        {/* Frequency toggle */}
        <View style={styles.freqToggle}>
          {(['monthly', 'installment', 'annual'] as Frequency[]).map(f => {
            const isActive = frequency === f;
            const label = f === 'monthly' ? 'Mensual' : f === 'installment' ? 'Cuotas' : 'Anual';
            return (
              <Pressable
                key={f}
                style={[styles.freqBtn, isActive && styles.freqBtnActive]}
                onPress={() => setFrequency(f)}>
                <Text style={[styles.freqBtnText, isActive && styles.freqBtnTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Currency toggle */}
        <View style={styles.currencyToggle}>
          <Pressable
            style={[
              styles.currencyBtn,
              currency === 'ARS' && styles.currencyBtnActive,
            ]}
            onPress={() => setCurrency('ARS')}>
            <Text
              style={[
                styles.currencyBtnText,
                currency === 'ARS' && styles.currencyBtnTextActive,
              ]}>
              $ ARS
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.currencyBtn,
              currency === 'USD' && styles.currencyBtnActiveUsd,
            ]}
            onPress={() => setCurrency('USD')}>
            <Text
              style={[
                styles.currencyBtnText,
                currency === 'USD' && styles.currencyBtnTextActiveUsd,
              ]}>
              US$ USD
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Título</Text>
        <Input placeholder="Ej: Netflix, Gimnasio" value={title} onChangeText={setTitle} />

        <Text style={[styles.label, {marginTop: 20}]}>Monto ({amountPrefix})</Text>
        <View style={[
          styles.amountContainer,
          currency === 'USD' && styles.amountContainerUsd,
        ]}>
          <Text style={[
            styles.amountPrefix,
            currency === 'USD' && styles.amountPrefixUsd,
          ]}>
            {amountPrefix}
          </Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={formatCurrency(rawAmount)}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={[styles.label, {marginTop: 20}]}>
          Día del mes (1-31)
        </Text>
        <View style={styles.dayContainer}>
          <Icon name="calendar-today" size={20} color={colors.primary} />
          <TextInput
            style={styles.dayInput}
            placeholder="15"
            placeholderTextColor={colors.textMuted}
            value={dayOfMonth}
            onChangeText={handleDayChange}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Installment-specific fields */}
        {frequency === 'installment' && (
          <>
            <Text style={[styles.label, {marginTop: 20}]}>Cantidad de cuotas</Text>
            <View style={styles.dayContainer}>
              <Icon name="format-list-numbered" size={20} color={colors.primary} />
              <TextInput
                style={styles.dayInput}
                placeholder="12"
                placeholderTextColor={colors.textMuted}
                value={totalInstallments}
                onChangeText={t => handleNumChange(t, setTotalInstallments)}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            <Text style={[styles.label, {marginTop: 20}]}>Mes y año de inicio</Text>
            <View style={styles.startRow}>
              <View style={[styles.dayContainer, {flex: 1}]}>
                <TextInput
                  style={styles.dayInput}
                  placeholder="Mes (1-12)"
                  placeholderTextColor={colors.textMuted}
                  value={startMonth}
                  onChangeText={t => handleNumChange(t, setStartMonth, 12)}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={[styles.dayContainer, {flex: 1}]}>
                <TextInput
                  style={styles.dayInput}
                  placeholder="Año"
                  placeholderTextColor={colors.textMuted}
                  value={startYear}
                  onChangeText={t => handleNumChange(t, setStartYear)}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
            {startMonth && parseInt(startMonth, 10) >= 1 && parseInt(startMonth, 10) <= 12 && (
              <Text style={styles.helperText}>
                Inicio: {MONTH_NAMES[parseInt(startMonth, 10) - 1]} {startYear}
              </Text>
            )}
          </>
        )}

        {/* Annual-specific fields */}
        {frequency === 'annual' && (
          <>
            <Text style={[styles.label, {marginTop: 20}]}>Mes del año (1-12)</Text>
            <View style={styles.dayContainer}>
              <Icon name="event" size={20} color={colors.primary} />
              <TextInput
                style={styles.dayInput}
                placeholder="6"
                placeholderTextColor={colors.textMuted}
                value={monthOfYear}
                onChangeText={t => handleNumChange(t, setMonthOfYear, 12)}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            {monthOfYear && parseInt(monthOfYear, 10) >= 1 && parseInt(monthOfYear, 10) <= 12 && (
              <Text style={styles.helperText}>
                Se cobra en {MONTH_NAMES[parseInt(monthOfYear, 10) - 1]}
              </Text>
            )}
          </>
        )}

        <Text style={[styles.label, {marginTop: 20}]}>
          Categorías{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
        </Text>
        <View style={styles.catGrid}>
          {categories.map(cat => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.catOption,
                  isSelected && {
                    backgroundColor: cat.color || colors.primary,
                    borderColor: cat.color || colors.primary,
                  },
                ]}
                onPress={() => {
                  setSelectedCategories(prev =>
                    prev.includes(cat.id)
                      ? prev.filter(id => id !== cat.id)
                      : [...prev, cat.id],
                  );
                }}>
                <Icon
                  name={cat.icon || 'label'}
                  size={16}
                  color={isSelected ? colors.backgroundDark : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.catOptionText,
                    isSelected && styles.catOptionTextActive,
                  ]}>
                  {cat.name}
                </Text>
                {isSelected && (
                  <Icon name="check" size={14} color={colors.backgroundDark} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Button
          title={isEditing ? 'Guardar cambios' : 'Crear recurrente'}
          onPress={handleSave}
          icon="save"
          loading={loading}
          fullWidth
          style={{marginTop: 32}}
        />
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
    padding: 24,
  },
  freqToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  freqBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
  },
  freqBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  freqBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  freqBtnTextActive: {
    color: colors.primary,
  },
  currencyToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  currencyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
  },
  currencyBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  currencyBtnActiveUsd: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#60a5fa',
  },
  currencyBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textMuted,
  },
  currencyBtnTextActive: {
    color: colors.primary,
  },
  currencyBtnTextActiveUsd: {
    color: '#60a5fa',
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    height: 56,
  },
  amountContainerUsd: {
    borderColor: '#60a5fa',
  },
  amountPrefix: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.primary,
    marginRight: 8,
  },
  amountPrefixUsd: {
    color: '#60a5fa',
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: colors.textPrimary,
    padding: 0,
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  dayInput: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: colors.textPrimary,
    padding: 0,
  },
  startRow: {
    flexDirection: 'row',
    gap: 12,
  },
  helperText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(232, 186, 48, 0.2)',
  },
  catOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  catOptionTextActive: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
});
