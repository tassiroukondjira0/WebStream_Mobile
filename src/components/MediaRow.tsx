import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MediaItem } from '@/types/media';
import { MediaCard } from './MediaCard';
import { colors } from '@/theme/theme';
import { getStableKey } from '@/services/media.utils';

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  isLoading?: boolean;
}

export function MediaRow({ title, items }: MediaRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => getStableKey(item)}
        renderItem={({ item }) => <MediaCard media={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 16,
  },
});
