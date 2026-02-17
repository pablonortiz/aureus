import React, {useCallback, useEffect, useRef} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Alert,
  AppState,
  TextInput,
  Text,
  Modal,
  NativeModules,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {launchCamera} from 'react-native-image-picker';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon, PinLock} from '../../../core/components';
import {GalleryHeader} from '../components/GalleryHeader';
import {FolderCard} from '../components/FolderCard';
import {MediaGrid} from '../components/MediaGrid';
import {SelectionBar} from '../components/SelectionBar';
import {CategoryBadge} from '../components/CategoryBadge';
import {useGalleryStore} from '../store/useGalleryStore';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {GalleryMedia} from '../../../core/types';

const {SecureScreen} = NativeModules;

export function GalleryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {
    isUnlocked,
    hasPin,
    folders,
    media,
    categories,
    selectedIds,
    selectionMode,
    filterCategoryId,
    showFavoritesOnly,
    loading,
    checkPin,
    unlock,
    lock,
    loadFolders,
    createFolder,
    loadMedia,
    importFromPicker,
    importFromCamera,
    toggleFavorite,
    trashMedia,
    exportMedia,
    moveMedia,
    loadCategories,
    toggleSelection,
    clearSelection,
    cleanupExpiredTrash,
  } = useGalleryStore();

  const [showNewFolder, setShowNewFolder] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [showImportMenu, setShowImportMenu] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const isImportingRef = useRef(false);

  // Check PIN on mount
  useEffect(() => {
    checkPin();
  }, [checkPin]);

  // FLAG_SECURE: hide content from recents & screenshots while in gallery
  useEffect(() => {
    SecureScreen.enable();
    return () => {
      SecureScreen.disable();
    };
  }, []);

  // Load data when unlocked
  useFocusEffect(
    useCallback(() => {
      if (isUnlocked) {
        loadFolders();
        loadMedia(null);
        loadCategories();
        cleanupExpiredTrash();
      }
    }, [isUnlocked, loadFolders, loadMedia, loadCategories, cleanupExpiredTrash]),
  );

  // Background protection: lock gallery (skip during import/camera)
  // No need to navigate away — FLAG_SECURE hides content from recents
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (
        (state === 'background' || state === 'inactive') &&
        isUnlocked &&
        !isImportingRef.current
      ) {
        lock();
      }
    });
    return () => sub.remove();
  }, [isUnlocked, lock]);

  const handleUnlock = async (pin: string) => {
    const success = await unlock(pin);
    if (!success) {
      Alert.alert('PIN incorrecto', 'Intentá de nuevo.');
    }
  };

  const handleImportFromGallery = async () => {
    setShowImportMenu(false);
    isImportingRef.current = true;
    try {
      // Native picker: picks files, copies to vault, deletes originals
      const allDeleted = await importFromPicker();
      if (!allDeleted) {
        Alert.alert(
          'Importación completada',
          'Algunos originales no pudieron eliminarse. Podés borrarlos manualmente.',
          [{text: 'Entendido'}],
        );
      }
    } finally {
      isImportingRef.current = false;
    }
  };

  const handleImportFromCamera = async () => {
    setShowImportMenu(false);
    isImportingRef.current = true;
    try {
      const result = await launchCamera({
        mediaType: 'mixed',
      });
      if (result.assets && result.assets.length > 0) {
        await importFromCamera(result.assets);
      }
    } finally {
      isImportingRef.current = false;
    }
  };

  const handleMediaPress = (item: GalleryMedia) => {
    if (selectionMode) {
      toggleSelection(item.id);
    } else {
      navigation.navigate('MediaViewer', {mediaId: item.id});
    }
  };

  const handleMediaLongPress = (item: GalleryMedia) => {
    toggleSelection(item.id);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleBulkFavorite = async () => {
    for (const id of selectedIds) {
      await toggleFavorite(id);
    }
    clearSelection();
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Eliminar archivos',
      `¿Mover ${selectedIds.length} archivo(s) a la papelera?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => trashMedia(selectedIds),
        },
      ],
    );
  };

  const handleBulkExport = async () => {
    const paths = await exportMedia(selectedIds);
    Alert.alert('Exportado', `${paths.length} archivo(s) exportado(s) a Descargas.`);
  };

  const handleBulkMove = async (folderId: number | null) => {
    await moveMedia(selectedIds, folderId);
    setShowMoveModal(false);
  };

  const handleFilterCategory = (catId: number | null) => {
    useGalleryStore.setState({
      filterCategoryId: filterCategoryId === catId ? null : catId,
    });
    loadMedia();
  };

  const handleToggleFavorites = () => {
    useGalleryStore.setState({showFavoritesOnly: !showFavoritesOnly});
    loadMedia();
  };

  // PIN gate
  if (!isUnlocked) {
    return (
      <View style={styles.container}>
        <GalleryHeader
          title="Galería"
          onBack={() => navigation.goBack()}
        />
        <PinLock
          onUnlock={handleUnlock}
          isSetup={!hasPin}
          title={hasPin ? 'Galería Oculta' : 'Crear PIN'}
          subtitle={
            hasPin
              ? 'Ingresá tu PIN para acceder'
              : 'Elegí un PIN de 4 dígitos para proteger tu galería'
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GalleryHeader
        title="Galería"
        onBack={() => navigation.goBack()}
        rightActions={[
          {icon: 'label', onPress: () => navigation.navigate('ManageGalleryCategories')},
          {icon: 'delete', onPress: () => navigation.navigate('GalleryTrash')},
        ]}
      />

      {/* Folders row */}
      <View style={styles.foldersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.foldersRow}>
          {/* Add folder button */}
          <Pressable
            onPress={() => setShowNewFolder(true)}
            style={styles.addFolderBtn}>
            <Icon name="create-new-folder" size={24} color={colors.primary} />
            <Text style={styles.addFolderText}>Nueva</Text>
          </Pressable>

          {folders.map(folder => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onPress={() =>
                navigation.navigate('GalleryFolder', {
                  folderId: folder.id,
                  folderName: folder.name,
                })
              }
              onLongPress={() => {
                Alert.alert(folder.name, 'Opciones de carpeta', [
                  {
                    text: 'Renombrar',
                    onPress: () => {
                      Alert.prompt?.(
                        'Renombrar carpeta',
                        '',
                        (name: string) => {
                          if (name.trim()) {
                            useGalleryStore.getState().renameFolder(folder.id, name.trim());
                          }
                        },
                        'plain-text',
                        folder.name,
                      );
                    },
                  },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () =>
                      useGalleryStore.getState().deleteFolder(folder.id),
                  },
                  {text: 'Cancelar', style: 'cancel'},
                ]);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Category filters */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}>
          <Pressable
            onPress={handleToggleFavorites}
            style={[
              styles.favChip,
              showFavoritesOnly && styles.favChipActive,
            ]}>
            <Icon
              name="favorite"
              size={14}
              color={showFavoritesOnly ? '#ef4444' : colors.textMuted}
            />
            <Text
              style={[
                styles.favChipText,
                showFavoritesOnly && {color: '#ef4444'},
              ]}>
              Favoritos
            </Text>
          </Pressable>

          {categories.map(cat => (
            <CategoryBadge
              key={cat.id}
              name={cat.name}
              color={cat.color || '#94a3b8'}
              active={filterCategoryId === cat.id}
              onPress={() => handleFilterCategory(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Media grid */}
      <MediaGrid
        media={media}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onPress={handleMediaPress}
        onLongPress={handleMediaLongPress}
      />

      {/* Selection bar */}
      {selectionMode && (
        <SelectionBar
          count={selectedIds.length}
          onMove={() => setShowMoveModal(true)}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onCancel={clearSelection}
        />
      )}

      {/* FAB - Import */}
      {!selectionMode && (
        <Pressable
          onPress={() => setShowImportMenu(true)}
          style={[styles.fab, {bottom: 24 + insets.bottom}]}>
          <Icon name="add" size={30} color={colors.backgroundDark} />
        </Pressable>
      )}

      {/* Import menu modal */}
      <Modal visible={showImportMenu} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowImportMenu(false)}>
          <View style={[styles.importSheet, {paddingBottom: 20 + insets.bottom}]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Importar</Text>
            <Pressable style={styles.sheetOption} onPress={handleImportFromGallery}>
              <Icon name="photo-library" size={24} color={colors.primary} />
              <Text style={styles.sheetOptionText}>Desde galería</Text>
            </Pressable>
            <Pressable style={styles.sheetOption} onPress={handleImportFromCamera}>
              <Icon name="photo-camera" size={24} color={colors.primary} />
              <Text style={styles.sheetOptionText}>Tomar foto</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* New folder modal */}
      <Modal visible={showNewFolder} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNewFolder(false)}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Nueva carpeta</Text>
            <TextInput
              style={styles.dialogInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Nombre de la carpeta"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setShowNewFolder(false)}
                style={styles.dialogBtn}>
                <Text style={styles.dialogBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateFolder}
                style={[styles.dialogBtn, styles.dialogBtnPrimary]}>
                <Text style={[styles.dialogBtnText, {color: colors.backgroundDark}]}>
                  Crear
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Move to folder modal */}
      <Modal visible={showMoveModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMoveModal(false)}>
          <View style={[styles.importSheet, {paddingBottom: 20 + insets.bottom}]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Mover a carpeta</Text>
            <Pressable
              style={styles.sheetOption}
              onPress={() => handleBulkMove(null)}>
              <Icon name="folder-off" size={24} color={colors.textSecondary} />
              <Text style={styles.sheetOptionText}>Sin carpeta</Text>
            </Pressable>
            {folders.map(f => (
              <Pressable
                key={f.id}
                style={styles.sheetOption}
                onPress={() => handleBulkMove(f.id)}>
                <Icon name="folder" size={24} color={colors.primary} />
                <Text style={styles.sheetOptionText}>{f.name}</Text>
              </Pressable>
            ))}
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
  foldersSection: {
    paddingVertical: 12,
  },
  foldersRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  addFolderBtn: {
    width: 110,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addFolderText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  filtersSection: {
    paddingBottom: 12,
  },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceDark,
    height: 32,
  },
  favChipActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  favChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  importSheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.borderGold,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.4,
  },
  sheetTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  sheetOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  dialogBox: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: 24,
    marginHorizontal: 32,
    marginBottom: 'auto',
    marginTop: 'auto',
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
    marginBottom: 20,
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
