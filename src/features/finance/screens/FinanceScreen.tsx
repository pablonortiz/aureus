import React, {useCallback, useEffect, useState, useMemo} from 'react';
import {StyleSheet, Text, View, ScrollView, Pressable, Alert, TextInput} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming, interpolate} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon, Button, EmptyState} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import {getDatabase} from '../../../core/database';
import type {FinanceTransaction} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatArs(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUsd(amount: number): string {
  return `US$${Math.abs(amount).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRate(rate: number): string {
  return `$${rate.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function TransactionItem({
  transaction,
  onDelete,
  onConfirmPending,
  onEdit,
  raiseAmount,
}: {
  transaction: FinanceTransaction;
  onDelete: () => void;
  onConfirmPending: () => void;
  onEdit: () => void;
  raiseAmount?: number | null;
}) {
  const isExpense = transaction.type === 'expense';
  const isPending = transaction.status === 'pending';
  const isUsd = transaction.currency === 'USD';
  const formattedDate = new Date(transaction.date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
  const firstCat = transaction.categories?.[0];
  const catLabel = transaction.categories.length > 0
    ? transaction.categories.map(c => c.name).join(', ')
    : 'Sin categoría';

  const amountText = isUsd
    ? formatUsd(transaction.amount)
    : formatArs(transaction.amount);

  const equivalentText = isUsd && transaction.exchange_rate
    ? ` ≈ ${formatArs(transaction.amount * transaction.exchange_rate)}`
    : '';

  return (
    <Pressable
      onPress={isPending ? onConfirmPending : onEdit}
      onLongPress={onDelete}
      style={[styles.txItem, isPending && styles.txItemPending]}>
      <View
        style={[
          styles.txIcon,
          {backgroundColor: `${firstCat?.color || colors.primary}15`},
        ]}>
        <Icon
          name={firstCat?.icon || 'receipt'}
          size={22}
          color={firstCat?.color || colors.primary}
        />
      </View>
      <View style={styles.txInfo}>
        <View style={styles.txTitleRow}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {transaction.title}
          </Text>
          {isPending && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>PENDIENTE</Text>
            </View>
          )}
        </View>
        <Text style={styles.txMeta} numberOfLines={1}>
          {catLabel} · {formattedDate}
        </Text>
      </View>
      <View style={styles.txAmountCol}>
        <View style={styles.txAmountRow}>
          <Text style={[styles.txAmount, isExpense && styles.txAmountExpense]}>
            {isExpense ? '-' : '+'}
            {amountText}
          </Text>
          <View style={[styles.currencyBadge, isUsd && styles.currencyBadgeUsd]}>
            <Text style={[styles.currencyBadgeText, isUsd && styles.currencyBadgeTextUsd]}>
              {transaction.currency}
            </Text>
          </View>
        </View>
        {equivalentText ? (
          <Text style={styles.txEquivalent}>{equivalentText}</Text>
        ) : null}
        {raiseAmount != null && raiseAmount > 0 && (
          <View style={styles.raiseChip}>
            <Icon name="trending-up" size={12} color="#22c55e" />
            <Text style={styles.raiseChipText}>+{formatArs(raiseAmount)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    transactions,
    totalBalance,
    monthlyExpenses,
    exchangeRate,
    pendingRecurringTotal,
    pendingLookaheadDay,
    loadCategories,
    deleteTransaction,
    loadExchangeRate,
    refreshExchangeRate,
    generatePendingTransactions,
    loadPendingRecurringTotal,
    loadPendingLookaheadDay,
    loadSalaryAmount,
    getMonthExpenses,
    getTransactionsForMonth,
  } = useFinanceStore();

  // Month navigation for trends
  const now = new Date();
  const [trendYear, setTrendYear] = useState(now.getFullYear());
  const [trendMonth, setTrendMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [trendData, setTrendData] = useState<{daily: number[]; total: number}>({daily: [], total: 0});
  const [monthTransactions, setMonthTransactions] = useState<FinanceTransaction[]>([]);

  const isCurrentMonth = trendYear === now.getFullYear() && trendMonth === now.getMonth() + 1;

  const trendMonthLabel = new Date(trendYear, trendMonth - 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: trendYear !== now.getFullYear() ? 'numeric' : undefined,
  });

  const goToPrevMonth = () => {
    if (trendMonth === 1) {
      setTrendYear(y => y - 1);
      setTrendMonth(12);
    } else {
      setTrendMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (trendMonth === 12) {
      setTrendYear(y => y + 1);
      setTrendMonth(1);
    } else {
      setTrendMonth(m => m + 1);
    }
  };

  useFocusEffect(
    useCallback(() => {
      generatePendingTransactions();
      loadCategories();
      loadSalaryAmount();
      loadPendingLookaheadDay().then(() =>
        loadExchangeRate().then(() => loadPendingRecurringTotal()),
      );
    }, [generatePendingTransactions, loadCategories, loadSalaryAmount, loadPendingLookaheadDay, loadExchangeRate, loadPendingRecurringTotal]),
  );

  // Reload trend data and month transactions when month changes or transactions change
  useEffect(() => {
    getMonthExpenses(trendYear, trendMonth).then(setTrendData);
    if (!isCurrentMonth) {
      getTransactionsForMonth(trendYear, trendMonth).then(setMonthTransactions);
    }
  }, [trendYear, trendMonth, transactions, isCurrentMonth, getMonthExpenses, getTransactionsForMonth]);

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar esta transacción?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Eliminar', style: 'destructive', onPress: () => deleteTransaction(id)},
    ]);
  };

  const handleConfirmPending = (tx: FinanceTransaction) => {
    navigation.navigate('AddTransaction', {
      pendingTransactionId: tx.id,
      prefillTitle: tx.title,
      prefillAmount: tx.amount,
      prefillCurrency: tx.currency,
      prefillCategoryIds: tx.categories.map(c => c.id),
    });
  };

  // Flip animation for pending chip
  const [flipped, setFlipped] = useState(false);
  const flipProgress = useSharedValue(0);

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    flipProgress.value = withTiming(next ? 1 : 0, {duration: 400});
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{rotateY: `${rotateY}deg`}],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{rotateY: `${rotateY}deg`}],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const [showAll, setShowAll] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const PREVIEW_COUNT = 10;

  const handleEdit = (tx: FinanceTransaction) => {
    navigation.navigate('AddTransaction', {editTransactionId: tx.id});
  };

  const filterBySearch = (txs: FinanceTransaction[]) => {
    if (!txSearch.trim()) return txs;
    const needle = normalizeText(txSearch);
    return txs.filter(t => normalizeText(t.title).includes(needle));
  };

  // Compute raise amounts for salary transactions
  const [raiseMap, setRaiseMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const computeRaises = async () => {
      const db = getDatabase();
      const salaryTxs = await db.execute(
        `SELECT ft.id, ft.amount FROM finance_transactions ft
         JOIN finance_transaction_categories ftc ON ftc.transaction_id = ft.id
         JOIN finance_categories fc ON fc.id = ftc.category_id
         WHERE ft.title = 'Sueldo' AND fc.name = 'Sueldo' AND ft.type = 'income'
         ORDER BY ft.date DESC, ft.id DESC
         LIMIT 20`,
      );
      const newMap = new Map<number, number>();
      const rows = salaryTxs.rows;
      for (let i = 0; i < rows.length - 1; i++) {
        const current = rows[i].amount as number;
        const previous = rows[i + 1].amount as number;
        if (current > previous) {
          newMap.set(rows[i].id as number, current - previous);
        }
      }
      setRaiseMap(newMap);
    };
    computeRaises();
  }, [transactions]);

  const pendingTxs = transactions.filter(t => t.status === 'pending');
  const allConfirmedTxs = filterBySearch(transactions.filter(t => t.status === 'confirmed'));
  const confirmedTxs = showAll ? allConfirmedTxs : allConfirmedTxs.slice(0, PREVIEW_COUNT);
  const hasMore = allConfirmedTxs.length > PREVIEW_COUNT;

  const filteredMonthTxs = filterBySearch(monthTransactions);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Finanzas</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('ManageRecurring')}
          style={styles.recurringBtn}>
          <Icon name="autorenew" size={20} color={colors.primary} />
          <Text style={styles.recurringBtnText}>Recurrentes</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 120}}>
        {/* Balance Total */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>BALANCE TOTAL</Text>
          <Text style={styles.balanceAmount}>
            <Text style={styles.balanceCurrency}>$</Text>
            {formatArs(totalBalance).replace('$', '')}
          </Text>

          {/* Exchange rate badge */}
          {exchangeRate !== null && (
            <Pressable onPress={refreshExchangeRate} style={styles.rateBadge}>
              <Icon name="currency-exchange" size={14} color={colors.primary} />
              <Text style={styles.rateText}>
                Blue: {formatRate(exchangeRate)}
              </Text>
              <Icon name="refresh" size={12} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Pending recurring badge — flippable */}
          {pendingRecurringTotal > 0 && (() => {
            const nextM = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
            const nextY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
            const targetDate = new Date(nextY, nextM, pendingLookaheadDay);
            const targetLabel = targetDate.toLocaleDateString('es-AR', {day: 'numeric', month: 'short'});
            const postPendingBalance = totalBalance - pendingRecurringTotal;
            return (
              <Pressable onPress={handleFlip} style={styles.flipContainer}>
                <Animated.View style={[styles.pendingRecBadge, frontAnimatedStyle]}>
                  <Icon name="autorenew" size={14} color={colors.primary} />
                  <Text style={styles.pendingRecText}>
                    Pendiente hasta {targetLabel}: {formatArs(pendingRecurringTotal)}
                  </Text>
                </Animated.View>
                <Animated.View style={[styles.pendingRecBadge, styles.pendingRecBadgeBack, backAnimatedStyle]}>
                  <Icon name="account-balance-wallet" size={14} color={colors.successGreen} />
                  <Text style={styles.pendingRecTextBack}>
                    Post pagos: {formatArs(postPendingBalance)}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })()}

          {/* Monthly expenses */}
          {monthlyExpenses > 0 && (
            <View style={styles.monthlyBadge}>
              <Icon name="trending-down" size={14} color={colors.dangerRed} />
              <Text style={styles.monthlyText}>
                -{formatArs(monthlyExpenses)} este mes
              </Text>
            </View>
          )}
        </View>

        {/* Spending Trends */}
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View>
              <Text style={styles.trendTitle}>Gastos del Mes</Text>
              <View style={styles.trendMonthNav}>
                <Pressable onPress={goToPrevMonth} hitSlop={12}>
                  <Icon name="chevron-left" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.trendMonthLabel}>{trendMonthLabel}</Text>
                <Pressable onPress={goToNextMonth} hitSlop={12}>
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={isCurrentMonth ? colors.textMuted : colors.primary}
                  />
                </Pressable>
              </View>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.trendAmount}>
                -{formatArs(trendData.total)}
              </Text>
              <Text style={styles.trendLabel}>TOTAL</Text>
            </View>
          </View>
          {(() => {
            const maxVal = Math.max(...trendData.daily, 1);
            const CHART_HEIGHT = 60;
            const days = trendData.daily;
            if (days.length === 0) {
              return (
                <View style={styles.chartEmpty}>
                  <Text style={styles.chartEmptyText}>Sin gastos</Text>
                </View>
              );
            }
            return (
              <View style={[styles.chartContainer, {height: CHART_HEIGHT}]}>
                {days.map((val, i) => (
                  <View
                    key={i}
                    style={[
                      styles.chartBar,
                      {
                        height: val > 0 ? Math.max((val / maxVal) * CHART_HEIGHT, 3) : 0,
                      },
                    ]}
                  />
                ))}
              </View>
            );
          })()}
        </View>

        {/* Transactions */}
        <View style={styles.txSection}>
          {isCurrentMonth ? (
            // Current month: pending + recent
            pendingTxs.length === 0 && confirmedTxs.length === 0 && !txSearch ? (
              <>
                <View style={styles.txHeader}>
                  <Text style={styles.txSectionTitle}>Transacciones Recientes</Text>
                </View>
                <EmptyState
                  icon="account-balance-wallet"
                  title="Sin transacciones"
                  description="Agregá tu primera transacción para empezar a controlar tus finanzas."
                />
              </>
            ) : (
              <>
                {pendingTxs.length > 0 && (
                  <>
                    <View style={styles.txHeader}>
                      <Text style={styles.txSectionTitle}>
                        Pendientes ({pendingTxs.length})
                      </Text>
                    </View>
                    <View style={styles.txList}>
                      {pendingTxs.map(tx => (
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          onDelete={() => handleDelete(tx.id)}
                          onConfirmPending={() => handleConfirmPending(tx)}
                          onEdit={() => handleEdit(tx)}
                          raiseAmount={raiseMap.get(tx.id) ?? null}
                        />
                      ))}
                    </View>
                  </>
                )}
                <View style={styles.txHeader}>
                  <Text style={styles.txSectionTitle}>Transacciones Recientes</Text>
                  <View style={styles.txHeaderRight}>
                    <Pressable onPress={() => { setShowSearch(s => !s); setTxSearch(''); }} hitSlop={8}>
                      <Icon name={showSearch ? 'close' : 'search'} size={20} color={colors.primary} />
                    </Pressable>
                    {hasMore && (
                      <Pressable onPress={() => setShowAll(prev => !prev)}>
                        <Text style={styles.viewAll}>
                          {showAll ? 'VER MENOS' : 'VER TODO'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                {showSearch && (
                  <View style={styles.searchBar}>
                    <Icon name="search" size={18} color={colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar transacción..."
                      placeholderTextColor={colors.textMuted}
                      value={txSearch}
                      onChangeText={setTxSearch}
                      autoFocus
                    />
                    {txSearch.length > 0 && (
                      <Pressable onPress={() => setTxSearch('')} hitSlop={8}>
                        <Icon name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                )}
                <View style={styles.txList}>
                  {confirmedTxs.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onDelete={() => handleDelete(tx.id)}
                      onConfirmPending={() => handleConfirmPending(tx)}
                      onEdit={() => handleEdit(tx)}
                      raiseAmount={raiseMap.get(tx.id) ?? null}
                    />
                  ))}
                </View>
              </>
            )
          ) : (
            // Past month: show that month's transactions
            <>
              <View style={styles.txHeader}>
                <Text style={styles.txSectionTitle}>
                  Transacciones de {trendMonthLabel}
                </Text>
                <Pressable onPress={() => { setShowSearch(s => !s); setTxSearch(''); }} hitSlop={8}>
                  <Icon name={showSearch ? 'close' : 'search'} size={20} color={colors.primary} />
                </Pressable>
              </View>
              {showSearch && (
                <View style={styles.searchBar}>
                  <Icon name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar transacción..."
                    placeholderTextColor={colors.textMuted}
                    value={txSearch}
                    onChangeText={setTxSearch}
                    autoFocus
                  />
                  {txSearch.length > 0 && (
                    <Pressable onPress={() => setTxSearch('')} hitSlop={8}>
                      <Icon name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              )}
              {filteredMonthTxs.length === 0 ? (
                <EmptyState
                  icon="event-busy"
                  title="Sin transacciones"
                  description={txSearch ? 'No se encontraron resultados.' : `No hay transacciones registradas en ${trendMonthLabel}.`}
                />
              ) : (
                <View style={styles.txList}>
                  {filteredMonthTxs.map(tx => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onDelete={() => handleDelete(tx.id)}
                      onConfirmPending={() => handleConfirmPending(tx)}
                      onEdit={() => handleEdit(tx)}
                      raiseAmount={raiseMap.get(tx.id) ?? null}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action row */}
      <View style={[styles.addBtnContainer, {bottom: 24 + insets.bottom}]}>
        <Pressable
          style={styles.gearBtn}
          onPress={() => navigation.navigate('FinanceSettings')}>
          <Icon name="settings" size={22} color={colors.primary} />
        </Pressable>
        <View style={{flex: 1}}>
          <Button
            title="Agregar Transacción"
            onPress={() => navigation.navigate('AddTransaction')}
            icon="add"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  recurringBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.primaryLight,
  },
  recurringBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  balanceLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  balanceAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    color: colors.textPrimary,
  },
  balanceCurrency: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.primary,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
  },
  rateText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  flipContainer: {
    marginTop: 10,
  },
  pendingRecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
  },
  pendingRecBadgeBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  pendingRecText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  pendingRecTextBack: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.successGreen,
  },
  monthlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  monthlyText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.dangerRed,
  },
  trendCard: {
    marginHorizontal: 24,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 24,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trendTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  trendMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  trendMonthLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  trendAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.dangerRed,
  },
  trendLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartBar: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.7,
  },
  chartEmpty: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  txSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  txHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  txList: {
    gap: 8,
    marginBottom: 8,
  },
  txSectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  viewAll: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${colors.surfaceDark}80`,
    padding: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  txItemPending: {
    borderColor: colors.borderGold,
    backgroundColor: colors.primaryLight,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  pendingBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.backgroundDark,
  },
  txMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  txAmountExpense: {
    color: colors.textPrimary,
  },
  txEquivalent: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  currencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  currencyBadgeUsd: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  currencyBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  currencyBadgeTextUsd: {
    color: '#60a5fa',
  },
  addBtnContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gearBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 3,
  },
  raiseChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#22c55e',
  },
});
