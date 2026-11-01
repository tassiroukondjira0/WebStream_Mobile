import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bell,
  Clock,
  Heart,
  LogOut,
  LogIn,
  UserPlus,
  User as UserIcon,
  Lock,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleClearCache = () => {
    Alert.alert('Vider le cache', 'Supprimer les images et données temporaires ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider',
        style: 'destructive',
        onPress: async () => {
          try {
            Image.clearMemoryCache();
            Image.clearDiskCache();
            Alert.alert('Succès', 'Cache vidé avec succès.');
          } catch {
            Alert.alert('Erreur', 'Impossible de vider le cache.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          /* Non connecté — proposer Connexion / Inscription */
          <View style={styles.authPrompt}>
            <View style={styles.avatarCircle}>
              <UserIcon color="#71717a" size={48} />
            </View>
            <Text style={styles.promptTitle}>Bienvenue sur CinéMax</Text>
            <Text style={styles.promptSub}>
              Connectez-vous pour sauvegarder vos favoris et votre liste de souhaits.
            </Text>

            <TouchableOpacity
              style={styles.authBtnPrimary}
              onPress={() => router.push('/login')}
              activeOpacity={0.85}>
              <LogIn color="#ffffff" size={18} />
              <Text style={styles.authBtnPrimaryText}>Connexion</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authBtnSecondary}
              onPress={() => router.push({ pathname: '/login', params: { mode: 'register' } })}
              activeOpacity={0.85}>
              <UserPlus color="#ffffff" size={18} />
              <Text style={styles.authBtnSecondaryText}>Inscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Connecté — afficher profil + menu */
          <>
            {/* User info card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircleSmall}>
                <UserIcon color="#e50914" size={28} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.8}>
                <LogOut color="#ef4444" size={18} />
                <Text style={styles.logoutBtnText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>

            {/* Menu items */}
            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Mon compte</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/favorites' as any)}
                activeOpacity={0.7}>
                <Heart color="#e50914" size={20} />
                <Text style={styles.menuItemText}>Favoris</Text>
                <ChevronRight color="#52525b" size={16} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/wishlist' as any)}
                activeOpacity={0.7}>
                <Clock color="#e50914" size={20} />
                <Text style={styles.menuItemText}>Souhaits</Text>
                <ChevronRight color="#52525b" size={16} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/notifications' as any)}
                activeOpacity={0.7}>
                <View style={styles.menuIconWrapper}>
                  <Bell color="#e50914" size={20} />
                  {unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.menuItemText}>Notifications</Text>
                <ChevronRight color="#52525b" size={16} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/change-password' as any)}
                activeOpacity={0.7}>
                <Lock color="#a1a1aa" size={20} />
                <Text style={styles.menuItemText}>Modifier mon mot de passe</Text>
                <ChevronRight color="#52525b" size={16} />
              </TouchableOpacity>
            </View>

            {/* Settings section */}
            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Paramètres</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleClearCache}
                activeOpacity={0.7}>
                <Trash2 color="#a1a1aa" size={20} />
                <Text style={styles.menuItemText}>Vider le cache</Text>
                <ChevronRight color="#52525b" size={16} />
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
    backgroundColor: '#09090b',
  },
  scroll: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  /* Auth prompt */
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 400,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  promptTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  promptSub: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  authBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    gap: 10,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  authBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  authBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  authBtnSecondaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  /* Profile card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  avatarCircleSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    color: '#a1a1aa',
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  /* Menu sections */
  menuSection: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  menuItemText: {
    flex: 1,
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '600',
  },
  menuIconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#e50914',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
