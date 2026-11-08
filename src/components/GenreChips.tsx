import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Flame,
  Swords,
  Heart,
  Sparkles,
  Eye,
  Compass,
  Tv,
  Clapperboard,
  X,
  Film,
  BookOpen,
} from 'lucide-react-native';
import { colors } from '@/theme/theme';

export interface GenreChip {
  genre: string | null;
  label: string;
  icon: keyof typeof ICON_MAP;
  type?: 'content' | 'genre';
}

const ICON_MAP = {
  Flame,
  Swords,
  Heart,
  Sparkles,
  Eye,
  Compass,
  Tv,
  Clapperboard,
  X,
  Film,
  BookOpen,
};

export const GENRE_CHIPS: GenreChip[] = [
  { genre: null, label: 'Tous', icon: 'Flame' },
  { genre: 'series', label: 'Séries', icon: 'Tv', type: 'content' },
  { genre: 'anime', label: 'Animés', icon: 'BookOpen', type: 'content' },
  { genre: 'action', label: 'Action', icon: 'Swords', type: 'genre' },
  { genre: 'romance', label: 'Romance', icon: 'Heart', type: 'genre' },
  { genre: 'animation', label: 'Animation', icon: 'Sparkles', type: 'genre' },
  { genre: 'horreur', label: 'Horreur', icon: 'Eye', type: 'genre' },
  { genre: 'fantastique', label: 'Fantastique', icon: 'Compass', type: 'genre' },
  { genre: 'comedie', label: 'Comédie', icon: 'Sparkles', type: 'genre' },
  { genre: 'drame', label: 'Drame', icon: 'Eye', type: 'genre' },
  { genre: 'thriller', label: 'Thriller', icon: 'Swords', type: 'genre' },
  { genre: 'science-fiction', label: 'Sci-Fi', icon: 'Compass', type: 'genre' },
  { genre: 'documentaire', label: 'Documentaire', icon: 'Film', type: 'genre' },
  { genre: 'aventure', label: 'Aventure', icon: 'Clapperboard', type: 'genre' },
];

interface GenreChipsProps {
  selectedGenre?: string | null;
  onSelect: (genre: string | null) => void;
}

/**
 * Genre chips horizontaux pour l'app mobile.
 * Inspiré du GenreChips du site web avec icônes et style pill.
 */
export function GenreChips({ selectedGenre, onSelect }: GenreChipsProps) {
  const selectedChip = GENRE_CHIPS.find((c) => c.genre === selectedGenre);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>À votre rythme</Text>
          <Text style={styles.title}>Que voulez-vous regarder ?</Text>
          {selectedGenre && (
            <Text style={styles.activeFilter}>
              Filtre : <Text style={styles.activeFilterValue}>{selectedChip?.label ?? selectedGenre}</Text>
            </Text>
          )}
        </View>
        {selectedGenre && (
          <TouchableOpacity onPress={() => onSelect(null)} activeOpacity={0.7} style={styles.resetBtn}>
            <X color={colors.textSecondary} size={12} />
            <Text style={styles.resetBtnText}>Réinitialiser</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chips scrollable */}
      <FlatList
        data={GENRE_CHIPS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsList}
        keyExtractor={(item) => item.genre ?? 'all'}
        renderItem={({ item }) => {
          const isActive = selectedGenre === item.genre;
          const IconComponent = ICON_MAP[item.icon];
          return (
            <TouchableOpacity
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(item.genre)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, isActive && styles.iconCircleActive]}>
                {IconComponent && (
                  <IconComponent
                    color={isActive ? colors.primaryForeground : colors.textSecondary}
                    size={12}
                  />
                )}
              </View>
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  kicker: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  activeFilter: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  activeFilterValue: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resetBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  chipsList: {
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderColor: 'rgba(124, 58, 237, 0.5)',
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.textPrimary,
  },
});
