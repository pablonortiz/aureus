import React, {useCallback, useEffect, useRef} from 'react';
import {StyleSheet, View, Alert, NativeModules} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
// launchImageLibrary replaced by native picker
import {colors} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {GalleryHeader} from '../components/GalleryHeader';
import {MediaGrid} from '../components/MediaGrid';
import {SelectionBar} from '../components/SelectionBar';
import {useGalleryStore} from '../store/useGalleryStore';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {GalleryMedia} from '../../../core/types';
import {Pressable} from 'react-native';

const {SecureScreen} = NativeModules;

export function GalleryFolderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GalleryFolder'>>();
  const {folderId, folderName} = route.params;
  const insets = useSafeAreaInsets();
  const isImportingRef = useRef(false);

  const {
    media,
    selectedIds,
    selectionMode,
    isUnlocked,
    loadMedia,
    importFromPicker,
    toggleFavorite,
    trashMedia,
    exportMedia,
    moveMedia,
    folders,
    loadFolders,
    toggleSelection,
    clearSelection,
  } = useGalleryStore();

  // FLAG_SECURE while inside gallery
  useEffect(() => {
    SecureScreen.enable();
    return () => {
      SecureScreen.disable();
    };
  }, []);

  // Navigate back when gallery is locked
  useEffect(() => {
    if (!isUnlocked) {
      navigation.goBack();
    }
  }, [isUnlocked, navigation]);

  useFocusEffect(
    useCallback(() => {
      useGalleryStore.setState({currentFolderId: folderId});
      loadMedia(folderId);
      loadFolders(folderId);
    }, [folderId, loadMedia, loadFolders]),
  );

  const handleImport = async () => {
    isImportingRef.current = true;
    try {
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

  const handleMediaPress = (item: GalleryMedia) => {
    if (selectionMode) {
      toggleSelection(item.id);
    } else {
      navigation.navigate('MediaViewer', {mediaId: item.id});
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

  const handleBulkMove = async () => {
    await moveMedia(selectedIds, null);
  };

  return (
    <View style={styles.container}>
      <GalleryHeader
        title={folderName}
        onBack={() => {
          useGalleryStore.setState({currentFolderId: null});
          navigation.goBack();
        }}
      />

      <MediaGrid
        media={media}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onPress={handleMediaPress}
        onLongPress={(item: GalleryMedia) => toggleSelection(item.id)}
      />

      {selectionMode && (
        <SelectionBar
          count={selectedIds.length}
          onMove={handleBulkMove}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onCancel={clearSelection}
        />
      )}

      {!selectionMode && (
        <Pressable
          onPress={handleImport}
          style={[styles.fab, {bottom: 24 + insets.bottom}]}>
          <Icon name="add" size={30} color={colors.backgroundDark} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
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
});
