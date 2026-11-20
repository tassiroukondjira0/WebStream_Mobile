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
import { ArrowLeft, Server, Search } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminSyncRun } from '@/types/media';
import { colors } from '@/theme/theme';

type SyncProvider = 'tmdb' | 'partner' | 'fstreamtv' | 'platforms';

const providers: { key: SyncProvider; label: string; color: string }[] = [
  { key: 'tmdb', label: 'TMDB', color: '#3b82f6' },
  { key: 'partner', label: 'Partenaire', color: '#a855f7' },
  { key: 'fstreamtv', label: 'FStreamTV', color: '#06b6d4' },
  { key: 'platforms', label: 'Plateformes', color: '#10b981' },
];

export default function AdminSyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeProvider, setActiveProvider] = useState<SyncProvider>('tmdb');
  const [syncStates, setSyncStates] = useState<Record<SyncProvider, { assets: Record<string, number>; runs: AdminSyncRun[] }>>({} as any);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<SyncProvider | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetedSyncing, setTargetedSyncing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = {} as Record<SyncProvider, any>;
      for (const p of providers) {
        try {
          let data: any;
          switch (p.key) {
            case 'tmdb': data = await Api.getTmdbSyncState(); break;
            case 'partner': data = await Api.getPartnerSyncState(); break;
            case 'fstreamtv': data = await Api.getFStreamSyncState(); break;
            case 'platforms': data = await Api.getPlatformSyncState(); break;
          }
          results[p.key] = { assets: data.assets || {}, runs: data.runs || [] };
        } catch {
          results[p.key] = { assets: {}, runs: [] };
        }
      }
      setSyncStates(results);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les états de synchro.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const runSync = async (provider: SyncProvider) => {
    setSyncing(provider);
    try {
      switch (provider) {
        case 'tmdb': await Api.runTmdbSync(2); break;
        case 'partner': await Api.runPartnerSync(2); break;
        case 'fstreamtv': await Api.runFStreamSync(2); break;
        case 'platforms': await Api.runPlatformSync(3); break;
      }
      Alert.alert('Succès', `Synchronisation ${provider} terminée.`);
      loadAll();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur de synchronisation.');
    } finally {
      setSyncing(null);
    }
  };

  const runTargetedSync = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Erreur', 'Entrez un titre ou un ID.');
      return;
    }
    setTargetedSyncing(true);
    try {
      await Api.runTargetedSync(undefined, undefined, searchQuery.trim());
      Alert.alert('Succès', 'Synchronisation ciblée terminée.');
      setSearchQuery('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Erreur de synchronisation ciblée.');
    } finally {
      setTargetedSyncing(false);
    }
  };

  const runCoveragePass = async () => {
    Alert.alert(
      'Passe de couverture',
      'Analyser la disponibilité des sources pour tous les titres TMDB ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Lancer',
          onPress: async () => {
            try {
              const res = await Api.runCoveragePass(true);
              Alert.alert('Succès', res.message);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Erreur de la passe de couverture.');
            }
          },
        },
      ]
    );
  };

  const runImportTmdb = async (type: 'movie' | 'tv') => {
    Alert.alert(
      'Import TMDB',
      `Importer les ${type === 'movie' ? 'films' : 'séries'} populaires depuis TMDB ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          onPress: async () => {
            try {
              const res = await Api.importTmdb(type, 2, 'FREE');
              Alert.alert('Succès', res.message);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Erreur d\'import.');
            }
          },
        },
      ]
    );
  };

  const current = syncStates[activeProvider];
  const statusColor = (status: string) => {
    if (status === 'SUCCESS') return colors.success;
    if (status === 'ERROR') return colors.error;
    return colors.warning;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Server color="#a855f7" size={18} />
            <Text style={styles.headerTitle}>Synchronisation</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Provider tabs */}
            <View style={styles.tabRow}>
              {providers.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.tab, activeProvider === p.key && styles.tabActive]}
                  onPress={() => setActiveProvider(p.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeProvider === p.key && styles.tabTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Provider stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{providers.find((p) => p.key === activeProvider)?.label} — État</Text>
              <View style={styles.statsRow}>
                {current?.assets && Object.entries(current.assets).map(([key, val]) => (
                  <View key={key} style={styles.miniStat}>
                    <Text style={styles.miniStatValue}>{val}</Text>
                    <Text style={styles.miniStatLabel}>{key}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.syncBtn, syncing === activeProvider && styles.syncBtnDisabled]}
                onPress={() => runSync(activeProvider)}
                activeOpacity={0.7}
                disabled={syncing !== null}
              >
                <Server color={colors.primaryForeground} size={16} />
                <Text style={styles.syncBtnText}>
                  {syncing === activeProvider ? 'Synchro...' : 'Synchroniser'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sync history */}
            {current?.runs && current.runs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Historique</Text>
                {current.runs.slice(0, 5).map((run) => (
                  <View key={run.id} style={styles.runCard}>
                    <View style={styles.runHeader}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(run.status) }]} />
                      <Text style={styles.runStatus}>{run.status}</Text>
                      <Text style={styles.runDate}>
                        {new Date(run.startedAt).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                    <Text style={styles.runDetail}>
                      {run.assetsUpserted} ajoutés · {run.assetsPruned} retirés · {run.pagesFetched} pages
                    </Text>
                    {run.error && <Text style={styles.runError}>{run.error}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Targeted sync */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Synchronisation ciblée</Text>
              <View style={styles.targetedRow}>
                <View style={styles.searchWrap}>
                  <Search color={colors.textTertiary} size={16} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Titre ou ID..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.targetedBtn, targetedSyncing && styles.targetedBtnDisabled]}
                  onPress={runTargetedSync}
                  activeOpacity={0.7}
                  disabled={targetedSyncing}
                >
                  <Text style={styles.targetedBtnText}>{targetedSyncing ? '...' : 'Lancer'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Import & coverage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Import & Couverture</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionCard, { borderColor: '#3b82f6' }]}
                  onPress={() => runImportTmdb('movie')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionCardTitle, { color: '#3b82f6' }]}>Import Films TMDB</Text>
                  <Text style={styles.actionCardDesc}>Films populaires</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionCard, { borderColor: '#a855f7' }]}
                  onPress={() => runImportTmdb('tv')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionCardTitle, { color: '#a855f7' }]}>Import Séries TMDB</Text>
                  <Text style={styles.actionCardDesc}>Séries populaires</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.actionCardFull, { borderColor: '#06b6d4' }]}
                onPress={runCoveragePass}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionCardTitle, { color: '#06b6d4' }]}>Passe de couverture</Text>
                <Text style={styles.actionCardDesc}>Vérifier la disponibilité des sources Vidzy</Text>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.muted,
  },
  tabActive: {
    backgroundColor: colors.primary + '30',
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  miniStat: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  miniStatValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  miniStatLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '700',
  },
  runCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 4,
  },
  runHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  runStatus: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  runDate: {
    color: colors.textTertiary,
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  runDetail: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  runError: {
    color: colors.error,
    fontSize: 11,
    fontStyle: 'italic',
  },
  targetedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  targetedBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  targetedBtnDisabled: {
    opacity: 0.5,
  },
  targetedBtnText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    backgroundColor: colors.card,
    gap: 4,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionCardDesc: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  actionCardFull: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    backgroundColor: colors.card,
    gap: 4,
  },
});
