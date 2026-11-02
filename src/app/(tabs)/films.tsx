import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Api } from '@/services/api';
import { MediaItem } from '@/types/media';
import { MediaCard } from '@/components/MediaCard';

const NUM_COLUMNS = 2;
const ITEM_SPACING = 12;
const HORIZONTAL_PADDING = 16;
const FOOTER_HEIGHT = 100;

export default function FilmsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialLoaded = useRef(false);

  const LIMIT = 20;

  const loadFilms = useCallback(async (pageNum: number, append = false) => {
    const res = await Api.getCatalog('MOVIE', pageNum, LIMIT);
    return res;
  }, []);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await loadFilms(1);
      setItems(res.items);
      setHasMore((res.pagination?.totalPages ?? 1) > 1);
    } catch (err) {
      console.error('Erreur chargement films :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFilms]);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    fetchInitial();
  }, [fetchInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchInitial();
  }, [fetchInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await loadFilms(nextPage);
      setPage(nextPage);
      setItems((prev) => [...prev, ...res.items]);
      setHasMore((res.pagination?.totalPages ?? 1) > nextPage);
    } catch (err) {
      console.error('Erreur chargement plus de films :', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, loadFilms]);

  const renderItem = ({ item }: { item: MediaItem }) => (
    <View style={{ width: columnWidth }}>
      <MediaCard media={item} width={columnWidth} />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#e50914" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucun film disponible pour le moment.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Chargement des films...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id || item.externalId || Math.random().toString()}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={[styles.listContent, { paddingTop: HORIZONTAL_PADDING + insets.top }]}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
    />
  );
}

const { width } = Dimensions.get('window');
const columnWidth = (width - HORIZONTAL_PADDING * 2 - ITEM_SPACING) / NUM_COLUMNS;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 16,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: FOOTER_HEIGHT,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  footer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 16,
  },
});
