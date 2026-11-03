import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Api } from '@/services/api';
import { filterMisclassifiedAnime } from '@/services/media.utils';
import { MediaItem } from '@/types/media';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoad = useRef(true);

  const loadFavorites = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;
    try {
      const { bookmarks } = await Api.getBookmarks();
      setFavorites(filterMisclassifiedAnime(bookmarks || []));
    } catch (err) {
      console.error('Erreur chargement favoris:', err);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (initialLoad.current && isAuthenticated) {
      initialLoad.current = false;
      loadFavorites();
    }
  }, [loadFavorites, isAuthenticated]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadFavorites();
  };

  const renderItem = ({ item }: { item: MediaItem }) => {
    const posterUri =
      item.posterUrl ||
      item.backdropUrl ||
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() =>
          router.push({
            pathname: '/media/[id]',
            params: {
              id: item.id,
              mediaData: JSON.stringify(item),
            },
          })
        }
        activeOpacity={0.7}>
        <Image
          source={{ uri: posterUri }}
          style={styles.listPoster}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.listMeta}>
            {item.releaseYear ? (
              <Text style={styles.listMetaText}>{item.releaseYear}</Text>
            ) : null}
            {item.releaseYear ? (
              <Text style={styles.listDot}>•</Text>
            ) : null}
            <Text style={styles.listMetaText}>
              {item.type === 'SERIES' ? 'Série' : item.type === 'ANIME' ? 'Animé' : 'Film'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ArrowLeft color="#ffffff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favoris</Text>
        </View>
        <View style={styles.authPrompt}>
          <Heart color="#3f3f46" size={48} />
          <Text style={styles.promptTitle}>Connectez-vous</Text>
          <Text style={styles.promptSub}>
            Connectez-vous pour accéder à vos favoris sauvegardés.
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}>
            <Text style={styles.authBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoris</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart color="#3f3f46" size={48} />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptySub}>
            Appuyez sur le cœur d&apos;un titre pour l&apos;ajouter ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.slug || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#a1a1aa',
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  listPoster: {
    width: 50,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#1f1f23',
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  listMetaText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  listDot: {
    color: '#52525b',
    marginHorizontal: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#52525b',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#3f3f46',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  promptTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  promptSub: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  authBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  authBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
