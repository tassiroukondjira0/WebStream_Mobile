import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Trash2 } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminReview } from '@/types/media';
import { colors } from '@/theme/theme';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const data = await Api.getAdminReviews();
      setReviews(data.reviews);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les avis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const deleteReview = async (review: AdminReview) => {
    Alert.alert(
      'Supprimer',
      `Supprimer l'avis de ${review.userName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await Api.deleteAdminReview(review.id);
              Alert.alert('Succès', 'Avis supprimé.');
              loadReviews();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de supprimer.');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            color={i < rating ? colors.warning : colors.textTertiary}
            fill={i < rating ? colors.warning : 'transparent'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Star color={colors.warning} size={18} />
            <Text style={styles.headerTitle}>Avis</Text>
          </View>
          <View style={{ width: 40 }} />
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
        ) : reviews.length === 0 ? (
          <Text style={styles.emptyText}>Aucun avis.</Text>
        ) : (
          <View style={styles.list}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <Text style={styles.reviewUserName}>{r.userName}</Text>
                    <Text style={styles.reviewUserEmail}>{r.userEmail}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteReview(r)}
                    activeOpacity={0.7}
                  >
                    <Trash2 color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
                <View style={styles.reviewMeta}>
                  {renderStars(r.rating)}
                  <Text style={styles.reviewSlug}>{r.mediaSlug}</Text>
                </View>
                {r.comment && (
                  <Text style={styles.reviewComment}>{r.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(r.createdAt).toLocaleString('fr-FR')}
                </Text>
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
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewUser: {
    gap: 2,
  },
  reviewUserName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewUserEmail: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewSlug: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  reviewComment: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewDate: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
});
