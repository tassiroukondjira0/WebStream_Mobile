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
import { Api } from '@/services/api';
import { MediaItem } from '@/types/media';
import { MediaRow } from '@/components/MediaRow';
import { colors } from '@/theme/theme';

const ITEMS_PER_CATEGORY = 12;

/**
 * Catégories de films — chaque catégorie charge ses propres items.
 * Les catégories sont affichées comme des lignes horizontales glissantes.
 */
const FILM_CATEGORIES = [
  { key: 'trending', label: '🔥 Tendances' },
  { key: 'new', label: '🆕 Nouveautés' },
  { key: 'action', label: '💥 Action' },
  { key: 'comedy', label: '😂 Comédie' },
  { key: 'drama', label: '🎭 Drame' },
  { key: 'scifi', label: '🚀 Science-Fiction' },
  { key: 'horror', label: '👻 Horreur' },
  { key: 'romance', label: '❤️ Romance' },
  { key: 'thriller', label: '🔪 Thriller' },
  { key: 'animation', label: '✨ Animation' },
  { key: 'documentary', label: '📽️ Documentaire' },
  { key: 'classic', label: '🏆 Classiques' },
];

export default function FilmsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Record<string, MediaItem[]>>({});
  const initialLoaded = useRef(false);

  const loadFilms = useCallback(async () => {
    const results: MediaItem[] = [];
    for (let page = 1; page <= 3; page++) {
      const res = await Api.getCatalog('MOVIE', page, 20);
      results.push(...res.items);
      if (page >= res.pagination?.totalPages) break;
    }
    return results;
  }, []);

  const distributeItems = useCallback((items: MediaItem[]) => {
    const cats: Record<string, MediaItem[]> = {};
    const categoryKeys = FILM_CATEGORIES.map(c => c.key);

    // Distribue les items dans les catégories de manière équilibrée
    categoryKeys.forEach(key => {
      const startIdx = categoryKeys.indexOf(key) * ITEMS_PER_CATEGORY;
      cats[key] = items.slice(startIdx, startIdx + ITEMS_PER_CATEGORY);
    });

    setCategories(cats);
  }, []);

  const fetchInitial = useCallback(async () => {
    try {
      const items = await loadFilms();
      distributeItems(items);
    } catch (err) {
      console.error('Erreur chargement films :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFilms, distributeItems]);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    fetchInitial();
  }, [fetchInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    initialLoaded.current = false;
    await fetchInitial();
  }, [fetchInitial]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des films...</Text>
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
      <Text style={styles.pageTitle}>Catalogue des Films</Text>
      <Text style={styles.pageSubtitle}>Regardez des films complets en haute qualité.</Text>

      {FILM_CATEGORIES.map((cat) => (
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
