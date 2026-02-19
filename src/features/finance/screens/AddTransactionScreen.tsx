import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, Text, View, Alert, ScrollView, Pressable, TextInput} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Input, Header, Icon} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import type {RootStackParamList} from '../../../app/navigation/types';
import {getDatabase} from '../../../core/database';
import type {FinanceCategory} from '../../../core/types';

type AddTransactionRoute = RouteProp<RootStackParamList, 'AddTransaction'>;

function formatCurrency(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(',');
  const intPart = parts[0] || '';
  const decPart = parts.length > 1 ? parts[1] : null;

  // Add thousand separators with dots
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (decPart !== null) {
    return `${formatted},${decPart}`;
  }
  return formatted;
}

function parseRawAmount(raw: string): number {
  if (!raw) return 0;
  // raw is like "10000" or "10000,50"
  const normalized = raw.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function amountToRaw(amount: number): string {
  if (amount === 0) return '';
  const str = amount.toFixed(2);
  // Convert "1234.50" → "1234,50" or "1234.00" → "1234"
  const [intPart, decPart] = str.split('.');
  if (decPart === '00') return intPart;
  return `${intPart},${decPart}`;
}

export function AddTransactionScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddTransactionRoute>();
  const insets = useSafeAreaInsets();
  const {
    addTransaction,
    updateTransaction,
    categories,
    loadCategories,
    confirmPendingTransaction,
    dismissPendingTransaction,
    salaryAmount,
    loadSalaryAmount,
    registerSalary,
  } = useFinanceStore();

  const params = route.params;
  const isPendingMode = !!params?.pendingTransactionId;
  const isEditMode = !!params?.editTransactionId;

  const [title, setTitle] = useState(params?.prefillTitle || '');
  const [rawAmount, setRawAmount] = useState(
    params?.prefillAmount ? amountToRaw(params.prefillAmount) : '',
  );
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(
    params?.prefillCurrency || 'ARS',
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    params?.prefillCategoryIds || [],
  );
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);

  const isToday = (() => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  })();

  const formatDateLabel = (d: Date): string => {
    return d.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const toDateStr = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    loadCategories();
    loadSalaryAmount();
  }, [loadCategories, loadSalaryAmount]);

  // Load existing transaction data for edit mode
  useEffect(() => {
    if (!isEditMode || editLoaded) return;
    const loadEditData = async () => {
      const db = getDatabase();
      const txResult = await db.execute(
        'SELECT * FROM finance_transactions WHERE id = ?',
        [params!.editTransactionId!],
      );
      if (txResult.rows.length === 0) return;
      const tx = txResult.rows[0];
      setTitle(tx.title as string);
      setRawAmount(amountToRaw(tx.amount as number));
      setType((tx.type as string) as 'expense' | 'income');
      setCurrency(((tx.currency as string) || 'ARS') as 'ARS' | 'USD');
      if (tx.date) {
        const d = new Date(tx.date as string);
        if (!isNaN(d.getTime())) setDate(d);
      }
      // Load categories
      const catResult = await db.execute(
        'SELECT category_id FROM finance_transaction_categories WHERE transaction_id = ?',
        [params!.editTransactionId!],
      );
      setSelectedCategories(catResult.rows.map(r => r.category_id as number));
      setEditLoaded(true);
    };
    loadEditData();
  }, [isEditMode, editLoaded, params]);

  const handleAmountChange = useCallback((text: string) => {
    // Strip everything except digits and comma
    let cleaned = text.replace(/[^0-9,]/g, '');

    // Only allow one comma
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      const beforeComma = cleaned.slice(0, commaIndex).replace(/,/g, '');
      const afterComma = cleaned.slice(commaIndex + 1).replace(/,/g, '');
      cleaned = `${beforeComma},${afterComma.slice(0, 2)}`;
    }

    // Remove leading zeros (but keep "0," for decimals)
    if (!cleaned.startsWith('0,') && cleaned.length > 1) {
      cleaned = cleaned.replace(/^0+/, '') || '';
    }

    setRawAmount(cleaned);
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !rawAmount.trim()) {
      Alert.alert('Error', 'Completá el título y el monto');
      return;
    }
    const numAmount = parseRawAmount(rawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    setLoading(true);
    try {
      if (isEditMode) {
        await updateTransaction(
          params!.editTransactionId!, title, numAmount, type,
          selectedCategories, currency, undefined, toDateStr(date),
        );
      } else {
        await addTransaction(
          title, numAmount, type, selectedCategories, currency,
          'confirmed', null, undefined, toDateStr(date),
        );
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!rawAmount.trim()) {
      Alert.alert('Error', 'Ingresá un monto');
      return;
    }
    const numAmount = parseRawAmount(rawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    setLoading(true);
    try {
      await confirmPendingTransaction(params!.pendingTransactionId!, numAmount);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al confirmar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    Alert.alert(
      'Descartar',
      '¿Descartar esta transacción pendiente? Se regenerará el próximo mes.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            await dismissPendingTransaction(params!.pendingTransactionId!);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleRegisterSalary = async () => {
    setSalaryLoading(true);
    try {
      await registerSalary();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al registrar el sueldo');
    } finally {
      setSalaryLoading(false);
    }
  };

  const formattedSalary = salaryAmount > 0
    ? `$${salaryAmount.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`
    : '';

  const amountPrefix = currency === 'USD' ? 'US$' : '$';

  return (
    <View style={styles.container}>
      <Header
        title={isPendingMode ? 'Confirmar Transacción' : isEditMode ? 'Editar Transacción' : 'Nueva Transacción'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 24 + insets.bottom}]}>
        {/* Salary quick-register banner */}
        {!isPendingMode && !isEditMode && salaryAmount > 0 && (
          <Pressable
            style={styles.salaryBanner}
            onPress={handleRegisterSalary}
            disabled={salaryLoading}>
            <View style={styles.salaryBannerIcon}>
              <Icon name="payments" size={22} color="#22c55e" />
            </View>
            <View style={styles.salaryBannerInfo}>
              <Text style={styles.salaryBannerTitle}>
                {salaryLoading ? 'Registrando...' : `Cobré el sueldo · ${formattedSalary}`}
              </Text>
              <Text style={styles.salaryBannerSub}>Toca para registrar como ingreso</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#22c55e" />
          </Pressable>
        )}

        {/* Type toggle — hidden in pending mode (always expense) */}
        {!isPendingMode && (
          <View style={styles.typeToggle}>
            <Pressable
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
              onPress={() => setType('expense')}>
              <Icon
                name="trending-down"
                size={16}
                color={type === 'expense' ? colors.backgroundDark : colors.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'expense' && styles.typeBtnTextActive,
                ]}>
                Gasto
              </Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
              onPress={() => setType('income')}>
              <Icon
                name="trending-up"
                size={16}
                color={type === 'income' ? colors.backgroundDark : colors.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  type === 'income' && styles.typeBtnTextActive,
                ]}>
                Ingreso
              </Text>
            </Pressable>
          </View>
        )}

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

        {/* Date picker — hidden in pending mode */}
        {!isPendingMode && (
          <>
            <Text style={styles.label}>Fecha</Text>
            <Pressable
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}>
              <Icon name="calendar-today" size={18} color={colors.primary} />
              <Text style={styles.dateBtnText}>
                {isToday ? 'Hoy' : formatDateLabel(date)}
              </Text>
              {!isToday && (
                <Pressable
                  onPress={() => setDate(new Date())}
                  hitSlop={8}
                  style={styles.dateResetBtn}>
                  <Text style={styles.dateResetText}>Hoy</Text>
                </Pressable>
              )}
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Título</Text>
        <Input
          placeholder="Ej: Supermercado"
          value={title}
          onChangeText={setTitle}
          editable={!isPendingMode}
        />

        <Text style={[styles.label, {marginTop: 20}]}>
          Monto ({amountPrefix})
        </Text>
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

        {isPendingMode ? (
          <View style={styles.pendingActions}>
            <Button
              title="Confirmar"
              onPress={handleConfirm}
              icon="check"
              loading={loading}
              fullWidth
            />
            <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
              <Icon name="close" size={18} color={colors.dangerRed} />
              <Text style={styles.dismissText}>Descartar</Text>
            </Pressable>
          </View>
        ) : (
          <Button
            title={isEditMode ? 'Guardar cambios' : 'Guardar transacción'}
            onPress={handleAdd}
            icon="save"
            loading={loading}
            fullWidth
            style={{marginTop: 32}}
          />
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
    padding: 24,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceDark,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeBtnActiveIncome: {
    backgroundColor: colors.successGreen,
    borderColor: colors.successGreen,
  },
  typeBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.backgroundDark,
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  dateBtnText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dateResetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
  },
  dateResetText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
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
  pendingActions: {
    marginTop: 32,
    gap: 16,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dangerRed,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  dismissText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.dangerRed,
  },
  salaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 20,
  },
  salaryBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryBannerInfo: {
    flex: 1,
  },
  salaryBannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#22c55e',
  },
  salaryBannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
