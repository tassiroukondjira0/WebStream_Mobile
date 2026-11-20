import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, Clock } from 'lucide-react-native';
import { MediaItem } from '@/types/media';
import { Api, toMediaSlug } from '@/services/api';
import { cleanTitle } from '@/services/media.utils';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/theme';

interface MediaCardProps {
  media: MediaItem;
  width?: number;
}

/** Couleur du badge selon le type de contenu. */
function getBadgeStyle(type: string) {
  switch (type) {
    case 'SERIES':
      return { bg: 'rgba(14, 165, 233, 0.15)', text: '#7dd3fc' };
    case 'ANIME':
      return { bg: 'rgba(217, 70, 239, 0.15)', text: '#e879f9' };
    default:
      return { bg: 'rgba(124, 58, 237, 0.15)', text: '#c4b5fd' };
  }
}

export function MediaCard({ media, width = 130 }: MediaCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWish, setIsWish] = useState(false);

  const handlePress = () => {
    router.push({
      pathname: '/media/[id]',
      params: {
        id: media.id,
        mediaData: JSON.stringify(media),
      },
    });
  };

  const handleFavorite = async (e: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter aux favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/profile') },
      ]);
      return;
    }
    try {
      const result = await Api.toggleBookmark(toMediaSlug(media));
      setIsFavorite(result.isBookmarked ?? !isFavorite);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', 'Impossible de mettre à jour les favoris : ' + message);
    }
  };

  const handleWish = async (e: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter à la liste de souhaits.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/profile') },
      ]);
      return;
    }
    try {
      const result = await Api.toggleWishlist(toMediaSlug(media));
      setIsWish(result.inWishlist ?? !isWish);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', 'Impossible de mettre à jour les souhaits : ' + message);
    }
  };

  const posterUri = media.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';
  const badgeStyle = getBadgeStyle(media.type);
  const displayTitle = cleanTitle(media.title);

  return (
    <View style={[styles.container, { width }]}>
      <TouchableOpacity
        style={styles.posterTouch}
        onPress={handlePress}
        activeOpacity={0.8}>
        <View style={[styles.posterWrapper, { height: width * 1.5 }]}>
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            contentFit="cover"
            transition={300}
          />

          {/* Badge type — style du site web */}
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{media.type === 'ANIME' ? 'Anime' : media.type === 'SERIES' ? 'Série' : 'Film'}</Text>
          </View>

          {/* Overlay gradient en bas — style du site web */}
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle} numberOfLines={2}>{displayTitle}</Text>
            {media.releaseYear && (
              <Text style={styles.overlayYear}>({media.releaseYear})</Text>
            )}
          </View>

          {/* Action buttons overlay */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFavorite}
              activeOpacity={0.7}>
              <Heart
                color={isFavorite ? colors.primary : 'rgba(255,255,255,0.85)'}
                size={12}
                fill={isFavorite ? colors.primary : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleWish}
              activeOpacity={0.7}>
              <Clock
                color={isWish ? colors.primary : 'rgba(255,255,255,0.85)'}
                size={12}
                fill={isWish ? colors.primary : 'none'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  posterTouch: {
    flex: 1,
  },
  posterWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlayTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  overlayYear: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
