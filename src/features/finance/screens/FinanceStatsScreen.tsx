import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon, EmptyState} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import type {FinanceCategory} from '../../../core/types';

interface CategoryExpense {
  category: FinanceCategory;
  total: number;
}

function formatArs(amount: number): string {
  return `$${amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FinanceStatsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {getExpensesByCategory} = useFinanceStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<CategoryExpense[]>([]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthLabel = new Date(year, month - 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: year !== now.getFullYear() ? 'numeric' : undefined,
  });

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const loadData = useCallback(() => {
    getExpensesByCategory(year, month).then(setData);
  }, [year, month, getExpensesByCategory]);

  useFocusEffect(loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);
  const maxTotal = data.length > 0 ? data[0].total : 1;

  return (
    <View style={styles.container}>
      <Header title="Estadisticas" onBack={() => navigation.goBack()} />

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <Pressable onPress={goToPrevMonth} hitSlop={12}>
          <Icon name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={goToNextMonth} hitSlop={12}>
          <Icon
            name="chevron-right"
            size={22}
            color={isCurrentMonth ? colors.textMuted : colors.primary}
          />
        </Pressable>
      </View>

      {/* Grand total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>GASTO TOTAL</Text>
        <Text style={styles.totalAmount}>{formatArs(grandTotal)}</Text>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="pie-chart"
            title="Sin gastos"
            description={`No hay gastos registrados en ${monthLabel}.`}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.category.id)}
          contentContainerStyle={[styles.list, {paddingBottom: 24 + insets.bottom}]}
          renderItem={({item}) => {
            const percentage = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
            const barWidth = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
            const catColor = item.category.color || colors.primary;

            return (
              <View style={styles.catItem}>
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIcon, {backgroundColor: `${catColor}15`}]}>
                      <Icon
                        name={item.category.icon || 'category'}
                        size={20}
                        color={catColor}
                      />
                    </View>
                    <View>
                      <Text style={styles.catName}>{item.category.name}</Text>
                      <Text style={styles.catPercent}>{percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                  <Text style={styles.catAmount}>{formatArs(item.total)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {width: `${barWidth}%`, backgroundColor: catColor},
                    ]}
                  />
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  monthLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    minWidth: 120,
    textAlign: 'center',
  },
  totalSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  totalLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 4,
  },
  totalAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
  },
  catItem: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  catPercent: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  catAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  barBg: {
    height: 6,
    backgroundColor: colors.neutralDark,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.8,
  },
});
