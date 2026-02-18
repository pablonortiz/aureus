import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Alert,
  Dimensions,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  NativeModules,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import Video from 'react-native-video';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {vaultService} from '../services/vaultService';
import {ZoomableView} from '../components/ZoomableView';
import {useGalleryStore} from '../store/useGalleryStore';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {GalleryMedia, GalleryCategory} from '../../../core/types';
import {getDatabase} from '../../../core/database';

const {SecureScreen} = NativeModules;
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaViewerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MediaViewer'>>();
  const {mediaId} = route.params;
  const insets = useSafeAreaInsets();

  // FLAG_SECURE while viewing media
  useEffect(() => {
    SecureScreen.enable();
    return () => {
      SecureScreen.disable();
    };
  }, []);

  const {
    isUnlocked,
    media,
    categories,
    toggleFavorite,
    updateNotes,
    trashMedia,
    exportMedia,
    assignCategories,
    loadCategories,
  } = useGalleryStore();

  // Navigate back when gallery is locked (e.g. app went to background)
  useEffect(() => {
    if (!isUnlocked) {
      navigation.goBack();
    }
  }, [isUnlocked, navigation]);

  const [showUI, setShowUI] = useState(true);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [mediaCategoryIds, setMediaCategoryIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = media.findIndex(m => m.id === mediaId);
    return idx >= 0 ? idx : 0;
  });
  const pagerRef = useRef<FlatList>(null);
  const didMountRef = useRef(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleToggleUI = useCallback(() => setShowUI(prev => !prev), []);
  const handleZoomChange = useCallback((zoomed: boolean) => setIsZoomed(zoomed), []);

  const currentMedia = media[currentIndex];

  // Scroll pager when index changes from arrow buttons (skip initial mount)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (pagerRef.current && media.length > 0) {
      pagerRef.current.scrollToIndex({index: currentIndex, animated: true});
    }
  }, [currentIndex, media.length]);

  // Detect user swipes via momentum end (never fires on mount or programmatic scroll)
  const handleMomentumEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      if (newIndex >= 0 && newIndex < media.length) {
        setCurrentIndex(newIndex);
      }
    },
    [media.length],
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  // Load categories for current media
  useEffect(() => {
    if (currentMedia) {
      setNotesText(currentMedia.notes || '');
      loadMediaCategories(currentMedia.id);
    }
    loadCategories();
  }, [currentMedia, loadCategories]);

  const loadMediaCategories = async (mId: number) => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT category_id FROM gallery_media_categories WHERE media_id = ?',
      [mId],
    );
    setMediaCategoryIds(result.rows.map(r => r.category_id as number));
  };

  // Show UI when switching items; auto-hide after 3s for videos
  useEffect(() => {
    setShowUI(true);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    const item = media[currentIndex];
    if (item?.media_type === 'video') {
      autoHideTimerRef.current = setTimeout(() => setShowUI(false), 3000);
    }
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [currentIndex, media]);

  // Re-trigger auto-hide when user taps to show UI on a video
  const handleShowUI = useCallback(() => {
    setShowUI(true);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    if (currentMedia?.media_type === 'video') {
      autoHideTimerRef.current = setTimeout(() => setShowUI(false), 3000);
    }
  }, [currentMedia?.media_type]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < media.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handleSaveNotes = async () => {
    if (currentMedia) {
      await updateNotes(currentMedia.id, notesText);
      setEditingNotes(false);
    }
  };

  const handleToggleCat = async (catId: number) => {
    if (!currentMedia) return;
    const newIds = mediaCategoryIds.includes(catId)
      ? mediaCategoryIds.filter(id => id !== catId)
      : [...mediaCategoryIds, catId];
    setMediaCategoryIds(newIds);
    await assignCategories(currentMedia.id, newIds);
  };

  const handleDelete = () => {
    if (!currentMedia) return;
    Alert.alert('Eliminar', '¿Mover a la papelera?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await trashMedia([currentMedia.id]);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleExport = async () => {
    if (!currentMedia) return;
    await exportMedia([currentMedia.id]);
    Alert.alert('Exportado', 'Archivo exportado a Descargas.');
  };

  if (!currentMedia) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Archivo no encontrado</Text>
        </View>
      </View>
    );
  }

  const renderMediaItem = useCallback(
    ({item, index}: {item: GalleryMedia; index: number}) => {
      const itemUri = vaultService.getFileUri(item.vault_path);
      const active = index === currentIndex;

      if (item.media_type === 'image') {
        return (
          <View style={styles.mediaPage}>
            <ZoomableView
              onTap={handleToggleUI}
              onZoomChange={handleZoomChange}
              isActive={active}>
              <Image
                source={{uri: itemUri}}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </ZoomableView>
          </View>
        );
      }

      // Video: only mount the Video component for the active item.
      // Non-active videos show a thumbnail to free decoder/buffer memory.
      if (!active) {
        const thumbUri = vaultService.getThumbnailUri(item.filename);
        return (
          <View style={styles.mediaPage}>
            <Image
              source={{uri: thumbUri}}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.videoPlayOverlay}>
              <Icon name="play-circle-filled" size={64} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        );
      }

      return (
        <View style={styles.mediaPage}>
          <ZoomableView
            onZoomChange={handleZoomChange}
            isActive={active}>
            <Video
              source={{uri: itemUri}}
              style={styles.fullImage}
              controls
              resizeMode="contain"
              paused={false}
            />
          </ZoomableView>
        </View>
      );
    },
    [currentIndex, handleToggleUI, handleZoomChange],
  );

  return (
    <View style={styles.container}>
      {/* Swipeable media pager */}
      <FlatList
        ref={pagerRef}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMediaItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={currentIndex}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEnabled={!isZoomed}
        extraData={currentIndex}
        style={styles.pager}
      />

      {/* Tap zone to bring back UI when hidden */}
      {!showUI && (
        <Pressable
          style={[styles.showUITap, {paddingTop: insets.top}]}
          onPress={handleShowUI}
        />
      )}

      {/* Top bar */}
      {showUI && (
        <View style={[styles.topBar, {paddingTop: insets.top + 8}]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={() => setShowInfo(true)} style={styles.iconBtn}>
              <Icon name="info" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => toggleFavorite(currentMedia.id)}
              style={styles.iconBtn}>
              <Icon
                name={currentMedia.is_favorite ? 'favorite' : 'favorite-border'}
                size={22}
                color={currentMedia.is_favorite ? '#ef4444' : '#fff'}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom bar */}
      {showUI && (
        <View style={[styles.bottomBar, {paddingBottom: insets.bottom + 12}]}>
          {/* Navigation arrows */}
          <View style={styles.navRow}>
            <Pressable
              onPress={handlePrev}
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}>
              <Icon
                name="chevron-left"
                size={28}
                color={currentIndex === 0 ? '#555' : '#fff'}
              />
            </Pressable>
            <Text style={styles.counter}>
              {currentIndex + 1} / {media.length}
            </Text>
            <Pressable
              onPress={handleNext}
              style={[
                styles.navBtn,
                currentIndex === media.length - 1 && styles.navBtnDisabled,
              ]}>
              <Icon
                name="chevron-right"
                size={28}
                color={currentIndex === media.length - 1 ? '#555' : '#fff'}
              />
            </Pressable>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable onPress={() => setShowCatModal(true)} style={styles.actionBtn}>
              <Icon name="label" size={20} color="#fff" />
              <Text style={styles.actionLabel}>Categorías</Text>
            </Pressable>
            <Pressable
              onPress={() => setEditingNotes(true)}
              style={styles.actionBtn}>
              <Icon name="edit-note" size={20} color="#fff" />
              <Text style={styles.actionLabel}>Notas</Text>
            </Pressable>
            <Pressable onPress={handleExport} style={styles.actionBtn}>
              <Icon name="file-download" size={20} color="#fff" />
              <Text style={styles.actionLabel}>Exportar</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.actionBtn}>
              <Icon name="delete" size={20} color="#ef4444" />
              <Text style={[styles.actionLabel, {color: '#ef4444'}]}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Info modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowInfo(false)}>
          <View style={styles.infoSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Información</Text>
            <InfoRow label="Nombre" value={currentMedia.original_name} />
            <InfoRow label="Tipo" value={currentMedia.media_type === 'image' ? 'Imagen' : 'Video'} />
            <InfoRow label="Tamaño" value={formatFileSize(currentMedia.file_size)} />
            {currentMedia.width && currentMedia.height && (
              <InfoRow
                label="Resolución"
                value={`${currentMedia.width} × ${currentMedia.height}`}
              />
            )}
            {currentMedia.duration != null && (
              <InfoRow label="Duración" value={`${currentMedia.duration}s`} />
            )}
            <InfoRow
              label="Fecha"
              value={currentMedia.created_at.replace('T', ' ').split('.')[0]}
            />
            {currentMedia.notes && (
              <InfoRow label="Notas" value={currentMedia.notes} />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Notes edit modal */}
      <Modal visible={editingNotes} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditingNotes(false)}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Notas</Text>
            <TextInput
              style={styles.notesInput}
              value={notesText}
              onChangeText={setNotesText}
              multiline
              placeholder="Agregar notas..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setEditingNotes(false)}
                style={styles.dialogBtn}>
                <Text style={styles.dialogBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveNotes}
                style={[styles.dialogBtn, styles.dialogBtnPrimary]}>
                <Text style={[styles.dialogBtnText, {color: colors.backgroundDark}]}>
                  Guardar
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Categories modal */}
      <Modal visible={showCatModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setShowCatModal(false); setCatSearch(''); }}>
          <View style={styles.infoSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Categorías</Text>
            <TextInput
              style={styles.catSearchInput}
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder="Buscar categoría..."
              placeholderTextColor={colors.textMuted}
            />
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories
                .filter(cat =>
                  catSearch.trim()
                    ? normalizeText(cat.name).includes(normalizeText(catSearch.trim()))
                    : true,
                )
                .map(cat => (
                  <Pressable
                    key={cat.id}
                    style={styles.catOption}
                    onPress={() => handleToggleCat(cat.id)}>
                    <View
                      style={[
                        styles.catDot,
                        {backgroundColor: cat.color || '#94a3b8'},
                      ]}
                    />
                    <Text style={styles.catName}>{cat.name}</Text>
                    {mediaCategoryIds.includes(cat.id) && (
                      <Icon name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  pager: {
    flex: 1,
  },
  mediaPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  showUITap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  counter: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  actionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#fff',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  infoSheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 24,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.4,
  },
  sheetTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  infoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
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
  notesInput: {
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
    minHeight: 100,
    textAlignVertical: 'top',
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
  catSearchInput: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 8,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  catDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  catName: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
});
