import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {SourceSearch} from '../../../core/types';
import {useSourceFinderStore} from '../store/useSourceFinderStore';

function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate.replace(' ', 'T')).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) {
    return 'Ahora';
  }
  if (diffMin < 60) {
    return `Hace ${diffMin}m`;
  }
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return `Hace ${diffH}h`;
  }
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) {
    return 'Ayer';
  }
  if (diffD < 7) {
    return `Hace ${diffD}d`;
  }
  return `Hace ${Math.floor(diffD / 7)}sem`;
}

function SearchCard({
  item,
  onPress,
  onDelete,
}: {
  item: SourceSearch;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      style={({pressed}) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardIcon}>
        <Icon name="image-search" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          @{item.tweet_author || 'usuario'} · {item.image_count}{' '}
          {item.image_count === 1 ? 'imagen' : 'imágenes'}
        </Text>
        {item.tweet_text ? (
          <Text style={styles.cardText} numberOfLines={2}>
            {item.tweet_text}
          </Text>
        ) : null}
        <Text style={styles.cardTime}>
          Buscador · {timeAgo(item.created_at)}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
        <Icon name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

export function SourceFinderScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState('');
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const {
    searches,
    searching,
    searchProgress,
    apiKey,
    loadSearches,
    loadApiKey,
    saveApiKey,
    searchTweet,
    deleteSearch,
  } = useSourceFinderStore();

  useFocusEffect(
    useCallback(() => {
      loadSearches();
      loadApiKey();
    }, [loadSearches, loadApiKey]),
  );

  const handleSearch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    try {
      const searchId = await searchTweet(trimmed);
      setUrl('');
      navigation.navigate('SearchResult', {searchId});
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo realizar la búsqueda.',
      );
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Eliminar búsqueda',
      '¿Eliminar esta búsqueda y sus resultados?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteSearch(id),
        },
      ],
    );
  };

  const openKeyModal = () => {
    setKeyInput(apiKey);
    setKeyModalVisible(true);
  };

  const handleSaveKey = async () => {
    await saveApiKey(keyInput.trim());
    setKeyModalVisible(false);
    Alert.alert('Listo', 'API key guardada correctamente.');
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Buscador de Fuentes</Text>
        <Pressable onPress={openKeyModal} hitSlop={12} style={styles.backBtn}>
          <Icon
            name="settings"
            size={20}
            color={apiKey ? colors.primary : colors.textDanger}
          />
        </Pressable>
      </View>

      {/* API Key Warning */}
      {!apiKey && (
        <Pressable onPress={openKeyModal} style={styles.apiWarning}>
          <Icon name="warning" size={18} color="#f59e0b" />
          <Text style={styles.apiWarningText}>
            Configurá tu API key de SauceNAO para buscar
          </Text>
        </Pressable>
      )}

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Icon name="link" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Pegar link de Twitter/X..."
            placeholderTextColor={colors.textMuted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!searching}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <Pressable
          onPress={handleSearch}
          disabled={searching || !url.trim()}
          style={({pressed}) => [
            styles.searchBtn,
            pressed && styles.searchBtnPressed,
            (!url.trim() || searching) && styles.searchBtnDisabled,
          ]}>
          <Icon name="search" size={22} color={colors.backgroundDark} />
        </Pressable>
      </View>

      {/* Searching State */}
      {searching && (
        <View style={styles.searchingState}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.searchingText}>{searchProgress}</Text>
        </View>
      )}

      {/* History */}
      <FlatList
        data={searches}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: 100 + insets.bottom},
        ]}
        ListHeaderComponent={
          searches.length > 0 ? (
            <Text style={styles.sectionLabel}>HISTORIAL</Text>
          ) : null
        }
        ListEmptyComponent={
          !searching ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon
                  name="image-search"
                  size={48}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>Sin búsquedas</Text>
              <Text style={styles.emptyDesc}>
                Pegá un link de Twitter/X con imágenes para identificar manga,
                anime, doujinshi y más.
              </Text>
            </View>
          ) : null
        }
        renderItem={({item}) => (
          <SearchCard
            item={item}
            onPress={() =>
              navigation.navigate('SearchResult', {searchId: item.id})
            }
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />

      {/* API Key Modal */}
      <Modal visible={keyModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Pressable
              style={styles.closeBtn}
              onPress={() => setKeyModalVisible(false)}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>

            <View style={styles.modalIconWrap}>
              <Icon name="key" size={28} color={colors.primary} />
            </View>

            <Text style={styles.modalTitle}>API Key de SauceNAO</Text>
            <Text style={styles.modalSubtitle}>
              Registrate gratis en saucenao.com y pegá tu API key acá.
            </Text>

            <TextInput
              style={styles.keyInput}
              placeholder="Pegar API key..."
              placeholderTextColor={colors.textMuted}
              value={keyInput}
              onChangeText={setKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              onPress={handleSaveKey}
              disabled={!keyInput.trim()}
              style={({pressed}) => [
                styles.saveBtn,
                pressed && styles.saveBtnPressed,
                !keyInput.trim() && styles.saveBtnDisabled,
              ]}>
              <Text style={styles.saveBtnText}>Guardar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },

  // API Warning
  apiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  apiWarningText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#f59e0b',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnPressed: {
    opacity: 0.8,
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },

  // Searching state
  searchingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  searchingText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.primary,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 4,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 10,
  },
  cardPressed: {
    borderColor: colors.borderGold,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardAuthor: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cardText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardTime: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.xl,
    padding: 28,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  keyInput: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnPressed: {
    opacity: 0.8,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.backgroundDark,
  },
});
