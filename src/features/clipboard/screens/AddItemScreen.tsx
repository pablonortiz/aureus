import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Button, Header, Icon} from '../../../core/components';
import {useClipboardStore} from '../store/useClipboardStore';
import type {RootStackParamList} from '../../../app/navigation/types';

type ItemType = 'link' | 'note';

export function AddItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddItem'>>();
  const isPrivate = route.params?.isPrivate || false;
  const prefillFolderId = route.params?.folderId ?? null;

  const {addItem, folders, tags, loadFolders, loadTags, addTag} =
    useClipboardStore();

  const [type, setType] = useState<ItemType>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(
    prefillFolderId,
  );
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFolders();
    loadTags();
  }, [loadFolders, loadTags]);

  const toggleTagSelection = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleCreateTag = async () => {
    if (!newTagInput.trim()) return;
    const tag = await addTag(newTagInput);
    if (tag) {
      setSelectedTags(prev => [...prev, tag.id]);
    }
    setNewTagInput('');
    setShowNewTag(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Completá el título');
      return;
    }
    if (type === 'link' && !url.trim()) {
      Alert.alert('Error', 'Completá la URL');
      return;
    }
    if (type === 'note' && !content.trim()) {
      Alert.alert('Error', 'Escribí el contenido de la nota');
      return;
    }

    setLoading(true);
    try {
      await addItem({
        title: title.trim(),
        type,
        url: type === 'link' ? url.trim() : undefined,
        content: type === 'note' ? content.trim() : undefined,
        folderId: selectedFolder,
        tagIds: selectedTags,
        isPrivate,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={isPrivate ? 'Nuevo Item Privado' : 'Nuevo Item'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Toggle */}
        <View style={styles.typeSwitcher}>
          <Pressable
            style={[styles.typeBtn, type === 'link' && styles.typeBtnActive]}
            onPress={() => setType('link')}>
            <Icon
              name="link"
              size={16}
              color={
                type === 'link' ? colors.backgroundDark : colors.textMuted
              }
            />
            <Text
              style={[
                styles.typeBtnText,
                type === 'link' && styles.typeBtnTextActive,
              ]}>
              Link
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, type === 'note' && styles.typeBtnActive]}
            onPress={() => setType('note')}>
            <Icon
              name="description"
              size={16}
              color={
                type === 'note' ? colors.backgroundDark : colors.textMuted
              }
            />
            <Text
              style={[
                styles.typeBtnText,
                type === 'note' && styles.typeBtnTextActive,
              ]}>
              Nota
            </Text>
          </Pressable>
        </View>

        {/* Title */}
        <Text style={styles.label}>Título</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={
              type === 'link' ? 'Nombre del link' : 'Título de la nota'
            }
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* URL (link only) */}
        {type === 'link' && (
          <>
            <Text style={[styles.label, {marginTop: 20}]}>URL</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </>
        )}

        {/* Content (note only) */}
        {type === 'note' && (
          <>
            <Text style={[styles.label, {marginTop: 20}]}>Contenido</Text>
            <View style={[styles.inputWrapper, styles.multilineWrapper]}>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Escribí tu nota..."
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </>
        )}

        {/* Folder Selection */}
        <Text style={[styles.label, {marginTop: 20}]}>Carpeta</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <Pressable
            style={[
              styles.chip,
              selectedFolder === null && styles.chipActive,
            ]}
            onPress={() => setSelectedFolder(null)}>
            <Text
              style={[
                styles.chipText,
                selectedFolder === null && styles.chipTextActive,
              ]}>
              Sin carpeta
            </Text>
          </Pressable>
          {folders.map(f => (
            <Pressable
              key={f.id}
              style={[
                styles.chip,
                selectedFolder === f.id && styles.chipActive,
                f.color
                  ? {borderColor: selectedFolder === f.id ? f.color : `${f.color}40`}
                  : null,
              ]}
              onPress={() => setSelectedFolder(f.id)}>
              {f.icon && (
                <Icon
                  name={f.icon}
                  size={14}
                  color={
                    selectedFolder === f.id
                      ? colors.backgroundDark
                      : f.color || colors.textSecondary
                  }
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  selectedFolder === f.id && styles.chipTextActive,
                ]}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tags Multi-select */}
        <Text style={[styles.label, {marginTop: 20}]}>Tags</Text>
        <View style={styles.tagsWrap}>
          {tags.map(t => (
            <Pressable
              key={t.id}
              style={[
                styles.tagChip,
                selectedTags.includes(t.id) && styles.tagChipActive,
              ]}
              onPress={() => toggleTagSelection(t.id)}>
              <Text
                style={[
                  styles.tagChipText,
                  selectedTags.includes(t.id) && styles.tagChipTextActive,
                ]}>
                {t.name}
              </Text>
            </Pressable>
          ))}

          {showNewTag ? (
            <View style={styles.newTagRow}>
              <TextInput
                style={styles.newTagInput}
                placeholder="Nuevo tag..."
                placeholderTextColor={colors.textMuted}
                value={newTagInput}
                onChangeText={setNewTagInput}
                onSubmitEditing={handleCreateTag}
                autoFocus
              />
              <Pressable onPress={handleCreateTag} style={styles.newTagConfirm}>
                <Icon name="check" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowNewTag(false);
                  setNewTagInput('');
                }}
                style={styles.newTagCancel}>
                <Icon name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addTagChip}
              onPress={() => setShowNewTag(true)}>
              <Icon name="add" size={14} color={colors.primary} />
              <Text style={styles.addTagText}>Nueva</Text>
            </Pressable>
          )}
        </View>

        {/* Private badge */}
        {isPrivate && (
          <View style={styles.privateBadge}>
            <Icon name="lock" size={14} color={colors.primary} />
            <Text style={styles.privateText}>
              Se guardará en la bóveda privada
            </Text>
          </View>
        )}

        <Button
          title={type === 'link' ? 'Guardar link' : 'Guardar nota'}
          onPress={handleSave}
          icon="save"
          loading={loading}
          fullWidth
          style={{marginTop: 32}}
        />
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
    padding: 24,
    paddingBottom: 48,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primaryGlow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  typeBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.backgroundDark,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  inputWrapper: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  textInput: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  multilineWrapper: {
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 120,
    paddingVertical: 0,
  },
  chipRow: {
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(232, 186, 48, 0.2)',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagChipTextActive: {
    color: colors.backgroundDark,
    fontFamily: fontFamily.bold,
  },
  addTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderStyle: 'dashed',
  },
  addTagText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.primary,
  },
  newTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newTagInput: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 100,
  },
  newTagConfirm: {
    padding: 6,
  },
  newTagCancel: {
    padding: 6,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  privateText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },
});
