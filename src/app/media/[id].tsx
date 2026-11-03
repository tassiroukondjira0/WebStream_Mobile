import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Bookmark, Check, Play } from 'lucide-react-native';
import { MediaItem } from '@/types/media';
import { Api, toMediaSlug } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

function getMediaWebPath(media: MediaItem): string {
  const provider = (media.provider || 'FSTREAMTV').toUpperCase();
  const id = media.externalId || media.id;
  const isSeries = media.type === 'SERIES';
  const isAnime = media.type === 'ANIME';

  if (isAnime) {
    const p = provider === 'FRENCHSTREAM' ? 'partner' : provider.toLowerCase();
    return `/animes/${p}/${id}`;
  }
  if (provider === 'TMDB') {
    return isSeries ? `/series/tmdb/${id}` : `/films/tmdb/${id}`;
  }
  if (provider === 'PARTNER' || provider === 'FRENCHSTREAM') {
    return isSeries ? `/series/partner/${id}` : `/films/partner/${id}`;
  }
  if (provider === 'FSTREAMTV') {
    return isSeries ? `/series/fstreamtv/${id}` : `/films/fstreamtv/${id}`;
  }
  // Fallback : essayer de deviner le provider depuis le slug
  if (media.slug) {
    const slugParts = media.slug.split('-');
    if (slugParts.length >= 3) {
      const segment = slugParts[0].toLowerCase();
      const kind = slugParts[1].toLowerCase();
      const externalId = slugParts.slice(2).join('-');
      const isSeriesFromSlug = kind === 'series';
      const isAnimeFromSlug = kind === 'anime';
      if (isAnimeFromSlug) {
        return `/animes/${segment}/${externalId}`;
      }
      return isSeriesFromSlug ? `/series/${segment}/${externalId}` : `/films/${segment}/${externalId}`;
    }
  }
  return isSeries ? `/series/fstreamtv/${id}` : `/films/fstreamtv/${id}`;
}

export default function MediaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mediaData?: string }>();

  let media: MediaItem | null = null;
  if (params.mediaData) {
    try {
      media = JSON.parse(params.mediaData);
    } catch {
      media = null;
    }
  }

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const bookmarkSlug = media ? toMediaSlug(media) : '';

  useEffect(() => {
    if (!isAuthenticated || !bookmarkSlug) return;

    let cancelled = false;
    (async () => {
      try {
        const { bookmarks } = await Api.getBookmarks();
        if (!cancelled) {
          setIsBookmarked(bookmarks.some((item) => item.slug === bookmarkSlug));
        }
      } catch {
        // Silencieux : on conserve l'état « non favori » par défaut.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, bookmarkSlug]);

  if (!media) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Média introuvable.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handlePlay = () => {
    if (!media) return;
    const webPath = getMediaWebPath(media);

    // Extraire l'ID externe depuis le slug si externalId est manquant
    let tmdbId = media.externalId || media.id;
    let provider = media.provider || 'FSTREAMTV';
    if (media.slug) {
      const slugMatch = media.slug.match(/^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/i);
      if (slugMatch) {
        const [, segment, , externalId] = slugMatch;
        tmdbId = externalId;
        const segmentToProvider: Record<string, string> = {
          partner: 'FRENCHSTREAM',
          frenchmanga: 'FRENCHMANGA',
          tmdb: 'TMDB',
          fstreamtv: 'FSTREAMTV',
        };
        provider = segmentToProvider[segment.toLowerCase()] ?? provider;
      }
    }

    router.push({
      pathname: '/player',
      params: {
        id: media.id,
        title: media.title,
        tmdbId,
        externalId: media.externalId || tmdbId,
        type: media.type === 'SERIES' ? 'series' : media.type === 'ANIME' ? 'anime' : 'movie',
        provider,
        webPath,
      },
    });
  };

  const handleToggleBookmark = async () => {
    if (!media) return;

    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter ce titre à vos favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/profile') },
      ]);
      return;
    }

    if (bookmarkLoading) return;

    try {
      setBookmarkLoading(true);
      const result = await Api.toggleBookmark(bookmarkSlug);
      setIsBookmarked(result.isBookmarked ?? !isBookmarked);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', 'Impossible de mettre à jour les favoris : ' + message);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const posterUri =
    media.posterUrl ||
    media.backdropUrl ||
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800';

  return (
    <View style={styles.container}>
      {/* Background Backdrop Image */}
      <View style={styles.backdropContainer}>
        <Image source={{ uri: posterUri }} style={styles.backdrop} contentFit="cover" />
        <View style={styles.gradientOverlay} />
      </View>

      {/* Top Floating Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}>
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleToggleBookmark}
          disabled={bookmarkLoading}
          activeOpacity={0.8}>
          {isBookmarked ? (
            <Check color="#22c55e" size={20} />
          ) : (
            <Bookmark color="#ffffff" size={20} />
          )}
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.spacer} />

        <View style={styles.detailsBody}>
          {/* Badge & Title */}
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {media.type === 'SERIES' ? 'SÉRIE' : media.type === 'ANIME' ? 'ANIMÉ' : 'FILM'}
              </Text>
            </View>
            {media.releaseYear ? (
              <Text style={styles.yearText}>{media.releaseYear}</Text>
            ) : null}
            {media.totalEpisodes ? (
              <Text style={styles.episodesText}>{media.totalEpisodes} épisodes</Text>
            ) : null}
          </View>

          <Text style={styles.title}>{media.title}</Text>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.85}>
            <Play fill="#ffffff" color="#ffffff" size={20} />
            <Text style={styles.playButtonText}>Regarder maintenant</Text>
          </TouchableOpacity>

          {/* Synopsis */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Synopsis</Text>
            <Text style={styles.synopsisText}>
              {media.synopsis ||
                "Plongez dans l'univers de ce titre disponible en streaming haute définition sur CinéMax. Cliquez sur Regarder pour lancer le lecteur vidéo sans interruption."}
            </Text>
          </View>

          {/* Extra Details */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Informations</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Disponibilité :</Text>
              <Text style={styles.infoValue}>Lecteur Multi-sources (VF / VOSTFR)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Langues :</Text>
              <Text style={styles.infoValue}>{media.language || 'VF / VOSTFR'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: 380,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  spacer: {
    height: 240,
  },
  detailsBody: {
    backgroundColor: '#09090b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    minHeight: 500,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  yearText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
  episodesText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginBottom: 24,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  synopsisText: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  infoLabel: {
    color: '#71717a',
    fontSize: 14,
  },
  infoValue: {
    color: '#f4f4f5',
    fontSize: 14,
    fontWeight: '500',
  },
});
