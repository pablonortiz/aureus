import React, {useState} from 'react';
import {StyleSheet, Text, View, Pressable} from 'react-native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';

interface PinLockProps {
  onUnlock: (pin: string) => void;
  isSetup?: boolean;
}

export function PinLock({onUnlock, isSetup}: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    if (newPin.length === 4) {
      onUnlock(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name="lock" size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>
        {isSetup ? 'Crear PIN' : 'Bóveda Segura'}
      </Text>
      <Text style={styles.subtitle}>
        {isSetup
          ? 'Elegí un PIN de 4 dígitos'
          : 'Ingresá tu PIN para acceder'}
      </Text>

      {/* Pin dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>PIN incorrecto</Text>}

      {/* Keypad */}
      <View style={styles.keypad}>
        {digits.map((digit, i) => {
          if (digit === '') return <View key={i} style={styles.keyEmpty} />;
          if (digit === 'del') {
            return (
              <Pressable
                key={i}
                style={styles.key}
                onPress={handleDelete}>
                <Icon name="backspace" size={24} color={colors.textSecondary} />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={i}
              style={({pressed}) => [styles.key, pressed && styles.keyPressed]}
              onPress={() => handlePress(digit)}>
              <Text style={styles.keyText}>{digit}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    backgroundColor: colors.backgroundDark,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderGold,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotError: {
    borderColor: colors.dangerRed,
    backgroundColor: colors.dangerRed,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.dangerRed,
    marginTop: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 32,
    width: 260,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 6,
  },
  keyPressed: {
    backgroundColor: colors.primaryLight,
  },
  keyEmpty: {
    width: 72,
    height: 72,
    margin: 6,
  },
  keyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 28,
    color: colors.textPrimary,
  },
});
