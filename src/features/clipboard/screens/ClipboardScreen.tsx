import React, {useEffect, useState, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  Linking,
  Clipboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, typography, fontFamily, borderRadius} from '../../../core/theme';
import {Icon, EmptyState} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';
import type {ClipboardLink, ClipboardFolder} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';
import {PinModal} from '../components/PinModal';

function ItemCard({
  item,
  onDelete,
  onEdit,
}: {
  item: ClipboardLink;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const isNote = item.type === 'note';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        <View
          style={[
            styles.itemIcon,
            isNote && {backgroundColor: 'rgba(168, 85, 247, 0.2)'},
          ]}>
          <Icon
            name={isNote ? 'description' : 'link'}
            size={22}
            color={isNote ? '#a855f7' : colors.primary}
          />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.typeBadge,
                isNote && {backgroundColor: 'rgba(168, 85, 247, 0.2)'},
              ]}>
              <Text
                style={[
                  styles.typeBadgeText,
                  isNote && {color: '#a855f7'},
                ]}>
                {isNote ? 'NOTA' : 'LINK'}
              </Text>
            </View>
          </View>

          {isNote ? (
            <Text style={styles.notePreview} numberOfLines={2}>
              {item.content}
            </Text>
          ) : (
            <Pressable
              onPress={() => {
                Clipboard.setString(item.url);
                Alert.alert('Copiado', 'Link copiado al portapapeles');
              }}>
              <Text style={styles.itemUrl} numberOfLines={1}>
                {item.url}
              </Text>
            </Pressable>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map(tag => (
                <View key={tag.id} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.itemActions}>
            {!isNote && (
              <Pressable
                style={styles.itemAction}
                onPress={() => Linking.openURL(item.url).catch(() => {})}>
                <Icon name="open-in-new" size={14} color={colors.primary} />
                <Text style={styles.itemActionText}>Visitar</Text>
              </Pressable>
            )}
            <Pressable style={styles.itemAction} onPress={onEdit}>
              <Icon name="edit" size={14} color={colors.primary} />
              <Text style={styles.itemActionText}>Editar</Text>
            </Pressable>
            <Pressable style={styles.itemAction} onPress={onDelete}>
              <Icon name="delete-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.itemActionText, {color: colors.textMuted}]}>
                Eliminar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function FolderCard({
  folder,
  onPress,
}: {
  folder: ClipboardFolder;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.folderCard} onPress={onPress}>
      <View
        style={[
          styles.folderIconWrap,
          {backgroundColor: `${folder.color || '#94a3b8'}20`},
        ]}>
        <Icon
          name={folder.icon || 'folder'}
          size={24}
          color={folder.color || '#94a3b8'}
        />
      </View>
      <Text style={styles.folderName} numberOfLines={1}>
        {folder.name}
      </Text>
      <Text style={styles.folderCount}>
        {folder.item_count || 0} items
      </Text>
    </Pressable>
  );
}

export function ClipboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    links,
    folders,
    isPrivateMode,
    isVaultUnlocked,
    loadLinks,
    loadFolders,
    loadTags,
    setPrivateMode,
    deleteLink,
    setActiveFolder,
  } = useClipboardStore();

  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    // Ensure we are showing all items (no folder filter)
    setActiveFolder(null);
    loadLinks();
    loadFolders();
    loadTags();
  }, [loadLinks, loadFolders, loadTags, setActiveFolder]);

  const handlePrivateToggle = () => {
    if (!isPrivateMode) {
      setShowPin(true);
    } else {
      setPrivateMode(false);
    }
  };

  const handlePinSuccess = () => {
    setShowPin(false);
    setPrivateMode(true);
  };

  const handleDeleteItem = (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar este item?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Eliminar', style: 'destructive', onPress: () => deleteLink(id)},
    ]);
  };

  // Items without a folder
  const unfiledLinks = useMemo(
    () => links.filter(l => l.folder_id === null || l.folder_id === undefined),
    [links],
  );

  const isContentVisible = !isPrivateMode || isVaultUnlocked;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backBtn}>
              <Icon name="chevron-left" size={24} color={colors.primary} />
            </Pressable>
            <Text style={styles.titleApp}>Aureus </Text>
            <Text style={styles.titleModule}>Clipboard</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tab, !isPrivateMode && styles.tabActive]}
            onPress={() => setPrivateMode(false)}>
            <Text
              style={[styles.tabText, !isPrivateMode && styles.tabTextActive]}>
              Público
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, isPrivateMode && styles.tabActive]}
            onPress={handlePrivateToggle}>
            <Icon
              name="lock"
              size={14}
              color={isPrivateMode ? colors.backgroundDark : colors.textMuted}
            />
            <Text
              style={[styles.tabText, isPrivateMode && styles.tabTextActive]}>
              Privado
            </Text>
          </Pressable>
        </View>
      </View>

      {isContentVisible ? (
        <FlatList
          data={unfiledLinks}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <ItemCard
              item={item}
              onDelete={() => handleDeleteItem(item.id)}
              onEdit={() => navigation.navigate('EditItem', {itemId: item.id})}
            />
          )}
          contentContainerStyle={styles.mainList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Folders Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>CARPETAS</Text>
                <Pressable
                  onPress={() => navigation.navigate('ManageFolders')}>
                  <Text style={styles.manageLink}>Gestionar</Text>
                </Pressable>
              </View>

              {folders.length === 0 ? (
                <View style={styles.emptyFolders}>
                  <Text style={styles.emptyFoldersText}>
                    Sin carpetas. Tocá "Gestionar" para crear una.
                  </Text>
                </View>
              ) : (
                <View style={styles.folderGrid}>
                  {folders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onPress={() =>
                        navigation.navigate('FolderView', {
                          folderId: folder.id,
                          folderName: folder.name,
                        })
                      }
                    />
                  ))}
                </View>
              )}

              {/* Unfiled Section Header */}
              {unfiledLinks.length > 0 && (
                <Text style={[styles.sectionLabel, {marginTop: 24}]}>
                  SIN CARPETA ({unfiledLinks.length})
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            folders.length > 0 ? null : (
              <EmptyState
                icon="content-paste"
                title="Sin items"
                description="Pegá tu primer link o creá una nota."
              />
            )
          }
        />
      ) : isPrivateMode && !isVaultUnlocked ? (
        <View style={styles.vaultLocked}>
          <View style={styles.vaultIcon}>
            <Icon name="lock" size={32} color={colors.primary} />
          </View>
          <Text style={styles.vaultTitle}>Bóveda Segura</Text>
          <Text style={styles.vaultDesc}>
            Accedé a tus datos sensibles y links privados.
          </Text>
          <Pressable
            style={styles.vaultButton}
            onPress={() => setShowPin(true)}>
            <Text style={styles.vaultButtonText}>Desbloquear con PIN</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Paste Bar */}
      {isContentVisible && (
        <View style={[styles.pasteBar, {bottom: 12 + insets.bottom}]}>
          <Pressable
            style={styles.pasteInput}
            onPress={() =>
              navigation.navigate('AddItem', {isPrivate: isPrivateMode})
            }>
            <Text style={styles.pastePlaceholder}>
              Nuevo link o nota...
            </Text>
          </Pressable>
          <Pressable
            style={styles.pasteButton}
            onPress={() =>
              navigation.navigate('AddItem', {isPrivate: isPrivateMode})
            }>
            <Icon name="add" size={24} color={colors.backgroundDark} />
          </Pressable>
        </View>
      )}

      {/* PIN Modal */}
      <PinModal
        visible={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={handlePinSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGoldLight,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleApp: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  titleModule: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.primary,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.backgroundDark,
  },

  // Main content
  mainList: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
  },
  manageLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },

  // Folder Grid
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  folderCard: {
    width: '31%',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  folderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  folderCount: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyFolders: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyFoldersText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Item Cards
  itemCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGoldLight,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(232, 186, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: 'rgba(232, 186, 48, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  itemUrl: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notePreview: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagBadge: {
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  itemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemActionText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },

  // Vault
  vaultLocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  vaultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  vaultTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  vaultDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 240,
  },
  vaultButton: {
    width: '100%',
    backgroundColor: 'rgba(232, 186, 48, 0.2)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingVertical: 14,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  vaultButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },

  // Paste bar
  pasteBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 186, 48, 0.2)',
    padding: 8,
    elevation: 8,
  },
  pasteInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pastePlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  pasteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
