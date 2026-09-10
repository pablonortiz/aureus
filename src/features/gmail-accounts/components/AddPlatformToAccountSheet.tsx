import React, {useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {Icon, Input} from '../../../core/components';
import type {Platform} from '../../../core/types';

interface AddPlatformToAccountSheetProps {
  visible: boolean;
  email: string;
  /** Catalog platforms this account does not have yet. */
  availablePlatforms: Platform[];
  /** Lowercased names already present in the account, to warn about duplicates. */
  accountPlatformNames: Set<string>;
  onAdd: (name: string) => void;
  onClose: () => void;
}

export function AddPlatformToAccountSheet({
  visible,
  email,
  availablePlatforms,
  accountPlatformNames,
  onAdd,
  onClose,
}: AddPlatformToAccountSheetProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSelected(null);
    }
  }, [visible]);

  const query = search.trim();
  const normalizedQuery = query.toLowerCase();

  const matches = useMemo(
    () =>
      availablePlatforms.filter(platform =>
        platform.name.toLowerCase().includes(normalizedQuery),
      ),
    [availablePlatforms, normalizedQuery],
  );

  const existsInCatalog = availablePlatforms.some(
    platform => platform.name.toLowerCase() === normalizedQuery,
  );
  const alreadyInAccount = accountPlatformNames.has(normalizedQuery);
  const canCreate = query.length > 0 && !existsInCatalog && !alreadyInAccount;
  const chosenName = selected || (canCreate ? query : null);

  const handleChangeSearch = (text: string) => {
    setSearch(text);
    setSelected(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, {paddingBottom: 20 + insets.bottom}]}
          onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Agregar plataforma</Text>
          <Text style={styles.subtitle}>{email}</Text>

          <Input
            icon="search"
            placeholder="Buscar o crear plataforma…"
            value={search}
            onChangeText={handleChangeSearch}
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>
            DISPONIBLES ({matches.length})
          </Text>

          {matches.length === 0 ? (
            <Text style={styles.emptyText}>
              {availablePlatforms.length === 0
                ? 'Esta cuenta ya tiene todas las plataformas del catálogo.'
                : 'Ninguna plataforma coincide con la búsqueda.'}
            </Text>
          ) : (
            <ScrollView
              style={styles.matchesScroll}
              contentContainerStyle={styles.matches}
              keyboardShouldPersistTaps="handled">
              {matches.map(platform => {
                const isSelected = selected === platform.name;
                return (
                  <Pressable
                    key={platform.id}
                    onPress={() => setSelected(platform.name)}
                    style={({pressed}) => [
                      styles.chip,
                      isSelected && styles.chipSelected,
                      pressed && styles.pressed,
                    ]}>
                    {isSelected && (
                      <Icon
                        name="check"
                        size={14}
                        color={colors.backgroundDark}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipLabel,
                        isSelected && styles.chipLabelSelected,
                      ]}>
                      {platform.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {canCreate && (
            <Pressable
              onPress={() => onAdd(query)}
              style={({pressed}) => [styles.createRow, pressed && styles.pressed]}>
              <Icon name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.createLabel} numberOfLines={1}>
                Crear "{query}" como plataforma nueva
              </Text>
            </Pressable>
          )}

          {alreadyInAccount && (
            <Text style={styles.warning}>
              "{query}" ya está en esta cuenta.
            </Text>
          )}

          <Pressable
            disabled={!chosenName}
            onPress={() => chosenName && onAdd(chosenName)}
            style={({pressed}) => [
              styles.submit,
              !chosenName && styles.submitDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.submitLabel}>Agregar a esta cuenta</Text>
          </Pressable>
          <Text style={styles.footnote}>Solo se agrega a esta cuenta</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutralDark,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  input: {
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  matchesScroll: {
    maxHeight: 160,
  },
  matches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutralDark,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.backgroundDark,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.primaryLight,
  },
  createLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
    flex: 1,
  },
  warning: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 16,
  },
  submit: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  submitDisabled: {
    opacity: 0.35,
  },
  submitLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.backgroundDark,
  },
  footnote: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
