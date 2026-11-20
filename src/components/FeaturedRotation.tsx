import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { MediaItem } from '@/types/media';
import { Api } from '@/services/api';
import { colors } from '@/theme/theme';

const FEATURED_COUNT = 9;

/**
 * Section "À la une" — charge les titres tendance depuis l'API
 * (popularité + dernières sorties) et les fait défiler toutes les 5 secondes.
 */
export function FeaturedRotation() {
  const router = useRouter();
  const [featuredList, setFeaturedList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Charge les titres tendance depuis l'API
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await Api.getTrending(FEATURED_COUNT + 10);
        if (!cancelled) {
          setFeaturedList(items.filter((item) => item.posterUrl).slice(0, FEATURED_COUNT));
        }
      } catch (err) {
        console.error('Erreur chargement titres tendance:', err);
        if (!cancelled) setFeaturedList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Rotation toutes les 5 secondes
  useEffect(() => {
    if (featuredList.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredList.length]);

  if (loading || featuredList.length === 0) {
    return loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des titres tendance…</Text>
      </View>
    ) : null;
  }

  const current = featuredList[currentIndex];
  const displayTitle = current.title
    .replace(/\(TV\)/gi, '')
    .replace(/\(Film\)/gi, '')
    .replace(/\(Mini\)/gi, '')
    .replace(/\(Web\)/gi, '')
    .replace(/\(O\)/gi, '')
    .replace(/\(Short\)/gi, '')
    .trim();

  const handlePress = () => {
    router.push({
      pathname: '/media/[id]',
      params: { id: String(current.id), mediaData: JSON.stringify(current) },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Star color={colors.primary} size={14} fill={colors.primary} />
          </View>
          <Text style={styles.title}>À la une</Text>
        </View>
        <Text style={styles.counter}>
          {currentIndex + 1} / {featuredList.length}
        </Text>
      </View>

      {/* Carte featured */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.card}>
        {/* Poster en arrière-plan */}
        {current.posterUrl ? (
          <Image
            source={{ uri: current.posterUrl }}
            style={styles.backdrop}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.backdropOverlay} />

        {/* Contenu */}
        <View style={styles.content}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {current.type === 'ANIME' ? 'Anime' : current.type === 'SERIES' ? 'Série' : 'Film'}
            </Text>
          </View>

          <Text style={styles.mediaTitle} numberOfLines={2}>
            {displayTitle}
          </Text>

          {current.releaseYear && (
            <Text style={styles.mediaYear}>{current.releaseYear}</Text>
          )}

          {current.synopsis && (
            <Text style={styles.mediaSynopsis} numberOfLines={2}>
              {current.synopsis}
            </Text>
          )}
        </View>

        {/* Indicateurs de progression */}
        <View style={styles.dotsRow}>
          {featuredList.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === currentIndex && styles.dotActive]}
            />
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  counter: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    marginBottom: 8,
  },
  typeBadgeText: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  mediaYear: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  mediaSynopsis: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    flexDirection: 'row',
    gap: 5,
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
});