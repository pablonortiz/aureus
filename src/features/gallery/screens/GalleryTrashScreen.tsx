import React, {useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  Alert,
  NativeModules,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import {GalleryHeader} from '../components/GalleryHeader';
import {vaultService} from '../services/vaultService';
import {useGalleryStore} from '../store/useGalleryStore';

function daysRemaining(trashedAt: string): number {
  const trashed = new Date(trashedAt.replace(' ', 'T')).getTime();
  const expiry = trashed + 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return Math.max(0, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const {SecureScreen} = NativeModules;

export function GalleryTrashScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    SecureScreen.enable();
    return () => {
      SecureScreen.disable();
    };
  }, []);
  const {
    isUnlocked,
    trashedMedia,
    loadTrash,
    restoreMedia,
    permanentDelete,
    cleanupExpiredTrash,
  } = useGalleryStore();

  // Navigate back when gallery is locked
  useEffect(() => {
    if (!isUnlocked) {
      navigation.goBack();
    }
  }, [isUnlocked, navigation]);

  useEffect(() => {
    cleanupExpiredTrash().then(() => loadTrash());
  }, [cleanupExpiredTrash, loadTrash]);

  const handleRestore = (id: number) => {
    restoreMedia([id]);
  };

  const handlePermanentDelete = (id: number) => {
    Alert.alert(
      'Eliminar permanentemente',
      'Esta acción no se puede deshacer. ¿Continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => permanentDelete([id]),
        },
      ],
    );
  };

  const handleEmptyTrash = () => {
    if (trashedMedia.length === 0) return;
    Alert.alert(
      'Vaciar papelera',
      `¿Eliminar permanentemente ${trashedMedia.length} archivo(s)?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: () => permanentDelete(trashedMedia.map(m => m.id)),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <GalleryHeader
        title="Papelera"
        onBack={() => navigation.goBack()}
        rightActions={
          trashedMedia.length > 0
            ? [{icon: 'delete-forever', onPress: handleEmptyTrash}]
            : []
        }
      />

      {trashedMedia.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="delete-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Papelera vacía</Text>
          <Text style={styles.emptySubtext}>
            Los archivos eliminados aparecen aquí por 30 días
          </Text>
        </View>
      ) : (
        <FlatList
          data={trashedMedia}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[styles.list, {paddingBottom: 16 + insets.bottom}]}
          renderItem={({item}) => {
            const days = daysRemaining(item.trashed_at || '');
            const uri =
              item.media_type === 'video'
                ? vaultService.getThumbnailUri(item.filename)
                : vaultService.getFileUri(item.vault_path);

            return (
              <View style={styles.trashItem}>
                <Image
                  source={{uri}}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.trashInfo}>
                  <Text style={styles.trashName} numberOfLines={1}>
                    {item.original_name}
                  </Text>
                  <Text style={styles.trashMeta}>
                    {formatFileSize(item.file_size)} · Se elimina en {days}{' '}
                    {days === 1 ? 'día' : 'días'}
                  </Text>
                </View>
                <View style={styles.trashActions}>
                  <Pressable
                    onPress={() => handleRestore(item.id)}
                    style={styles.trashBtn}>
                    <Icon name="restore" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handlePermanentDelete(item.id)}
                    style={styles.trashBtn}>
                    <Icon name="delete-forever" size={20} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  trashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardDark,
  },
  trashInfo: {
    flex: 1,
  },
  trashName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  trashMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  trashActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardDark,
  },
});
