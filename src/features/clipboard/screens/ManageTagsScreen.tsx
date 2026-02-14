import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';
import type {ClipboardTag} from '../../../core/types';

export function ManageTagsScreen() {
  const navigation = useNavigation();
  const {tags, loadTags, addTag, deleteTag} = useClipboardStore();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Ingresá un nombre para el tag');
      return;
    }
    await addTag(newName.trim());
    setNewName('');
  };

  const handleDelete = (tag: ClipboardTag) => {
    Alert.alert(
      'Eliminar tag',
      `¿Eliminar "${tag.name}"? Se desasociará de todos los items.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTag(tag.id),
        },
      ],
    );
  };

  const renderTag = ({item}: {item: ClipboardTag}) => (
    <View style={styles.tagRow}>
      <View style={styles.tagIcon}>
        <Icon name="label" size={18} color={colors.primary} />
      </View>
      <Text style={styles.tagName}>{item.name}</Text>
      <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Icon name="close" size={18} color={colors.textDanger} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Gestionar Tags" onBack={() => navigation.goBack()} />

      <FlatList
        data={tags}
        renderItem={renderTag}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="label" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Sin tags creados</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.addSection}>
            <Text style={styles.sectionLabel}>NUEVO TAG</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="Nombre del tag"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleAdd}
              />
              <Pressable style={styles.addButton} onPress={handleAdd}>
                <Icon name="add" size={20} color={colors.backgroundDark} />
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
    padding: 16,
    gap: 12,
  },
  tagIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 186, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagName: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  addSection: {
    marginTop: 24,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
