import React, {useEffect} from 'react';
import {StyleSheet, Text, View, FlatList, Pressable, Switch, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
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
        <Text style={[styles.itemTitle, !item.is_active && styles.itemTextInactive]}>
          {item.title}
        </Text>
        <Text style={styles.itemMeta}>
          {formatAmount(item.amount, item.currency)} · Día {item.day_of_month}
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

export function ManageRecurringScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    recurring,
    loadRecurring,
    loadCategories,
    toggleRecurringActive,
    deleteRecurring,
  } = useFinanceStore();

  useEffect(() => {
    loadRecurring();
    loadCategories();
  }, [loadRecurring, loadCategories]);

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

  return (
    <View style={styles.container}>
      <Header title="Recurrentes" onBack={() => navigation.goBack()} />

      {recurring.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="autorenew"
            title="Sin recurrentes"
            description="Creá gastos recurrentes para que se generen automáticamente cada mes."
          />
        </View>
      ) : (
        <FlatList
          data={recurring}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
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

      <View style={styles.addBtnContainer}>
        <Button
          title="Nuevo Recurrente"
          onPress={() => navigation.navigate('AddRecurring')}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    padding: 24,
    paddingBottom: 100,
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
  itemTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  itemTextInactive: {
    color: colors.textMuted,
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
    bottom: 24,
    left: 24,
    right: 24,
  },
});
