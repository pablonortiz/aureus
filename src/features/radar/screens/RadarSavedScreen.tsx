import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
  Clipboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {RadarSearch, RadarQuery} from '../../../core/types';
import {useRadarStore} from '../store/useRadarStore';

const PLATFORM_CONFIG: Record<
  string,
  {label: string; color: string; icon: string}
> = {
  twitter: {label: 'Twitter / X', color: '#1DA1F2', icon: 'tag'},
  google_news: {label: 'Google News', color: '#4285F4', icon: 'newspaper'},
  reddit: {label: 'Reddit', color: '#FF4500', icon: 'forum'},
  instagram: {label: 'Instagram', color: '#E1306C', icon: 'camera-alt'},
  google: {label: 'Google', color: '#34A853', icon: 'search'},
};

function formatDate(isoDate: string): string {
  const d = new Date(isoDate.replace(' ', 'T'));
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RadarSavedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RadarSaved'>>();
  const {searchId} = route.params;

  const {searches, currentQueries, loadQueries, updateNotes, unsaveSearch, deleteSearch} =
    useRadarStore();

  const [searchData, setSearchData] = useState<RadarSearch | null>(null);
  const [notes, setNotes] = useState('');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadQueries(searchId);
  }, [searchId, loadQueries]);

  useEffect(() => {
    const found = searches.find(s => s.id === searchId);
    if (found) {
      setSearchData(found);
      setNotes(found.notes || '');
    }
  }, [searches, searchId]);

  const handleNotesChange = useCallback(
    (text: string) => {
      setNotes(text);
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = setTimeout(() => {
        updateNotes(searchId, text);
      }, 800);
    },
    [searchId, updateNotes],
  );

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }
  }, []);

  const handleCopy = useCallback((text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copiado', 'Query copiado al portapapeles');
  }, []);

  const handleUnsave = useCallback(() => {
    Alert.alert(
      'Quitar de guardados',
      '¿Quitar esta búsqueda de tus guardados?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            await unsaveSearch(searchId);
            navigation.goBack();
          },
        },
      ],
    );
  }, [unsaveSearch, searchId, navigation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar búsqueda',
      '¿Eliminar esta búsqueda permanentemente?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteSearch(searchId);
            navigation.goBack();
          },
        },
      ],
    );
  }, [deleteSearch, searchId, navigation]);

  // Group queries by platform
  const groupedQueries = currentQueries.reduce<Record<string, RadarQuery[]>>(
    (acc, q) => {
      if (!acc[q.platform]) {
        acc[q.platform] = [];
      }
      acc[q.platform].push(q);
      return acc;
    },
    {},
  );

  const keywords: string[] = searchData?.keywords
    ? JSON.parse(searchData.keywords)
    : [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 16, paddingBottom: 40 + insets.bottom},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {searchData?.query || 'Búsqueda'}
            </Text>
            <Text style={styles.headerBadge}>RADAR</Text>
          </View>
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Icon name="delete" size={20} color={colors.textDanger} />
          </Pressable>
        </View>

        {/* Hero Card */}
        {searchData && (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>CONSULTA ORIGINAL</Text>
            <Text style={styles.heroQuery}>{searchData.query}</Text>

            {keywords.length > 0 && (
              <View style={styles.keywordsRow}>
                {keywords.map((kw, i) => (
                  <View key={i} style={styles.keywordChip}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.heroMeta}>
              <Icon name="schedule" size={14} color={colors.textMuted} />
              <Text style={styles.heroDate}>
                Guardado el {formatDate(searchData.created_at)}
              </Text>
            </View>

            {searchData.is_saved && (
              <Pressable onPress={handleUnsave} style={styles.unsaveBtn}>
                <Icon name="bookmark" size={16} color={colors.primary} />
                <Text style={styles.unsaveBtnText}>Quitar de guardados</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Queries by Platform */}
        {Object.entries(groupedQueries).map(([platform, queries]) => {
          const config = PLATFORM_CONFIG[platform] || {
            label: platform,
            color: colors.textMuted,
            icon: 'search',
          };

          return (
            <View key={platform} style={styles.platformGroup}>
              <View style={styles.platformHeader}>
                <View
                  style={[
                    styles.platformBar,
                    {backgroundColor: config.color},
                  ]}
                />
                <Icon name={config.icon} size={18} color={config.color} />
                <Text style={styles.platformTitle}>{config.label}</Text>
              </View>

              {queries.map(q => (
                <View key={q.id} style={styles.queryItem}>
                  <Text style={styles.queryItemText}>{q.query_text}</Text>
                  {q.description && (
                    <Text style={styles.queryItemDesc}>{q.description}</Text>
                  )}
                  <View style={styles.queryItemActions}>
                    <Pressable
                      onPress={() => handleCopy(q.query_text)}
                      style={({pressed}) => [
                        styles.actionBtn,
                        pressed && styles.actionBtnPressed,
                      ]}>
                      <Icon
                        name="content-copy"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.actionBtnText}>Copiar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenUrl(q.launch_url)}
                      style={({pressed}) => [
                        styles.openBtn,
                        {borderColor: config.color},
                        pressed && {opacity: 0.8},
                      ]}>
                      <Icon name="open-in-new" size={14} color={config.color} />
                      <Text style={[styles.openBtnText, {color: config.color}]}>
                        Re-ejecutar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>NOTAS DE INVESTIGACIÓN</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Escribí tus notas acá..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={handleNotesChange}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
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
    gap: 12,
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
    gap: 2,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerBadge: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  heroLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 8,
  },
  heroQuery: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  keywordChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  keywordText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  heroDate: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  unsaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  unsaveBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.primary,
  },

  // Platform Group
  platformGroup: {
    marginBottom: 24,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  platformBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  platformTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },

  // Query Item
  queryItem: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  queryItemText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  queryItemDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  queryItemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardDark,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  openBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
  },

  // Notes
  notesSection: {
    marginTop: 8,
  },
  notesLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    minHeight: 120,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
