import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable, Switch, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon, EmptyState, Button} from '../../../core/components';
import {useFinanceStore} from '../store/useFinanceStore';
import type {FinanceRecurring} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';

function formatAmount(amount: number, currency: string): string {
  const prefix = currency === 'USD' ? 'US$' : '$';
  return `${prefix}${amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function getInstallmentCurrent(item: FinanceRecurring): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  if (!item.start_month || !item.start_year) return 0;
  return (currentYear - item.start_year) * 12 + (currentMonth - item.start_month) + 1;
}

function RecurringItem({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: FinanceRecurring;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const catLabel = item.categories.length > 0
    ? item.categories.map(c => c.name).join(', ')
    : 'Sin categoría';
  const firstCat = item.categories[0];

  const frequency = item.frequency || 'monthly';
  let metaText = `${formatAmount(item.amount, item.currency)} · Día ${item.day_of_month}`;
  if (frequency === 'annual' && item.month_of_year) {
    metaText = `${formatAmount(item.amount, item.currency)} · Día ${item.day_of_month} de ${MONTH_NAMES[item.month_of_year - 1]}`;
  }

  let badgeText = '';
  let badgeColor: string = colors.primary;
  if (frequency === 'monthly') {
    badgeText = 'MENSUAL';
    badgeColor = colors.primary;
  } else if (frequency === 'installment') {
    const current = getInstallmentCurrent(item);
    const total = item.total_installments || 0;
    badgeText = `CUOTAS ${current}/${total}`;
    badgeColor = '#60a5fa';
  } else if (frequency === 'annual') {
    badgeText = 'ANUAL';
    badgeColor = '#22c55e';
  }

  return (
    <View style={[styles.item, !item.is_active && styles.itemInactive]}>
      <View
        style={[
          styles.itemIcon,
          {backgroundColor: `${firstCat?.color || colors.primary}15`},
        ]}>
        <Icon
          name={firstCat?.icon || 'autorenew'}
          size={22}
          color={firstCat?.color || colors.primary}
        />
      </View>
      <View style={styles.itemInfo}>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.itemTitle, !item.is_active && styles.itemTextInactive]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.freqBadge, {backgroundColor: `${badgeColor}20`}]}>
            <Text style={[styles.freqBadgeText, {color: badgeColor}]}>{badgeText}</Text>
          </View>
        </View>
        <Text style={styles.itemMeta}>
          {metaText}
        </Text>
        <Text style={styles.itemCats} numberOfLines={1}>
          {catLabel}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <Switch
          value={item.is_active}
          onValueChange={onToggle}
          trackColor={{false: colors.neutralDark, true: colors.primaryMuted}}
          thumbColor={item.is_active ? colors.primary : colors.textMuted}
        />
        <View style={styles.itemBtns}>
          <Pressable onPress={onEdit} style={styles.iconBtn}>
            <Icon name="edit" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconBtn}>
            <Icon name="delete" size={18} color={colors.dangerRed} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type TabType = 'monthly' | 'annual';
type MonthlyFilter = 'all' | 'monthly' | 'installment';

export function ManageRecurringScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {
    recurring,
    exchangeRate,
    loadRecurring,
    loadCategories,
    loadExchangeRate,
    toggleRecurringActive,
    deleteRecurring,
  } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<TabType>('monthly');
  const [monthlyFilter, setMonthlyFilter] = useState<MonthlyFilter>('all');

  useEffect(() => {
    loadRecurring();
    loadCategories();
    loadExchangeRate();
  }, [loadRecurring, loadCategories, loadExchangeRate]);

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'Eliminar recurrente',
      `¿Eliminar "${title}"? Las transacciones ya generadas no se afectan.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Eliminar', style: 'destructive', onPress: () => deleteRecurring(id)},
      ],
    );
  };

  const monthlyItems = recurring.filter(r => {
    const freq = r.frequency || 'monthly';
    if (monthlyFilter === 'monthly') return freq === 'monthly';
    if (monthlyFilter === 'installment') return freq === 'installment';
    return freq === 'monthly' || freq === 'installment';
  });
  const annualItems = recurring.filter(r => r.frequency === 'annual');
  const displayItems = activeTab === 'monthly' ? monthlyItems : annualItems;

  const monthlyCount = recurring.filter(r => (r.frequency || 'monthly') === 'monthly').length;
  const installmentCount = recurring.filter(r => r.frequency === 'installment').length;

  const defaultFrequency = activeTab === 'annual' ? 'annual' : 'monthly';

  const tabTotal = useMemo(() => {
    const rate = exchangeRate || 0;
    return displayItems
      .filter(item => item.is_active)
      .reduce((sum, item) => {
        const arsAmount = item.currency === 'USD' ? item.amount * rate : item.amount;
        return sum + arsAmount;
      }, 0);
  }, [displayItems, exchangeRate]);

  return (
    <View style={styles.container}>
      <Header title="Recurrentes" onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
          onPress={() => setActiveTab('monthly')}>
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
            Mensuales
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'annual' && styles.tabActive]}
          onPress={() => setActiveTab('annual')}>
          <Text style={[styles.tabText, activeTab === 'annual' && styles.tabTextActive]}>
            Anuales
          </Text>
        </Pressable>
      </View>

      {/* Sub-filter chips for monthly tab */}
      {activeTab === 'monthly' && (
        <View style={styles.filterRow}>
          {([
            {key: 'all' as MonthlyFilter, label: 'Todos'},
            {key: 'monthly' as MonthlyFilter, label: `Mensuales${monthlyCount > 0 ? ` (${monthlyCount})` : ''}`},
            {key: 'installment' as MonthlyFilter, label: `Cuotas${installmentCount > 0 ? ` (${installmentCount})` : ''}`},
          ]).map(f => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, monthlyFilter === f.key && styles.filterChipActive]}
              onPress={() => setMonthlyFilter(f.key)}>
              <Text style={[styles.filterChipText, monthlyFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Total chip */}
      {displayItems.filter(i => i.is_active).length > 0 && (
        <View style={styles.totalChipContainer}>
          <View style={styles.totalChip}>
            <Icon name="functions" size={14} color={colors.primary} />
            <Text style={styles.totalChipText}>
              Total: {formatAmount(tabTotal, 'ARS')}
            </Text>
          </View>
        </View>
      )}

      {displayItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="autorenew"
            title={activeTab === 'monthly' ? 'Sin recurrentes mensuales' : 'Sin recurrentes anuales'}
            description={activeTab === 'monthly'
              ? 'Creá gastos mensuales o en cuotas para que se generen automáticamente.'
              : 'Creá gastos anuales para que se generen una vez al año.'}
          />
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.list, {paddingBottom: 100 + insets.bottom}]}
          renderItem={({item}) => (
            <RecurringItem
              item={item}
              onToggle={() => toggleRecurringActive(item.id)}
              onEdit={() => navigation.navigate('AddRecurring', {recurringId: item.id})}
              onDelete={() => handleDelete(item.id, item.title)}
            />
          )}
        />
      )}

      <View style={[styles.addBtnContainer, {bottom: 24 + insets.bottom}]}>
        <Button
          title="Nuevo Recurrente"
          onPress={() => navigation.navigate('AddRecurring', {defaultFrequency})}
          icon="add"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderGold,
  },
  filterChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  totalChipContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  totalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  totalChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 24,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  itemInactive: {
    opacity: 0.5,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  itemTextInactive: {
    color: colors.textMuted,
  },
  freqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  freqBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  itemMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemCats: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'center',
    gap: 8,
  },
  itemBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
});
