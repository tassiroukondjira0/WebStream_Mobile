import React from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Share2, User as UserIcon, Shield } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/theme';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  SUBSCRIBER: 'Abonné',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super Administrateur',
};

export default function ProfileInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const roleLabel = user ? ROLE_LABELS[user.role] || user.role : '—';

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Découvrez CinéMax — votre application de streaming de films, séries et animés ! Visitez-nous : https://web-stream-mncx.onrender.com',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de partager le lien.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes informations</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <>
            {/* Avatar */}
            <View style={styles.avatarCircle}>
              <UserIcon color={colors.primary} size={48} />
            </View>

            {/* Info cards */}
            <View style={styles.card}>
              <View style={styles.row}>
                <UserIcon color={colors.textSecondary} size={18} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Nom</Text>
                  <Text style={styles.value}>{user.name || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Mail color={colors.textSecondary} size={18} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{user.email || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Shield color={colors.textSecondary} size={18} />
                <View style={styles.rowContent}>
                  <Text style={styles.label}>Statut</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{roleLabel}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Share button */}
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.7}
              style={styles.shareBtn}>
              <Share2 color="#ffffff" size={20} />
              <Text style={styles.shareBtnText}>Partager l&#39;application</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <UserIcon color={colors.textTertiary} size={48} />
            <Text style={styles.emptyText}>
              Connectez-vous pour voir vos informations.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}
              style={styles.loginBtn}>
              <Text style={styles.loginBtnText}>Se connecter</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  backBtn: {
    padding: 4,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  label: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignSelf: 'flex-start',
  },
  roleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
