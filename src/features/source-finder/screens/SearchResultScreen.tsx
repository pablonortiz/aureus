import React, {useEffect, useMemo, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {colors, fontFamily, borderRadius} from '../../../core/theme';
import {Icon} from '../../../core/components';
import type {RootStackParamList} from '../../../app/navigation/types';
import type {SourceResult} from '../../../core/types';
import {useSourceFinderStore} from '../store/useSourceFinderStore';

function getSimilarityColor(similarity: number): string {
  if (similarity >= 90) {
    return '#22c55e';
  }
  if (similarity >= 70) {
    return '#e8ba30';
  }
  return '#ef4444';
}

function getSimilarityIcon(similarity: number): string {
  if (similarity >= 90) {
    return 'check-circle';
  }
  if (similarity >= 70) {
    return 'warning';
  }
  return 'help';
}

function ResultItem({result}: {result: SourceResult}) {
  const simColor = getSimilarityColor(result.similarity);

  return (
    <View style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <Icon
          name={getSimilarityIcon(result.similarity)}
          size={18}
          color={simColor}
        />
        <Text style={[styles.similarity, {color: simColor}]}>
          {result.similarity.toFixed(1)}%
        </Text>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {result.source_title || result.source_name || 'Sin título'}
        </Text>
      </View>

      {result.index_name ? (
        <Text style={styles.resultIndex} numberOfLines={1}>
          {result.index_name}
        </Text>
      ) : null}

      {result.creators ? (
        <Text style={styles.resultCreator} numberOfLines={1}>
          Artista: {result.creators}
        </Text>
      ) : null}

      {result.source_url ? (
        <Pressable
          onPress={() => Linking.openURL(result.source_url!)}
          style={({pressed}) => [
            styles.openBtn,
            pressed && styles.openBtnPressed,
          ]}>
          <Text style={styles.openBtnText}>Abrir</Text>
          <Icon name="open-in-new" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SearchResultScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SearchResult'>>();
  const {searchId} = route.params;

  const {currentResults, loadResults, searches, loadSearches} =
    useSourceFinderStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (searches.length === 0) {
        await loadSearches();
      }
      await loadResults(searchId);
      setLoading(false);
    };
    init();
  }, [searchId, loadResults, loadSearches, searches.length]);

  const search = useMemo(
    () => searches.find(s => s.id === searchId),
    [searches, searchId],
  );

  // Group results by image_url
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SourceResult[]>();
    for (const r of currentResults) {
      const existing = groups.get(r.image_url) || [];
      existing.push(r);
      groups.set(r.image_url, existing);
    }
    return Array.from(groups.entries());
  }, [currentResults]);

  // Collect all unique image URLs from the search (even those without results)
  const allImageUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const r of currentResults) {
      urls.add(r.image_url);
    }
    return Array.from(urls);
  }, [currentResults]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, {paddingTop: insets.top}]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Resultado</Text>
        <View style={{width: 36}} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: 40 + insets.bottom},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Tweet Info */}
        {search && (
          <View style={styles.tweetInfo}>
            <Text style={styles.tweetAuthor}>
              @{search.tweet_author || 'usuario'}
            </Text>
            {search.tweet_text ? (
              <Text style={styles.tweetText} numberOfLines={4}>
                {search.tweet_text}
              </Text>
            ) : null}
          </View>
        )}

        {/* Results by Image */}
        {allImageUrls.length === 0 && groupedResults.length === 0 && (
          <View style={styles.noResults}>
            <Icon name="image-not-supported" size={40} color={colors.textMuted} />
            <Text style={styles.noResultsText}>
              No se encontraron resultados
            </Text>
          </View>
        )}

        {(groupedResults.length > 0 ? groupedResults : allImageUrls.map(url => [url, []] as [string, SourceResult[]])).map(
          ([imageUrl, results], index) => (
            <View key={imageUrl} style={styles.imageSection}>
              <Text style={styles.imageSectionLabel}>
                IMAGEN {index + 1}
              </Text>

              <Image
                source={{uri: imageUrl}}
                style={styles.tweetImage}
                resizeMode="contain"
              />

              {results.length > 0 ? (
                <View style={styles.resultsList}>
                  {results.map(r => (
                    <ResultItem key={r.id} result={r} />
                  ))}
                </View>
              ) : (
                <View style={styles.noMatchCard}>
                  <Icon
                    name="search-off"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text style={styles.noMatchText}>Sin resultados</Text>
                </View>
              )}
            </View>
          ),
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Tweet info
  tweetInfo: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 20,
    gap: 6,
  },
  tweetAuthor: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.primary,
  },
  tweetText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Image sections
  imageSection: {
    marginBottom: 24,
  },
  imageSectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(232, 186, 48, 0.6)',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  tweetImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceDark,
    marginBottom: 12,
  },

  // Results
  resultsList: {
    gap: 8,
  },
  resultItem: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 6,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  similarity: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  resultTitle: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  resultIndex: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    paddingLeft: 26,
  },
  resultCreator: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    paddingLeft: 26,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginLeft: 26,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  openBtnPressed: {
    opacity: 0.7,
  },
  openBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
  },

  // No results
  noResults: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  noResultsText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  noMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  noMatchText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
});
