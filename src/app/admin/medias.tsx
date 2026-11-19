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
import { ArrowLeft, Database, Eye, EyeOff, Plus, Search, Trash2 } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminMediaItem } from '@/types/media';
import { colors } from '@/theme/theme';

export default function AdminMediasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [medias, setMedias] = useState<AdminMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadMedias = useCallback(async (p: number = 1) => {
    try {
      const data = await Api.getAdminMedias(p, 24, search || undefined);
      setMedias(data.items);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les médias.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadMedias();
  }, [loadMedias]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMedias(1);
  };

  const togglePublish = async (item: AdminMediaItem) => {
    try {
      await Api.updateAdminMedia(item.id, { isPublished: !item.isPublished });
      Alert.alert('Succès', `"${item.title}" ${!item.isPublished ? 'publié' : 'masqué'}.`);
      loadMedias(page);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour.');
    }
  };

  const deleteMedia = async (item: AdminMediaItem) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${item.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await Api.deleteAdminMedia(item.id);
              Alert.alert('Succès', 'Média supprimé.');
              loadMedias(page);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de supprimer.');
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MOVIE': return '#3b82f6';
      case 'SERIES': return '#a855f7';
      case 'ANIME': return '#06b6d4';
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
            <Database color="#3b82f6" size={18} />
            <Text style={styles.headerTitle}>Médias</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/admin/medias' as any)} style={styles.addBtn} activeOpacity={0.7}>
            <Plus color={colors.primaryForeground} size={18} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <Search color={colors.textTertiary} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadMedias(1)}
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
        ) : medias.length === 0 ? (
          <Text style={styles.emptyText}>Aucun média trouvé.</Text>
        ) : (
          <View style={styles.list}>
            {medias.map((m) => (
              <View key={m.id} style={styles.mediaCard}>
                <View style={styles.mediaInfo}>
                  <View style={styles.mediaTitleRow}>
                    <Text style={styles.mediaTitle} numberOfLines={1}>{m.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(m.type) + '20' }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(m.type) }]}>{m.type}</Text>
                    </View>
                  </View>
                  <Text style={styles.mediaMeta}>
                    {m.releaseYear || '—'} · {m.accessLevel === 'PREMIUM' ? '👑 Premium' : '🆓 Gratuit'}
                    {m.isPublished ? ' · ✅' : ' · ❌'}
                  </Text>
                  {m.synopsis && (
                    <Text style={styles.mediaSynopsis} numberOfLines={2}>{m.synopsis}</Text>
                  )}
                </View>
                <View style={styles.mediaActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: m.isPublished ? '#10b98120' : '#f59e0b20' }]}
                    onPress={() => togglePublish(m)}
                    activeOpacity={0.7}
                  >
                    {m.isPublished ? (
                      <EyeOff color="#f59e0b" size={16} />
                    ) : (
                      <Eye color="#10b981" size={16} />
                    )}
                    <Text style={[styles.actionText, { color: m.isPublished ? '#f59e0b' : '#10b981' }]}>
                      {m.isPublished ? 'Masquer' : 'Publier'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
                    onPress={() => deleteMedia(m)}
                    activeOpacity={0.7}
                  >
                    <Trash2 color="#ef4444" size={16} />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
  mediaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  mediaInfo: {
    gap: 4,
  },
  mediaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mediaMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  mediaSynopsis: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 16,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
