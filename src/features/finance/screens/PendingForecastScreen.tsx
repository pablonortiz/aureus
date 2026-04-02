import React, {useState, useCallback, useEffect} from 'react';
import {StyleSheet, Text, View, ScrollView, Pressable} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function formatArs(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface ForecastItem {
  title: string;
  amount: number;
  currency: string;
  amountArs: number;
  dueDate: Date;
  categoryIcon?: string;
  categoryColor?: string;
}

export function PendingForecastScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {totalBalance, getPendingUntilDate, exchangeRate, loadExchangeRate} =
    useFinanceStore();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [forecastTotal, setForecastTotal] = useState(0);
  const [forecastItems, setForecastItems] = useState<ForecastItem[]>([]);

  // Ensure exchange rate is loaded
  useEffect(() => {
    if (exchangeRate === null) {
      loadExchangeRate();
    }
  }, [exchangeRate, loadExchangeRate]);

  const isCurrentViewMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = () => {
    if (isCurrentViewMonth) return;
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Calendar grid computation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1; // Convert Sunday=0 to Monday-based (0=Mon)
  })();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }
  // Pad to fill last row
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  // Dates that have pending payments (for dot indicators)
  const [paymentDays, setPaymentDays] = useState<Set<string>>(new Set());

  // Load payment days for current view month
  const loadPaymentDays = useCallback(async () => {
    // Get all pending items from today to end of view month
    const endOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const result = await getPendingUntilDate(endOfMonth);
    const days = new Set<string>();
    for (const item of result.items) {
      const key = `${item.dueDate.getFullYear()}-${item.dueDate.getMonth()}-${item.dueDate.getDate()}`;
      days.add(key);
    }
    setPaymentDays(days);
  }, [viewYear, viewMonth, getPendingUntilDate]);

  useEffect(() => {
    loadPaymentDays();
  }, [loadPaymentDays]);

  // Load forecast when date is selected
  const handleSelectDate = useCallback(
    async (day: number) => {
      const date = new Date(viewYear, viewMonth, day);
      if (date <= today) return;
      setSelectedDate(date);
      const result = await getPendingUntilDate(date);
      setForecastTotal(result.total);
      setForecastItems(result.items);
    },
    [viewYear, viewMonth, today, getPendingUntilDate],
  );

  const isToday = (day: number) =>
    viewYear === now.getFullYear() &&
    viewMonth === now.getMonth() &&
    day === now.getDate();

  const isSelected = (day: number) =>
    selectedDate !== null &&
    viewYear === selectedDate.getFullYear() &&
    viewMonth === selectedDate.getMonth() &&
    day === selectedDate.getDate();

  const isPast = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    return date < today;
  };

  const hasPayment = (day: number) => {
    const key = `${viewYear}-${viewMonth}-${day}`;
    return paymentDays.has(key);
  };

  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  const postPendingBalance = totalBalance - forecastTotal;

  return (
    <View style={styles.container}>
      <Header title="Previsión de Pagos" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{paddingBottom: 24 + insets.bottom}}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={goToPrevMonth}
            hitSlop={12}
            style={{opacity: isCurrentViewMonth ? 0.3 : 1}}>
            <Icon name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={goToNextMonth} hitSlop={12}>
            <Icon name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day, i) => (
            <View key={i} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, i) => (
            <Pressable
              key={i}
              style={styles.dayCell}
              onPress={() => day && !isPast(day) && handleSelectDate(day)}
              disabled={!day || (day !== null && isPast(day) && !isToday(day))}>
              {day !== null && (
                <View
                  style={[
                    styles.dayCircle,
                    isSelected(day) && styles.dayCircleSelected,
                    isToday(day) && !isSelected(day) && styles.dayCircleToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      isPast(day) && !isToday(day) && styles.dayTextPast,
                      isToday(day) && styles.dayTextToday,
                      isSelected(day) && styles.dayTextSelected,
                    ]}>
                    {day}
                  </Text>
                </View>
              )}
              {day !== null && hasPayment(day) && !isSelected(day) && (
                <View style={styles.paymentDot} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Summary card */}
        {selectedDate && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>
                Hoy → {selectedLabel}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Icon name="payments" size={18} color={colors.primary} />
                <Text style={styles.summaryLabel}>Total a pagar:</Text>
              </View>
              <Text style={styles.summaryAmountGold}>
                {formatArs(forecastTotal)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Icon
                  name="account-balance-wallet"
                  size={18}
                  color={
                    postPendingBalance >= 0
                      ? colors.successGreen
                      : colors.dangerRed
                  }
                />
                <Text style={styles.summaryLabel}>Balance restante:</Text>
              </View>
              <Text
                style={[
                  styles.summaryAmountGreen,
                  postPendingBalance < 0 && styles.summaryAmountRed,
                ]}>
                {postPendingBalance < 0 ? '-' : ''}
                {formatArs(postPendingBalance)}
              </Text>
            </View>
          </View>
        )}

        {/* Payment list */}
        {selectedDate && forecastItems.length > 0 && (
          <View style={styles.paymentListSection}>
            <Text style={styles.sectionLabel}>PAGOS EN ESTE PERÍODO</Text>
            {forecastItems.map((item, index) => (
              <View key={index} style={styles.paymentItem}>
                <View
                  style={[
                    styles.paymentIcon,
                    {
                      backgroundColor: item.categoryColor
                        ? `${item.categoryColor}20`
                        : colors.primaryLight,
                    },
                  ]}>
                  <Icon
                    name={item.categoryIcon || 'receipt-long'}
                    size={18}
                    color={item.categoryColor || colors.primary}
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>{item.title}</Text>
                  <Text style={styles.paymentDate}>
                    {item.dueDate.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  {item.currency === 'USD' ? 'US' : ''}
                  {formatArs(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty state when no date selected */}
        {!selectedDate && (
          <View style={styles.emptyHint}>
            <Icon name="touch-app" size={32} color={colors.textMuted} />
            <Text style={styles.emptyHintText}>
              Tocá un día futuro para ver la previsión
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  scroll: {
    flex: 1,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  monthLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: CELL_SIZE + 8,
  },
  dayCircle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dayTextPast: {
    color: colors.textMuted,
  },
  dayTextToday: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  dayTextSelected: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  paymentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
  },
  summaryChip: {
    alignSelf: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
    marginBottom: 16,
  },
  summaryChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 12,
  },
  summaryAmountGold: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.primary,
  },
  summaryAmountGreen: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.successGreen,
  },
  summaryAmountRed: {
    color: colors.dangerRed,
  },
  paymentListSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  paymentDate: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  emptyHint: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyHintText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
