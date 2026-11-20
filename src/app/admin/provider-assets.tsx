import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, MessageSquare, Search } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminProviderAsset } from '@/types/media';
import { colors } from '@/theme/theme';

export default function AdminProviderAssetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState<AdminProviderAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAssets = useCallback(async (p: number = 1) => {
    try {
      const data = await Api.getProviderAssets(p, 24, undefined, search || undefined);
      setAssets(data.items);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les assets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAssets(1);
  };

  const togglePublished = async (asset: AdminProviderAsset) => {
    try {
      await Api.toggleProviderAssetPublished(asset.id);
      Alert.alert('Succès', `"${asset.title}" ${!asset.isPublished ? 'publié' : 'masqué'}.`);
      loadAssets(page);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour.');
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'TMDB': return '#3b82f6';
      case 'FRENCHSTREAM': return '#a855f7';
      case 'FSTREAMTV': return '#06b6d4';
      case 'FRENCHMANGA': return '#10b981';
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <MessageSquare color="#06b6d4" size={18} />
            <Text style={styles.headerTitle}>Assets partenaires</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.searchWrap}>
          <Search color={colors.textTertiary} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadAssets(1)}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : assets.length === 0 ? (
          <Text style={styles.emptyText}>Aucun asset trouvé.</Text>
        ) : (
          <View style={styles.list}>
            {assets.map((a) => (
              <View key={a.id} style={styles.assetCard}>
                <View style={styles.assetInfo}>
                  <View style={styles.assetTitleRow}>
                    <Text style={styles.assetTitle} numberOfLines={1}>{a.title}</Text>
                    <View style={[styles.providerBadge, { backgroundColor: getProviderColor(a.provider) + '20' }]}>
                      <Text style={[styles.providerText, { color: getProviderColor(a.provider) }]}>
                        {a.provider}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.assetMeta}>
                    {a.contentType} · {a.releaseYear || '—'}
                    {a.isPublished ? ' · ✅ Publié' : ' · ❌ Masqué'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: a.isPublished ? '#f59e0b20' : '#10b98120' }]}
                  onPress={() => togglePublished(a)}
                  activeOpacity={0.7}
                >
                  {a.isPublished ? (
                    <EyeOff color="#f59e0b" size={16} />
                  ) : (
                    <Eye color="#10b981" size={16} />
                  )}
                  <Text style={[styles.toggleText, { color: a.isPublished ? '#f59e0b' : '#10b981' }]}>
                    {a.isPublished ? 'Masquer' : 'Publier'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  assetCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  assetInfo: {
    gap: 4,
  },
  assetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  providerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerText: {
    fontSize: 10,
    fontWeight: '700',
  },
  assetMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
