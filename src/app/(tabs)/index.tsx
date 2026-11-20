import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { deduplicateMediaItems } from '@/services/media.utils';
import { getCatalogCached, clearAllCatalogCache } from '@/services/media.cache';
import { MediaItem } from '@/types/media';
import { MediaRow } from '@/components/MediaRow';
import { FeaturedRotation } from '@/components/FeaturedRotation';
import { GenreChips } from '@/components/GenreChips';
import { PlatformSections } from '@/components/PlatformSection';
import { useNotifications } from '@/context/NotificationContext';
import { colors } from '@/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [animes, setAnimes] = useState<MediaItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [moviesRes, seriesRes, animesRes] = await Promise.allSettled([
      getCatalogCached('MOVIE', 1, 15),
      getCatalogCached('SERIES', 1, 15),
      getCatalogCached('ANIME', 1, 15),
    ]);

    return {
      movieList: moviesRes.status === 'fulfilled' ? deduplicateMediaItems(moviesRes.value.items) : [],
      seriesList: seriesRes.status === 'fulfilled' ? deduplicateMediaItems(seriesRes.value.items) : [],
      animeList: animesRes.status === 'fulfilled' ? deduplicateMediaItems(animesRes.value.items) : [],
    };
  }, []);

  const applyData = useCallback(
    (data: {
      movieList: MediaItem[];
      seriesList: MediaItem[];
      animeList: MediaItem[];
    }) => {
      setMovies(data.movieList);
      setSeries(data.seriesList);
      setAnimes(data.animeList);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await loadData();
        if (cancelled) return;
        applyData(data);
      } catch (err) {
        console.error('Erreur chargement catalogue :', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadData, applyData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await clearAllCatalogCache();
      applyData(await loadData());
    } catch (err) {
      console.error('Erreur rafraîchissement catalogue :', err);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, applyData]);

  const handleSearch = () => {
    router.push('/explore');
  };

  const handleNotifications = () => {
    router.push('/notifications' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du catalogue...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header compact */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.headerTitle}>CinéMax</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleNotifications} activeOpacity={0.7} style={styles.headerBtn}>
            <Bell color={colors.textPrimary} size={22} />
            {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSearch} activeOpacity={0.7} style={styles.headerBtn}>
            <Search color={colors.textPrimary} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section À la une — titres tendance + dernières sorties */}
      <FeaturedRotation />

      {/* Genre chips — filtres par genre avec icônes */}
      <GenreChips selectedGenre={selectedGenre} onSelect={setSelectedGenre} />

      {/* Movie rows */}
      <MediaRow title="Films" items={movies} />
      <MediaRow title="Séries" items={series} />
      <MediaRow title="Animes" items={animes} />

      {/* Sections par plateforme de streaming */}
      <PlatformSections />

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: 10,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});