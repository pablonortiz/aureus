import React, {useState} from 'react';
import {StyleSheet, Text, View, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily} from '../../../core/theme';
import {Button, Input, Header} from '../../../core/components';
import {useGmailStore} from '../store/useGmailStore';

export function AddPlatformScreen() {
  const navigation = useNavigation();
  const addPlatformToAll = useGmailStore(s => s.addPlatformToAll);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresá el nombre de la plataforma');
      return;
    }
    setLoading(true);
    try {
      await addPlatformToAll(name);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', 'Error al agregar la plataforma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Nueva Plataforma" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.hint}>
          Esta plataforma se agregará como chip a todas las cuentas Gmail existentes.
        </Text>

        <Text style={styles.label}>Nombre de la plataforma</Text>
        <Input
          placeholder="Ej: Netflix, Spotify, Amazon..."
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Button
          title="Añadir a todos"
          onPress={handleAdd}
          icon="add-box"
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
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
});
