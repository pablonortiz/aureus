import React, {useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Header, Icon, EmptyState} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';
import type {ClipboardLink} from '../../../core/types';
import type {RootStackParamList} from '../../../app/navigation/types';

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
            <Text style={styles.itemUrl} numberOfLines={1}>
              {item.url}
            </Text>
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

export function FolderViewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FolderView'>>();
  const insets = useSafeAreaInsets();
  const {folderId, folderName} = route.params;

  const {
    links,
    tags,
    activeTags,
    isPrivateMode,
    loadLinks,
    loadTags,
    setActiveFolder,
    toggleTag,
    deleteLink,
  } = useClipboardStore();

  useEffect(() => {
    setActiveFolder(folderId);
    loadTags();
    return () => {
      setActiveFolder(null);
    };
  }, [folderId, setActiveFolder, loadTags]);

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar este item?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Eliminar', style: 'destructive', onPress: () => deleteLink(id)},
    ]);
  };

  const renderItem = useCallback(
    ({item}: {item: ClipboardLink}) => (
      <ItemCard
        item={item}
        onDelete={() => handleDelete(item.id)}
        onEdit={() => navigation.navigate('EditItem', {itemId: item.id})}
      />
    ),
    [navigation],
  );

  return (
    <View style={styles.container}>
      <Header
        title={folderName}
        onBack={() => navigation.goBack()}
        rightIcon="label"
        onRightPress={() => navigation.navigate('ManageTags')}
      />

      {/* Tag filter chips */}
      {tags.length > 0 && (
        <View style={styles.tagFilterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagFilterRow}>
            {tags.map(tag => (
              <Pressable
                key={tag.id}
                style={[
                  styles.filterChip,
                  activeTags.includes(tag.id) && styles.filterChipActive,
                ]}
                onPress={() => toggleTag(tag.id)}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeTags.includes(tag.id) && styles.filterChipTextActive,
                  ]}>
                  {tag.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {links.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title="Carpeta vacía"
          description="Agregá links o notas a esta carpeta."
        />
      ) : (
        <FlatList
          data={links}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add button */}
      <Pressable
        style={[styles.fab, {bottom: 24 + insets.bottom}]}
        onPress={() =>
          navigation.navigate('AddItem', {
            isPrivate: isPrivateMode,
            folderId,
          })
        }>
        <Icon name="add" size={28} color={colors.backgroundDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  tagFilterWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tagFilterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
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
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
