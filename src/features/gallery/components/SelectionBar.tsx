import React from 'react';
import {StyleSheet, View, Text, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';

interface SelectionBarProps {
  count: number;
  onMove: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onExport: () => void;
  onCancel: () => void;
}

export function SelectionBar({
  count,
  onMove,
  onFavorite,
  onDelete,
  onExport,
  onCancel,
}: SelectionBarProps) {
  const insets = useSafeAreaInsets();

  const actions = [
    {icon: 'drive-file-move', label: 'Mover', onPress: onMove},
    {icon: 'favorite', label: 'Favorito', onPress: onFavorite},
    {icon: 'file-download', label: 'Exportar', onPress: onExport},
    {icon: 'delete', label: 'Eliminar', onPress: onDelete, danger: true},
  ];

  return (
    <View style={[styles.container, {paddingBottom: 12 + insets.bottom}]}>
      <View style={styles.header}>
        <Text style={styles.count}>
          {count} seleccionado{count !== 1 ? 's' : ''}
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        {actions.map(action => (
          <Pressable
            key={action.icon}
            style={styles.actionBtn}
            onPress={action.onPress}>
            <Icon
              name={action.icon}
              size={22}
              color={action.danger ? '#ef4444' : colors.textPrimary}
            />
            <Text
              style={[
                styles.actionLabel,
                action.danger && {color: '#ef4444'},
              ]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  count: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },
  cancelText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  actionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
