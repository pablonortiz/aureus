import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';
import {useRadarStore} from '../store/useRadarStore';

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

export function RadarScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    searches,
    searching,
    searchProgress,
    apiKey,
    loadApiKey,
    saveApiKey,
    loadSearches,
    search,
    clearHistory,
  } = useRadarStore();

  const [queryText, setQueryText] = useState('');
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadApiKey();
      loadSearches();
    }, [loadApiKey, loadSearches]),
  );

  const handleSearch = async () => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      return;
    }

    if (!apiKey) {
      setApiKeyInput('');
      setConfigModalVisible(true);
      return;
    }

    try {
      const searchId = await search(trimmed);
      setQueryText('');
      navigation.navigate('RadarResults', {searchId});
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar la búsqueda');
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      return;
    }
    await saveApiKey(trimmed);
    setConfigModalVisible(false);
    Alert.alert('Listo', 'API key guardada correctamente');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Limpiar historial',
      '¿Eliminar todas las búsquedas no guardadas?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Eliminar', style: 'destructive', onPress: clearHistory},
      ],
    );
  };

  const handleSearchTap = (searchId: number, isSaved: boolean) => {
    if (isSaved) {
      navigation.navigate('RadarSaved', {searchId});
    } else {
      navigation.navigate('RadarResults', {searchId});
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 16, paddingBottom: 100 + insets.bottom},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconWrap}>
              <Icon name="radar" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Radar</Text>
              <Text style={styles.headerSubtitle}>
                Inteligencia en tiempo real
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              setApiKeyInput(apiKey);
              setConfigModalVisible(true);
            }}
            style={styles.configBtn}>
            <Icon name="settings" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Icon name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscá algo..."
              placeholderTextColor={colors.textMuted}
              value={queryText}
              onChangeText={setQueryText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!searching}
            />
          </View>
          <Pressable
            onPress={handleSearch}
            disabled={searching || !queryText.trim()}
            style={({pressed}) => [
              styles.searchBtn,
              pressed && styles.searchBtnPressed,
              (!queryText.trim() || searching) && styles.searchBtnDisabled,
            ]}>
            {searching ? (
              <ActivityIndicator size={18} color={colors.backgroundDark} />
            ) : (
              <Icon name="send" size={20} color={colors.backgroundDark} />
            )}
          </Pressable>
        </View>

        {/* Loading state */}
        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{searchProgress}</Text>
          </View>
        )}

        {/* History */}
        {!searching && searches.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Búsquedas Recientes</Text>
              <Pressable onPress={handleClearHistory}>
                <Text style={styles.clearBtn}>Limpiar todo</Text>
              </Pressable>
            </View>

            {searches.map(item => (
              <Pressable
                key={item.id}
                style={({pressed}) => [
                  styles.historyCard,
                  pressed && styles.historyCardPressed,
                ]}
                onPress={() => handleSearchTap(item.id, item.is_saved)}>
                <View style={styles.historyCardContent}>
                  <View style={styles.historyIconWrap}>
                    <Icon
                      name={item.is_saved ? 'bookmark' : 'radar'}
                      size={18}
                      color={item.is_saved ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyQuery} numberOfLines={2}>
                      {item.query}
                    </Text>
                    <View style={styles.historyMeta}>
                      <View style={styles.queryBadge}>
                        <Text style={styles.queryBadgeText}>
                          {item.query_count} QUERIES
                        </Text>
                      </View>
                      <Text style={styles.historyTime}>
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!searching && searches.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name="radar" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sin búsquedas aún</Text>
            <Text style={styles.emptyDesc}>
              Escribí una consulta y Radar generará queries optimizados para
              distintas plataformas.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* API Key Config Modal */}
      <Modal
        visible={configModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfigModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Pressable
              style={styles.closeBtn}
              onPress={() => setConfigModalVisible(false)}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>

            <View style={styles.modalIconWrap}>
              <Icon name="vpn-key" size={28} color={colors.primary} />
            </View>

            <Text style={styles.modalTitle}>API Key de Groq</Text>
            <Text style={styles.modalSubtitle}>
              Necesitás una API key gratuita de Groq para usar Radar
            </Text>

            <TextInput
              style={styles.apiKeyInput}
              placeholder="gsk_..."
              placeholderTextColor={colors.textMuted}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              onPress={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
              style={({pressed}) => [
                styles.saveKeyBtn,
                pressed && styles.saveKeyBtnPressed,
                !apiKeyInput.trim() && styles.saveKeyBtnDisabled,
              ]}>
              <Text style={styles.saveKeyBtnText}>Guardar</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 16,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  configBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 14,
  },
  searchBtn: {
    width: 52,
    height: 52,
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

  // Loading
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // History
  historySection: {
    gap: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearBtn: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.textDanger,
    letterSpacing: 0.5,
  },
  historyCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  historyCardPressed: {
    borderColor: colors.borderGold,
  },
  historyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyQuery: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  queryBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  historyTime: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
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
    padding: 32,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  apiKeyInput: {
    width: '100%',
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 16,
  },
  saveKeyBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveKeyBtnPressed: {
    opacity: 0.8,
  },
  saveKeyBtnDisabled: {
    opacity: 0.4,
  },
  saveKeyBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.backgroundDark,
  },
});
