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
import type {ClipboardFolder} from '../../../core/types';

const ICON_OPTIONS = [
  'folder',
  'work',
  'person',
  'star',
  'bookmark',
  'school',
  'code',
  'fitness-center',
  'shopping-cart',
  'music-note',
  'videocam',
  'image',
];

const COLOR_OPTIONS = [
  '#94a3b8',
  '#3b82f6',
  '#a855f7',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
];

export function ManageFoldersScreen() {
  const navigation = useNavigation();
  const {folders, loadFolders, addFolder, updateFolder, deleteFolder, isPrivateMode} =
    useClipboardStore();

  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#94a3b8');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('folder');
  const [editColor, setEditColor] = useState('#94a3b8');

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Ingresá un nombre para la carpeta');
      return;
    }
    await addFolder(newName.trim(), selectedIcon, selectedColor, isPrivateMode);
    setNewName('');
    setSelectedIcon('folder');
    setSelectedColor('#94a3b8');
  };

  const handleDelete = (folder: ClipboardFolder) => {
    Alert.alert(
      'Eliminar carpeta',
      `¿Eliminar "${folder.name}"? Los items se moverán a "Sin carpeta".`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteFolder(folder.id),
        },
      ],
    );
  };

  const startEditing = (folder: ClipboardFolder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
    setEditIcon(folder.icon || 'folder');
    setEditColor(folder.color || '#94a3b8');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateFolder(editingId, editName.trim(), editIcon, editColor);
    setEditingId(null);
  };

  const renderFolder = ({item}: {item: ClipboardFolder}) => {
    if (editingId === item.id) {
      return (
        <View style={styles.editCard}>
          <TextInput
            style={styles.editInput}
            value={editName}
            onChangeText={setEditName}
            autoFocus
          />
          <View style={styles.editIconRow}>
            {ICON_OPTIONS.map(ic => (
              <Pressable
                key={ic}
                style={[
                  styles.iconOption,
                  editIcon === ic && {
                    backgroundColor: editColor,
                    borderColor: editColor,
                  },
                ]}
                onPress={() => setEditIcon(ic)}>
                <Icon
                  name={ic}
                  size={18}
                  color={editIcon === ic ? colors.backgroundDark : colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
          <View style={styles.editColorRow}>
            {COLOR_OPTIONS.map(c => (
              <Pressable
                key={c}
                style={[
                  styles.colorDot,
                  {backgroundColor: c},
                  editColor === c && styles.colorDotActive,
                ]}
                onPress={() => setEditColor(c)}
              />
            ))}
          </View>
          <View style={styles.editActions}>
            <Pressable style={styles.editActionBtn} onPress={handleSaveEdit}>
              <Icon name="check" size={18} color={colors.successGreen} />
              <Text style={[styles.editActionText, {color: colors.successGreen}]}>
                Guardar
              </Text>
            </Pressable>
            <Pressable
              style={styles.editActionBtn}
              onPress={() => setEditingId(null)}>
              <Icon name="close" size={18} color={colors.textMuted} />
              <Text style={styles.editActionText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.folderRow}>
        <View
          style={[
            styles.folderIcon,
            {backgroundColor: `${item.color || '#94a3b8'}20`},
          ]}>
          <Icon
            name={item.icon || 'folder'}
            size={20}
            color={item.color || '#94a3b8'}
          />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{item.name}</Text>
          <Text style={styles.folderCount}>
            {item.item_count || 0} items
          </Text>
        </View>
        <Pressable style={styles.actionBtn} onPress={() => startEditing(item)}>
          <Icon name="edit" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Icon name="delete-outline" size={18} color={colors.textDanger} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Gestionar Carpetas" onBack={() => navigation.goBack()} />

      <FlatList
        data={folders}
        renderItem={renderFolder}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.addSection}>
            <Text style={styles.sectionLabel}>NUEVA CARPETA</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Nombre de la carpeta"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.pickLabel}>Ícono</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(ic => (
                <Pressable
                  key={ic}
                  style={[
                    styles.iconOption,
                    selectedIcon === ic && {
                      backgroundColor: selectedColor,
                      borderColor: selectedColor,
                    },
                  ]}
                  onPress={() => setSelectedIcon(ic)}>
                  <Icon
                    name={ic}
                    size={18}
                    color={
                      selectedIcon === ic
                        ? colors.backgroundDark
                        : colors.textMuted
                    }
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.pickLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map(c => (
                <Pressable
                  key={c}
                  style={[
                    styles.colorDot,
                    {backgroundColor: c},
                    selectedColor === c && styles.colorDotActive,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <Pressable style={styles.addButton} onPress={handleAdd}>
              <Icon name="add" size={20} color={colors.backgroundDark} />
              <Text style={styles.addButtonText}>Crear carpeta</Text>
            </Pressable>
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
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
    padding: 16,
    gap: 12,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  folderCount: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: 16,
    gap: 12,
  },
  editInput: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editIconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editColorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editActionText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
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
    marginBottom: 4,
  },
  nameInput: {
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
  pickLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    marginTop: 8,
  },
  addButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.backgroundDark,
  },
});
