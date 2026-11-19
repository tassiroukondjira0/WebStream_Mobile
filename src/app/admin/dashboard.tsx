import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  Database,
  Eye,
  MessageSquare,
  Send,
  Server,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminStatsResponse } from '@/types/media';
import { colors } from '@/theme/theme';

const statCards = [
  { key: 'totalUsers' as const, label: 'Utilisateurs', icon: Users, color: colors.primary },
  { key: 'premiumUsers' as const, label: 'Premium', icon: Zap, color: colors.warning },
  { key: 'standardUsers' as const, label: 'Standard', icon: Users, color: colors.success },
  { key: 'totalViews' as const, label: 'Vues totales', icon: Eye, color: '#3b82f6' },
  { key: 'monthViews' as const, label: 'Vues ce mois', icon: BarChart3, color: '#06b6d4' },
  { key: 'partnerPublished' as const, label: 'Partenaires publiés', icon: Database, color: '#a855f7' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await Api.getAdminStats();
      setStats(data);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const maxViews = stats
    ? Math.max(...stats.viewsByMonth.map((v) => v.views), 1)
    : 1;

  const adminMenuItems = [
    { label: 'Utilisateurs', desc: 'Gérer les rôles', icon: Users, color: colors.primary, route: '/admin/users' as const },
    { label: 'Médias', desc: 'Catalogue', icon: Database, color: '#3b82f6', route: '/admin/medias' as const },
    { label: 'Notifications', desc: 'Envoyer push', icon: Send, color: colors.warning, route: '/admin/notifications' as const },
    { label: 'Avis', desc: 'Modération', icon: Star, color: colors.success, route: '/admin/reviews' as const },
    { label: 'Synchronisation', desc: 'TMDB, partenaires', icon: Server, color: '#a855f7', route: '/admin/sync' as const },
    { label: 'Assets partenaires', desc: 'Publication', icon: MessageSquare, color: '#06b6d4', route: '/admin/provider-assets' as const },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <ShieldCheck color={colors.warning} size={18} />
            <Text style={styles.headerTitle}>Super Admin</Text>
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
        ) : (
          <>
            {/* Stat cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistiques</Text>
              <View style={styles.statsGrid}>
                {statCards.map((s) => {
                  const Icon = s.icon;
                  const value = stats?.totals[s.key] ?? 0;
                  return (
                    <View key={s.key} style={styles.statCard}>
                      <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                        <Icon color={s.color} size={20} />
                      </View>
                      <Text style={styles.statValue}>{value.toLocaleString('fr-FR')}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Traffic chart */}
            {stats?.viewsByMonth && stats.viewsByMonth.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trafic (12 derniers mois)</Text>
                <View style={styles.chartContainer}>
                  {stats.viewsByMonth.map((m) => (
                    <View key={m.label} style={styles.chartBarWrap}>
                      <View style={styles.chartBar}>
                        <View
                          style={[
                            styles.chartFill,
                            { height: `${Math.max((m.views / maxViews) * 100, 4)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{m.label.slice(0, 3)}</Text>
                      <Text style={styles.chartValue}>{m.views}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Signups chart */}
            {stats?.signupsByMonth && stats.signupsByMonth.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inscriptions (12 derniers mois)</Text>
                <View style={styles.chartContainer}>
                  {stats.signupsByMonth.map((m) => {
                    const maxS = Math.max(...stats.signupsByMonth.map((s) => s.signups), 1);
                    return (
                      <View key={m.label} style={styles.chartBarWrap}>
                        <View style={styles.chartBar}>
                          <View
                            style={[
                              styles.chartFillGreen,
                              { height: `${Math.max((m.signups / maxS) * 100, 4)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>{m.label.slice(0, 3)}</Text>
                        <Text style={styles.chartValue}>{m.signups}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Admin menu */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Menu d'administration</Text>
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.menuItem}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                      <Icon color={item.color} size={22} />
                    </View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuDesc}>{item.desc}</Text>
                    </View>
                    <ArrowLeft color={colors.textTertiary} size={16} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Share app */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() =>
                  Share.share({
                    message: 'Découvrez CinéMax — votre plateforme de streaming !',
                    title: 'CinéMax',
                  })
                }
                activeOpacity={0.7}
              >
                <Send color={colors.primaryForeground} size={18} />
                <Text style={styles.shareBtnText}>Partager l'application</Text>
              </TouchableOpacity>
            </View>
          </>
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
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 140,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartBarWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  chartBar: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartFill: {
    width: '60%',
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartFillGreen: {
    width: '60%',
    backgroundColor: colors.success,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    color: colors.textTertiary,
    fontSize: 8,
    fontWeight: '600',
  },
  chartValue: {
    color: colors.textSecondary,
    fontSize: 8,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  menuDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  shareBtnText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});
