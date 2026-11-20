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
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, Users } from 'lucide-react-native';
import { Api } from '@/services/api';
import { AdminUser } from '@/types/media';
import { colors } from '@/theme/theme';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await Api.getAdminUsers();
      setUsers(data.users);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      await Api.changeUserRole(userId, role as 'USER' | 'SUBSCRIBER' | 'ADMIN');
      Alert.alert('Succès', 'Rôle mis à jour.');
      loadUsers();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de changer le rôle.');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: '#a855f720', text: '#c084fc' };
      case 'ADMIN':
        return { bg: '#f59e0b20', text: '#fbbf24' };
      case 'SUBSCRIBER':
        return { bg: '#10b98120', text: '#34d399' };
      default:
        return { bg: '#27272a', text: '#a1a1aa' };
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
            <Users color={colors.primary} size={18} />
            <Text style={styles.headerTitle}>Utilisateurs</Text>
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
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text>
        ) : (
          <View style={styles.list}>
            {users.map((u) => {
              const badge = getRoleBadgeStyle(u.role);
              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name || '—'}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <Text style={styles.userDate}>
                      Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    {u.role === 'SUPER_ADMIN' && <ShieldCheck color={badge.text} size={10} />}
                    <Text style={[styles.roleText, { color: badge.text }]}>{u.role}</Text>
                  </View>
                  {u.role !== 'SUPER_ADMIN' && (
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={u.role}
                        onValueChange={(val) => changeRole(u.id, val)}
                        style={[styles.picker, { color: colors.textPrimary }]}
                        dropdownIconColor={colors.textPrimary}
                      >
                        <option value="USER" label="USER" />
                        <option value="SUBSCRIBER" label="SUBSCRIBER" />
                        <option value="ADMIN" label="ADMIN" />
                      </Picker>
                    </View>
                  )}
                </View>
              );
            })}
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
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  userInfo: {
    gap: 4,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  userDate: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pickerWrap: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: colors.muted,
    height: 36,
  },
});
