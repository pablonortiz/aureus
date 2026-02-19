import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, Text, View, ScrollView, TextInput, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Button, Icon} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';

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

export function FinanceSettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    salaryAmount,
    pendingLookaheadDay,
    loadSalaryAmount,
    updateSalaryAmount,
    loadPendingLookaheadDay,
    updatePendingLookaheadDay,
  } = useFinanceStore();

  const [rawSalary, setRawSalary] = useState('');
  const [lookaheadStr, setLookaheadStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSalaryAmount();
    loadPendingLookaheadDay();
  }, [loadSalaryAmount, loadPendingLookaheadDay]);

  useEffect(() => {
    setRawSalary(amountToRaw(salaryAmount));
  }, [salaryAmount]);

  useEffect(() => {
    setLookaheadStr(String(pendingLookaheadDay));
  }, [pendingLookaheadDay]);

  const handleSalaryChange = useCallback((text: string) => {
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
    setRawSalary(cleaned);
  }, []);

  const handleSave = async () => {
    const amount = parseRawAmount(rawSalary);
    const day = parseInt(lookaheadStr, 10);

    if (rawSalary && (isNaN(amount) || amount < 0)) {
      Alert.alert('Error', 'Ingresá un monto válido para el sueldo');
      return;
    }
    if (isNaN(day) || day < 1 || day > 28) {
      Alert.alert('Error', 'El día de lookahead debe ser entre 1 y 28');
      return;
    }

    setSaving(true);
    try {
      await updateSalaryAmount(amount);
      await updatePendingLookaheadDay(day);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Configuración de Finanzas" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.content, {paddingBottom: 24 + insets.bottom}]}>
        {/* Salary section */}
        <Text style={styles.sectionLabel}>SUELDO</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Icon name="payments" size={20} color="#22c55e" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Monto del sueldo</Text>
              <Text style={styles.cardSub}>Se usará para registrar rápidamente tu sueldo</Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={formatCurrency(rawSalary)}
              onChangeText={handleSalaryChange}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Lookahead section */}
        <Text style={[styles.sectionLabel, {marginTop: 28}]}>PAGOS RECURRENTES</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, {backgroundColor: colors.primaryLight}]}>
              <Icon name="calendar-today" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Día de lookahead</Text>
              <Text style={styles.cardSub}>Hasta qué día del mes siguiente contar pendientes</Text>
            </View>
          </View>
          <View style={styles.dayInputRow}>
            <Text style={styles.dayLabel}>Día</Text>
            <TextInput
              style={styles.dayInput}
              value={lookaheadStr}
              onChangeText={setLookaheadStr}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <Button
          title="Guardar"
          onPress={handleSave}
          icon="save"
          loading={saving}
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
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cardSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    height: 56,
  },
  amountPrefix: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: '#22c55e',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    color: colors.textPrimary,
    padding: 0,
  },
  dayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 52,
  },
  dayLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dayInput: {
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    width: 60,
    textAlign: 'center',
  },
});
