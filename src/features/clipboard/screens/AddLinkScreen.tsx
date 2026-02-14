import React, {useState, useEffect} from 'react';
import {StyleSheet, Text, View, Alert, ScrollView, Pressable} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Input, Header, Icon} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';
import type {RootStackParamList} from '../../../app/navigation/types';

export function AddLinkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddLink'>>();
  const isPrivate = route.params?.isPrivate || false;
  const {addItem, folders, loadFolders} = useClipboardStore();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) {
      Alert.alert('Error', 'Completá el título y la URL');
      return;
    }
    setLoading(true);
    try {
      await addItem({
        title,
        type: 'link',
        url,
        folderId: selectedFolder,
        isPrivate,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al guardar el link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={isPrivate ? 'Nuevo Link Privado' : 'Nuevo Link'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Título</Text>
        <Input
          placeholder="Nombre del link"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, {marginTop: 20}]}>URL</Text>
        <Input
          placeholder="https://..."
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={[styles.label, {marginTop: 20}]}>Carpeta</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}>
          <Pressable
            style={[
              styles.catOption,
              selectedFolder === null && styles.catOptionActive,
            ]}
            onPress={() => setSelectedFolder(null)}>
            <Text
              style={[
                styles.catOptionText,
                selectedFolder === null && styles.catOptionTextActive,
              ]}>
              Ninguna
            </Text>
          </Pressable>
          {folders.map(f => (
            <Pressable
              key={f.id}
              style={[
                styles.catOption,
                selectedFolder === f.id && styles.catOptionActive,
              ]}
              onPress={() => setSelectedFolder(f.id)}>
              <Text
                style={[
                  styles.catOptionText,
                  selectedFolder === f.id && styles.catOptionTextActive,
                ]}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isPrivate && (
          <View style={styles.privateBadge}>
            <Icon name="lock" size={14} color={colors.primary} />
            <Text style={styles.privateText}>
              Este link se guardará en la bóveda privada
            </Text>
          </View>
        )}

        <Button
          title="Guardar link"
          onPress={handleAdd}
          icon="save"
          loading={loading}
          fullWidth
          style={{marginTop: 32}}
        />
      </ScrollView>
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
  catRow: {
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(232, 186, 48, 0.2)',
  },
  catOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  catOptionTextActive: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  privateText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },
});
