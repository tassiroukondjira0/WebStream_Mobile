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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, Play, Search } from 'lucide-react-native';
import { cleanTitle, deduplicateMediaItems } from '@/services/media.utils';
import { getCatalogCached, clearAllCatalogCache } from '@/services/media.cache';
import { MediaItem } from '@/types/media';
import { MediaRow } from '@/components/MediaRow';
import { useNotifications } from '@/context/NotificationContext';
import { colors } from '@/theme/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState<MediaItem | null>(null);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [animes, setAnimes] = useState<MediaItem[]>([]);

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

      if (data.movieList.length > 0) {
        setFeatured(data.movieList[0]);
      } else if (data.seriesList.length > 0) {
        setFeatured(data.seriesList[0]);
      }
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

  const handlePlayFeatured = () => {
    if (!featured) return;
    router.push({
      pathname: '/media/[id]',
      params: {
        id: featured.id,
        mediaData: JSON.stringify(featured),
      },
    });
  };

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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>CinéMax</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleNotifications} activeOpacity={0.7} style={styles.headerBtn}>
            <Bell color={colors.textPrimary} size={24} />
            {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSearch} activeOpacity={0.7} style={styles.headerBtn}>
            <Search color={colors.textPrimary} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured */}
      {featured && (
        <View style={styles.featuredContainer}>
          <Image
            source={{ uri: featured.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500' }}
            style={styles.featuredPoster}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {cleanTitle(featured.title)}
            </Text>
            {featured.releaseYear && (
              <Text style={styles.featuredYear}>{featured.releaseYear}</Text>
            )}
            {featured.synopsis && (
              <Text style={styles.featuredOverview} numberOfLines={3}>
                {featured.synopsis}
              </Text>
            )}
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayFeatured}
              activeOpacity={0.8}
            >
              <Play color="#ffffff" size={20} />
              <Text style={styles.playButtonText}>Regarder</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Movie rows */}
      <MediaRow title="Films" items={movies} />
      <MediaRow title="Séries" items={series} />
      <MediaRow title="Animes" items={animes} />

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
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
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
  featuredContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 220,
  },
  featuredPoster: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featuredYear: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  featuredOverview: {
    color: colors.foreground,
    fontSize: 13,
    marginBottom: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});
