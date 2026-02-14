import React, {useState} from 'react';
import {StyleSheet, Text, View, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Input, Header} from '../../../core/components';
import {useGmailStore} from '../store/useGmailStore';

export function AddGmailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const addAccount = useGmailStore(s => s.addAccount);
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!prefix.trim()) {
      Alert.alert('Error', 'Ingresá el prefijo del email');
      return;
    }
    setLoading(true);
    try {
      await addAccount(prefix);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message?.includes('UNIQUE') ? 'Esta cuenta ya existe' : 'Error al agregar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Nuevo Gmail" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.label}>Dirección de email</Text>
        <View style={styles.inputRow}>
          <Input
            placeholder="usuario"
            value={prefix}
            onChangeText={setPrefix}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.suffix}>
            <Text style={styles.suffixText}>@gmail.com</Text>
          </View>
        </View>
        <Text style={styles.preview}>
          {prefix ? `${prefix.toLowerCase().trim()}@gmail.com` : ''}
        </Text>

        <Button
          title="Agregar cuenta"
          onPress={handleAdd}
          icon="add"
          loading={loading}
          fullWidth
          style={{marginTop: 32}}
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
  content: {
    padding: 24,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  input: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  suffix: {
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.borderGold,
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  suffixText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  preview: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
    opacity: 0.7,
  },
});
