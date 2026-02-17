import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
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

export function RadarResultsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RadarResults'>>();
  const {searchId} = route.params;

  const {searches, currentQueries, loadQueries, saveSearch} = useRadarStore();

  const [searchData, setSearchData] = useState<RadarSearch | null>(null);
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    loadQueries(searchId);
  }, [searchId, loadQueries]);

  useEffect(() => {
    const found = searches.find(s => s.id === searchId);
    if (found) {
      setSearchData(found);
    }
  }, [searches, searchId]);

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

  const handleSave = useCallback(async () => {
    await saveSearch(searchId);
    Alert.alert('Guardado', 'Búsqueda guardada correctamente');
  }, [saveSearch, searchId]);

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
          {paddingTop: insets.top + 16, paddingBottom: 100 + insets.bottom},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Resultados</Text>
          <View style={{width: 40}} />
        </View>

        {/* Original Query Card */}
        {searchData && (
          <View style={styles.queryCard}>
            <Text style={styles.queryCardLabel}>CONSULTA ORIGINAL</Text>
            <Text style={styles.queryCardText}>{searchData.query}</Text>
            {keywords.length > 0 && (
              <View style={styles.keywordsRow}>
                {keywords.map((kw, i) => (
                  <View key={i} style={styles.keywordChip}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Pro Tip Banner */}
        {searchData?.tip && tipVisible && (
          <View style={styles.tipBanner}>
            <View style={styles.tipContent}>
              <Icon name="lightbulb" size={20} color={colors.backgroundDark} />
              <Text style={styles.tipText}>{searchData.tip}</Text>
            </View>
            <Pressable
              onPress={() => setTipVisible(false)}
              style={styles.tipClose}>
              <Icon name="close" size={16} color={colors.backgroundDark} />
            </Pressable>
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
                <Text style={styles.platformCount}>
                  {queries.length} {queries.length === 1 ? 'query' : 'queries'}
                </Text>
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
                        Abrir
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Save Button */}
      {searchData && !searchData.is_saved && (
        <View style={[styles.saveContainer, {paddingBottom: 16 + insets.bottom}]}>
          <Pressable
            onPress={handleSave}
            style={({pressed}) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
            ]}>
            <Icon name="bookmark-border" size={20} color={colors.backgroundDark} />
            <Text style={styles.saveBtnText}>Guardar Búsqueda</Text>
          </Pressable>
        </View>
      )}
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
    justifyContent: 'space-between',
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
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },

  // Query Card
  queryCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  queryCardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: 8,
  },
  queryCardText: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
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

  // Tip Banner
  tipBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  tipContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.backgroundDark,
    lineHeight: 18,
  },
  tipClose: {
    marginLeft: 8,
    padding: 2,
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
  platformCount: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
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

  // Save Button
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
  },
  saveBtnPressed: {
    opacity: 0.8,
  },
  saveBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.backgroundDark,
  },
});
