import React from 'react';
import {StyleSheet, Text, View, Pressable, Modal} from 'react-native';
import {colors, borderRadius, fontFamily} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {PlatformUsage} from '../../../core/types';

interface DeletePlatformDialogProps {
  platform: PlatformUsage | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function scopeText(accountCount: number): string {
  if (accountCount === 0) {
    return 'No está en ninguna cuenta, así que solo sale del catálogo.';
  }
  if (accountCount === 1) {
    return 'Se va a quitar de la única cuenta donde está, con su estado. Esta acción no se puede deshacer.';
  }
  return `Se va a quitar de las ${accountCount} cuentas donde está, con todos sus estados. Esta acción no se puede deshacer.`;
}

export function DeletePlatformDialog({
  platform,
  onConfirm,
  onCancel,
}: DeletePlatformDialogProps) {
  if (!platform) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <View style={styles.iconCircle}>
            <Icon name="delete-outline" size={24} color={colors.dangerRed} />
          </View>
          <Text style={styles.title}>¿Eliminar {platform.name}?</Text>
          <Text style={styles.body}>{scopeText(platform.accountCount)}</Text>

          <Pressable
            onPress={onConfirm}
            style={({pressed}) => [styles.confirmBtn, pressed && styles.pressed]}>
            <Text style={styles.confirmLabel}>
              {platform.accountCount === 0
                ? 'Eliminar plataforma'
                : 'Eliminar de todas las cuentas'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dangerRedLight,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.dangerRedLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  confirmBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dangerRed,
  },
  confirmLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.white,
  },
  cancelBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
