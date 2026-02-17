import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  NativeModules,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {GalleryHeader} from '../components/GalleryHeader';
import {useGalleryStore} from '../store/useGalleryStore';

const COLOR_OPTIONS = [
  '#94a3b8',
  '#3b82f6',
  '#a855f7',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
];

const ICON_OPTIONS = [
  'folder',
  'screenshot',
  'person',
  'mood',
  'work',
  'favorite',
  'star',
  'photo',
];

const {SecureScreen} = NativeModules;

export function ManageGalleryCategoriesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {isUnlocked, categories, loadCategories, createCategory, deleteCategory} =
    useGalleryStore();

  // Navigate back when gallery is locked
  useEffect(() => {
    if (!isUnlocked) {
      navigation.goBack();
    }
  }, [isUnlocked, navigation]);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#94a3b8');
  const [newIcon, setNewIcon] = useState('folder');

  useEffect(() => {
    SecureScreen.enable();
    return () => {
      SecureScreen.disable();
    };
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreate = async () => {
    if (newName.trim()) {
      await createCategory(newName.trim(), newColor, newIcon);
      setNewName('');
      setNewColor('#94a3b8');
      setNewIcon('folder');
      setShowAdd(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${name}"? Los archivos no se borrarán.`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteCategory(id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <GalleryHeader
        title="Categorías"
        onBack={() => navigation.goBack()}
        rightActions={[{icon: 'add', onPress: () => setShowAdd(true)}]}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {categories.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="label-off" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Sin categorías</Text>
          </View>
        ) : (
          categories.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View
                style={[
                  styles.catDot,
                  {backgroundColor: cat.color || '#94a3b8'},
                ]}
              />
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
              </View>
              <Pressable onPress={() => handleDelete(cat.id, cat.name)}>
                <Icon name="delete" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {/* Add category modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAdd(false)}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Nueva categoría</Text>

            <TextInput
              style={styles.dialogInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nombre"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorOption,
                    {backgroundColor: c},
                    newColor === c && styles.colorOptionActive,
                  ]}>
                  {newColor === c && (
                    <Icon name="check" size={14} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setShowAdd(false)}
                style={styles.dialogBtn}>
                <Text style={styles.dialogBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                style={[styles.dialogBtn, styles.dialogBtnPrimary]}>
                <Text
                  style={[styles.dialogBtnText, {color: colors.backgroundDark}]}>
                  Crear
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  catDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBox: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  dialogTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  dialogInput: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderGold,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  dialogBtnPrimary: {
    backgroundColor: colors.primary,
  },
  dialogBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
