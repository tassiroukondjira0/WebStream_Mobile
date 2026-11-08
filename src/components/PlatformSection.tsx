import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Play, MonitorPlay, Sparkles, Apple, Mountain } from 'lucide-react-native';
import { deduplicateMediaItems } from '@/services/media.utils';
import { getBaseApiUrl, getAuthToken } from '@/services/api';
import { MediaItem } from '@/types/media';
import { MediaRow } from '@/components/MediaRow';
import { colors } from '@/theme/theme';

/** Définition d'une plateforme de streaming. */
interface PlatformDef {
  slug: string;
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  /** Couleur de fond du badge. */
  badgeBg: string;
  /** Couleur du texte/icône du badge. */
  badgeColor: string;
}

const PLATFORMS: PlatformDef[] = [
  {
    slug: 'netflix',
    label: 'Netflix',
    icon: Play,
    badgeBg: '#ef44441a',
    badgeColor: '#f87171',
  },
  {
    slug: 'paramount',
    label: 'Paramount+',
    icon: Mountain,
    badgeBg: '#3b82f61a',
    badgeColor: '#93c5fd',
  },
  {
    slug: 'prime-video',
    label: 'Prime Video',
    icon: MonitorPlay,
    badgeBg: '#3b82f61a',
    badgeColor: '#60a5fa',
  },
  {
    slug: 'disney',
    label: 'Disney+',
    icon: Sparkles,
    badgeBg: '#6366f11a',
    badgeColor: '#a5b4fc',
  },
  {
    slug: 'apple-tv',
    label: 'Apple TV+',
    icon: Apple,
    badgeBg: '#a1a1aa1a',
    badgeColor: '#d4d4d8',
  },
];

/** Nombre de titres par plateforme. */
const PLATFORM_LIMIT = 15;

/**
 * Récupère le catalogue filtré par plateforme via l'API.
 * L'API `/api/catalog` supporte le paramètre `platform`.
 */
async function fetchCatalogByPlatform(
  type: 'MOVIE' | 'SERIES',
  platform: string,
  limit: number
): Promise<MediaItem[]> {
  const baseUrl = getBaseApiUrl();
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}/api/catalog?type=${type}&page=1&limit=${limit}&platform=${encodeURIComponent(platform)}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.items ?? [];
}

/**
 * Section dédiée à une plateforme de streaming.
 * Affiche les films et séries disponibles sur cette plateforme.
 */
export function PlatformSection({ platform }: { platform: PlatformDef }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [moviesRes, seriesRes] = await Promise.allSettled([
          fetchCatalogByPlatform('MOVIE', platform.slug, PLATFORM_LIMIT),
          fetchCatalogByPlatform('SERIES', platform.slug, PLATFORM_LIMIT),
        ]);

        const movies = moviesRes.status === 'fulfilled' ? moviesRes.value : [];
        const series = seriesRes.status === 'fulfilled' ? seriesRes.value : [];
        const all = deduplicateMediaItems([...movies, ...series]);

        if (!cancelled) {
          setItems(all);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Erreur chargement ${platform.label}:`, err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [platform.slug, platform.label]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={platform.badgeColor} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (items.length === 0) return null;

  const Icon = platform.icon;

  return (
    <View style={styles.container}>
      {/* En-tête de la section */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: platform.badgeBg }]}>
          <Icon color={platform.badgeColor} size={12} />
          <Text style={[styles.badgeText, { color: platform.badgeColor }]}>
            {platform.label}
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Sur {platform.label}</Text>
      </View>

      {/* Liste horizontale */}
      <MediaRow title="" items={items} />
    </View>
  );
}

/**
 * Groupe toutes les sections plateforme (Netflix, Paramount+, Prime Video, Disney+, Apple TV+).
 */
export function PlatformSections() {
  return (
    <View style={styles.wrapper}>
      {PLATFORMS.map((platform) => (
        <PlatformSection key={platform.slug} platform={platform} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  container: {
    marginVertical: 6,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
