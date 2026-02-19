import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon} from '../../../core/components';
import {useTasksStore} from '../store/useTasksStore';

const presetColors = [
  '#ef4444', '#f97316', '#f59e0b', '#e8ba30',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#a855f7', '#ec4899', '#DDA0DD', '#94a3b8',
];

export function ManageTaskCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {categories, loadCategories, addCategory, deleteCategory} =
    useTasksStore();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(presetColors[0]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    await addCategory(newName.trim(), newColor);
    setNewName('');
    setNewColor(presetColors[0]);
    setShowAdd(false);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${name}"?`, [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteCategory(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Categorías" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: 40 + insets.bottom},
        ]}>
        {categories.map(cat => (
          <View key={cat.id} style={styles.categoryItem}>
            <View style={[styles.colorDot, {backgroundColor: cat.color}]} />
            <Text style={styles.categoryName}>{cat.name}</Text>
            {cat.is_default ? (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Predefinida</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => handleDelete(cat.id, cat.name)}
                hitSlop={8}>
                <Icon name="delete-outline" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}

        {showAdd ? (
          <View style={styles.addForm}>
            <TextInput
              style={styles.addInput}
              placeholder="Nombre de categoría"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.colorGrid}>
              {presetColors.map(c => (
                <Pressable
                  key={c}
                  style={[
                    styles.colorOption,
                    {backgroundColor: c},
                    newColor === c && styles.colorOptionActive,
                  ]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>
            <View style={styles.addActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={() => setShowAdd(true)}>
            <Icon name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Agregar categoría</Text>
          </Pressable>
        )}
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
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  defaultText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  addButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.primary,
  },
  addForm: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  addInput: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  saveText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.backgroundDark,
  },
});
