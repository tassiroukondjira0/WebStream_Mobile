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
import { Api } from '@/services/api';
import { MediaItem } from '@/types/media';
import { MediaCard } from '@/components/MediaCard';

const NUM_COLUMNS = 2;
const ITEM_SPACING = 12;
const HORIZONTAL_PADDING = 16;
const FOOTER_HEIGHT = 100;

const { width } = Dimensions.get('window');
const columnWidth = (width - HORIZONTAL_PADDING * 2 - ITEM_SPACING) / NUM_COLUMNS;

export default function SeriesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialLoaded = useRef(false);

  const LIMIT = 20;

  const loadSeries = useCallback(async (pageNum: number) => {
    const res = await Api.getCatalog('SERIES', pageNum, LIMIT);
    return res;
  }, []);

  const fetchInitial = useCallback(async () => {
    try {
      const res = await loadSeries(1);
      setItems(res.items);
      setHasMore((res.pagination?.totalPages ?? 1) > 1);
    } catch (err) {
      console.error('Erreur chargement séries :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadSeries]);

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
      const res = await loadSeries(nextPage);
      setPage(nextPage);
      setItems((prev) => [...prev, ...res.items]);
      setHasMore((res.pagination?.totalPages ?? 1) > nextPage);
    } catch (err) {
      console.error('Erreur chargement plus de séries :', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, loadSeries]);

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
      <Text style={styles.emptyText}>Aucune série disponible pour le moment.</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Chargement des séries...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id || item.externalId || Math.random().toString()}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={styles.listContent}
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
    padding: HORIZONTAL_PADDING,
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
