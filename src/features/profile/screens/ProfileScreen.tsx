import React, {useCallback} from 'react';
import {StyleSheet, Text, View, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {useProfileStats} from '../hooks/useProfileStats';

function formatARS(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${Math.round(amount).toLocaleString('es-AR')}`;
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {stats, usage, reload} = useProfileStats();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const maxBar = Math.max(usage.monthExpenses, usage.monthIncome, 1);
  const expensePercent = (usage.monthExpenses / maxBar) * 100;
  const incomePercent = (usage.monthIncome / maxBar) * 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 24}]}
      showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Icon name="person" size={48} color={colors.primary} />
      </View>
      <Text style={styles.name}>Pablo</Text>
      <Text style={styles.subtitle}>App personal</Text>

      {/* Salary card */}
      {usage.salaryAmount > 0 && (
        <View style={styles.salaryCard}>
          <View style={styles.salaryIconWrap}>
            <Icon name="payments" size={18} color="#22c55e" />
          </View>
          <Text style={styles.salaryText}>
            Sueldo actual: {formatARS(usage.salaryAmount)}
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.modules}</Text>
          <Text style={styles.statLabel}>Módulos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.links}</Text>
          <Text style={styles.statLabel}>Links</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.accounts}</Text>
          <Text style={styles.statLabel}>Cuentas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.statValueSmall]}>
            {formatARS(stats.monthExpenses)}
          </Text>
          <Text style={styles.statLabel}>Gasto mes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.tasksCompletedToday}</Text>
          <Text style={styles.statLabel}>Tareas hoy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.searches}</Text>
          <Text style={styles.statLabel}>Búsquedas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.galleryItems}</Text>
          <Text style={styles.statLabel}>Galería</Text>
        </View>
      </ScrollView>

      {/* Usage Summary */}
      <View style={styles.usageSection}>
        <Text style={styles.sectionTitle}>RESUMEN DE USO</Text>

        {/* Streak */}
        <View style={styles.usageCard}>
          <View style={styles.usageCardHeader}>
            <View style={styles.usageIconWrap}>
              <Icon name="local-fire-department" size={20} color="#f59e0b" />
            </View>
            <View style={styles.usageCardInfo}>
              <Text style={styles.usageCardTitle}>Racha de actividad</Text>
              <Text style={styles.usageCardSub}>Días consecutivos usando Aureus</Text>
            </View>
          </View>
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>{usage.streakDays}</Text>
            <Text style={styles.streakUnit}>
              {usage.streakDays === 1 ? 'día' : 'días'}
            </Text>
          </View>
        </View>

        {/* Expenses vs Income */}
        <View style={styles.usageCard}>
          <View style={styles.usageCardHeader}>
            <View style={[styles.usageIconWrap, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
              <Icon name="bar-chart" size={20} color="#3b82f6" />
            </View>
            <View style={styles.usageCardInfo}>
              <Text style={styles.usageCardTitle}>Gastos vs Ingresos</Text>
              <Text style={styles.usageCardSub}>Este mes</Text>
            </View>
          </View>

          {/* Bars */}
          <View style={styles.barsContainer}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Gastos</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    styles.barExpense,
                    {width: `${Math.max(expensePercent, 2)}%`},
                  ]}
                />
              </View>
              <Text style={[styles.barAmount, {color: '#ef4444'}]}>
                {formatARS(usage.monthExpenses)}
              </Text>
            </View>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Ingresos</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    styles.barIncome,
                    {width: `${Math.max(incomePercent, 2)}%`},
                  ]}
                />
              </View>
              <Text style={[styles.barAmount, {color: '#22c55e'}]}>
                {formatARS(usage.monthIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items this week */}
        <View style={styles.usageCard}>
          <View style={styles.usageCardHeader}>
            <View style={[styles.usageIconWrap, {backgroundColor: 'rgba(168, 85, 247, 0.15)'}]}>
              <Icon name="inventory-2" size={20} color="#a855f7" />
            </View>
            <View style={styles.usageCardInfo}>
              <Text style={styles.usageCardTitle}>Items esta semana</Text>
              <Text style={styles.usageCardSub}>
                Links, notas y transacciones creados
              </Text>
            </View>
          </View>
          <View style={styles.streakRow}>
            <Text style={[styles.streakNumber, {color: '#a855f7'}]}>
              {usage.itemsThisWeek}
            </Text>
            <Text style={styles.streakUnit}>
              {usage.itemsThisWeek === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{height: 100}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  salaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  salaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: '#22c55e',
  },

  // Stats
  statsRow: {
    gap: 10,
    paddingBottom: 4,
    alignItems: 'center',
  },
  statCard: {
    width: 90,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statValueSmall: {
    fontSize: 18,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Usage Section
  usageSection: {
    width: '100%',
    marginTop: 28,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  usageCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 14,
  },
  usageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageCardInfo: {
    flex: 1,
  },
  usageCardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  usageCardSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Streak
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingLeft: 52,
  },
  streakNumber: {
    fontFamily: fontFamily.extraBold,
    fontSize: 32,
    color: '#f59e0b',
  },
  streakUnit: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Bars
  barsContainer: {
    gap: 10,
    paddingLeft: 52,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    width: 56,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutralDark,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barExpense: {
    backgroundColor: '#ef4444',
  },
  barIncome: {
    backgroundColor: '#22c55e',
  },
  barAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    width: 52,
    textAlign: 'right',
  },
});
