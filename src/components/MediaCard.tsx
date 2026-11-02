import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Heart, Clock } from 'lucide-react-native';
import { MediaItem } from '@/types/media';
import { Api, toMediaSlug } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/theme';

interface MediaCardProps {
  media: MediaItem;
  width?: number;
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
          {media.releaseYear ? (
            <View style={styles.yearBadge}>
              <Text style={styles.yearText}>{media.releaseYear}</Text>
            </View>
          ) : null}
          {/* Action buttons overlay */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFavorite}
              activeOpacity={0.7}>
              <Heart
                color={isFavorite ? colors.primary : 'rgba(255,255,255,0.85)'}
                size={14}
                fill={isFavorite ? colors.primary : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleWish}
              activeOpacity={0.7}>
              <Clock
                color={isWish ? colors.primary : 'rgba(255,255,255,0.85)'}
                size={14}
                fill={isWish ? colors.primary : 'none'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={2}>
        {media.title}
      </Text>
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
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  yearBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  yearText: {
    color: '#e4e4e7',
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
});
