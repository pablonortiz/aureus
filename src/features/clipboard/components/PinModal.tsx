import React, {useState, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';

interface PinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PinModal({visible, onClose, onSuccess}: PinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);
  const unlockVault = useClipboardStore(s => s.unlockVault);

  const handleChange = async (value: string, index: number) => {
    if (value.length > 1) {
      return;
    }

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    // Check if all filled
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      const success = await unlockVault(fullPin);
      if (success) {
        setPin(['', '', '', '']);
        onSuccess();
      } else {
        Alert.alert('PIN incorrecto', 'Intentá de nuevo.');
        setPin(['', '', '', '']);
        inputs.current[0]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  const handleClose = () => {
    setPin(['', '', '', '']);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.lockIcon}>
            <Icon name="lock" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Ingresá tu PIN</Text>
          <Text style={styles.subtitle}>
            4 dígitos para acceder a la bóveda
          </Text>

          <View style={styles.pinRow}>
            {pin.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputs.current[i] = ref; }}
                style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
                value={digit}
                onChangeText={v => handleChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                autoFocus={i === 0}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 32,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pinInput: {
    width: 52,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceDark,
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
  },
  pinInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
});
