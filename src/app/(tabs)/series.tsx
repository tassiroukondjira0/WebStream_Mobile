import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deduplicateMediaItems } from '@/services/media.utils';
import { getCatalogCached, clearCacheForType } from '@/services/media.cache';
import { MediaItem } from '@/types/media';
import { MediaRow } from '@/components/MediaRow';
import { colors } from '@/theme/theme';

const ITEMS_PER_CATEGORY = 12;

const SERIES_CATEGORIES = [
  { key: 'trending', label: '🔥 Tendances' },
  { key: 'new', label: '🆕 Nouveautés' },
  { key: 'drama', label: '🎭 Drame' },
  { key: 'comedy', label: '😂 Comédie' },
  { key: 'scifi', label: '🚀 Science-Fiction' },
  { key: 'thriller', label: '🔪 Thriller' },
  { key: 'fantasy', label: '🧙 Fantasy' },
  { key: 'crime', label: '🔍 Crime' },
  { key: 'romance', label: '❤️ Romance' },
  { key: 'documentary', label: '📽️ Documentaire' },
  { key: 'family', label: '👨‍👩‍👧‍👦 Famille' },
  { key: 'classic', label: '🏆 Classiques' },
];

export default function SeriesScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Record<string, MediaItem[]>>({});
  const initialLoaded = useRef(false);

  const loadSeries = useCallback(async () => {
    const results: MediaItem[] = [];
    for (let page = 1; page <= 3; page++) {
      const res = await getCatalogCached('SERIES', page, 20);
      results.push(...res.items);
      if (page >= res.pagination?.totalPages) break;
    }
    return deduplicateMediaItems(results);
  }, []);

  const distributeItems = useCallback((items: MediaItem[]) => {
    const cats: Record<string, MediaItem[]> = {};
    const categoryKeys = SERIES_CATEGORIES.map(c => c.key);

    categoryKeys.forEach(key => {
      const startIdx = categoryKeys.indexOf(key) * ITEMS_PER_CATEGORY;
      cats[key] = items.slice(startIdx, startIdx + ITEMS_PER_CATEGORY);
    });

    setCategories(cats);
  }, []);

  const fetchInitial = useCallback(async () => {
    try {
      const items = await loadSeries();
      distributeItems(items);
    } catch (err) {
      console.error('Erreur chargement séries :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadSeries, distributeItems]);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    fetchInitial();
  }, [fetchInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    initialLoaded.current = false;
    await clearCacheForType('SERIES');
    await fetchInitial();
  }, [fetchInitial]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des séries...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.pageTitle}>Catalogue des Séries</Text>
      <Text style={styles.pageSubtitle}>Découvrez les meilleures séries en streaming.</Text>

      {SERIES_CATEGORIES.map((cat) => (
        <MediaRow
          key={cat.key}
          title={cat.label}
          items={categories[cat.key] || []}
        />
      ))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
