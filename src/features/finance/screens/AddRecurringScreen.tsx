import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, Text, View, Alert, ScrollView, Pressable, TextInput} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Input, Header, Icon} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import type {RootStackParamList} from '../../../app/navigation/types';

type AddRecurringRoute = RouteProp<RootStackParamList, 'AddRecurring'>;

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadRecurring();
  }, [loadCategories, loadRecurring]);

  // Re-populate when existing data loads
  useEffect(() => {
    if (existing && !title) {
      setTitle(existing.title);
      setRawAmount(amountToRaw(existing.amount));
      setCurrency(existing.currency);
      setDayOfMonth(String(existing.day_of_month));
      setSelectedCategories(existing.categories.map(c => c.id));
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
    setLoading(true);
    try {
      if (isEditing) {
        await updateRecurring(editId!, title, numAmount, currency, day, selectedCategories);
      } else {
        await addRecurring(title, numAmount, currency, day, selectedCategories);
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

      <ScrollView contentContainerStyle={styles.content}>
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

        <Text style={[styles.label, {marginTop: 20}]}>Día del mes (1-31)</Text>
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
