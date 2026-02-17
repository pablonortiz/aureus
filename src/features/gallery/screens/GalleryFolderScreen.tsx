import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View, ScrollView, Alert, Text, Pressable, TextInput, NativeModules, AppState} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {GalleryHeader} from '../components/GalleryHeader';
import {MediaGrid} from '../components/MediaGrid';
import {SelectionBar} from '../components/SelectionBar';
import {CategoryBadge} from '../components/CategoryBadge';
import {ImportToast} from '../components/ImportToast';
import {useGalleryStore} from '../store/useGalleryStore';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {GalleryMedia} from '../../../core/types';

const {SecureScreen} = NativeModules;

export function GalleryFolderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GalleryFolder'>>();
  const {folderId, folderName} = route.params;
  const insets = useSafeAreaInsets();
  const isImportingRef = useRef(false);
  const [showSearch, setShowSearch] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    media,
    categories,
    selectedIds,
    selectionMode,
    isUnlocked,
    filterCategoryId,
    showFavoritesOnly,
    searchQuery,
    sortBy,
    loadMedia,
    loadCategories,
    importFromPicker,
    toggleFavorite,
    trashMedia,
    exportMedia,
    moveMedia,
    folders,
    loadFolders,
    lock,
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
      loadCategories(folderId);
    }, [folderId, loadMedia, loadFolders, loadCategories]),
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
      SecureScreen.enable(); // Re-apply after picker Activity
      if (AppState.currentState !== 'active') {
        lock();
      }
    }
  };

  const handleMediaPress = (item: GalleryMedia) => {
    if (selectionMode) {
      toggleSelection(item.id);
    } else {
      navigation.push('MediaViewer', {mediaId: item.id});
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

  const handleFilterCategory = (catId: number | null) => {
    useGalleryStore.setState({
      filterCategoryId: filterCategoryId === catId ? null : catId,
    });
    loadMedia(folderId);
  };

  const handleToggleFavorites = () => {
    const newValue = !showFavoritesOnly;
    useGalleryStore.setState({showFavoritesOnly: newValue});
    loadMedia(folderId);
  };

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      useGalleryStore.setState({searchQuery: text});
      loadMedia(folderId);
    }, 300);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    useGalleryStore.setState({searchQuery: ''});
    setShowSearch(false);
    loadMedia(folderId);
  };

  const handleSortChange = (sort: 'date' | 'size') => {
    useGalleryStore.setState({sortBy: sort});
    loadMedia(folderId);
  };

  return (
    <View style={styles.container}>
      <GalleryHeader
        title={folderName}
        onBack={() => {
          useGalleryStore.setState({currentFolderId: null});
          navigation.goBack();
        }}
        rightActions={[
          {icon: 'search', onPress: () => setShowSearch(s => !s)},
        ]}
      />

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={localSearch}
            onChangeText={handleSearchChange}
            placeholder="Buscar por notas..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          {localSearch.length > 0 && (
            <Pressable onPress={handleClearSearch}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

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

          {/* Sort chips */}
          <View style={styles.sortDivider} />
          <Pressable
            onPress={() => handleSortChange('date')}
            style={[styles.sortChip, sortBy === 'date' && styles.sortChipActive]}>
            <Icon name="schedule" size={14} color={sortBy === 'date' ? colors.primary : colors.textMuted} />
            <Text style={[styles.sortChipText, sortBy === 'date' && styles.sortChipTextActive]}>Recientes</Text>
          </Pressable>
          <Pressable
            onPress={() => handleSortChange('size')}
            style={[styles.sortChip, sortBy === 'size' && styles.sortChipActive]}>
            <Icon name="storage" size={14} color={sortBy === 'size' ? colors.primary : colors.textMuted} />
            <Text style={[styles.sortChipText, sortBy === 'size' && styles.sortChipTextActive]}>Tamaño</Text>
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

      <MediaGrid
        media={media}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        onPress={handleMediaPress}
        onLongPress={(item: GalleryMedia) => toggleSelection(item.id)}
        onDragSelect={id => toggleSelection(id)}
      />

      <ImportToast />

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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  sortDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 2,
  },
  sortChip: {
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
  sortChipActive: {
    borderColor: colors.borderGold,
    backgroundColor: colors.primaryLight,
  },
  sortChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  sortChipTextActive: {
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
});
