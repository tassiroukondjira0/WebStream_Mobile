import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, LogOut, Mail, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user, login, register, logout } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegisterMode = params.mode === 'register';

  const handleSubmit = async () => {
    if (isRegisterMode) {
      if (!name.trim() || !email.trim() || !password) {
        setError('Veuillez renseigner tous les champs.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await register(name.trim(), email.trim(), password);
        router.back();
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'inscription.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!email.trim() || !password) {
        setError('Veuillez renseigner votre email et mot de passe.');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await login(email.trim(), password);
        router.back();
      } catch (err: any) {
        setError(err.message || 'Identifiants incorrects.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {user
            ? 'Mon Compte'
            : isRegisterMode
            ? 'Inscription'
            : 'Connexion CinéMax'}
        </Text>
      </View>

      <View style={styles.content}>
        {user ? (
          // Connecté
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <UserIcon color="#e50914" size={36} />
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Rôle : {user.role}</Text>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}>
              <LogOut color="#ef4444" size={18} />
              <Text style={styles.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Formulaire de connexion ou d'inscription
          <View style={styles.formContainer}>
            <Text style={styles.welcomeTitle}>
              {isRegisterMode ? 'Créer un compte' : 'Bienvenue'}
            </Text>
            <Text style={styles.welcomeSub}>
              {isRegisterMode
                ? 'Inscrivez-vous pour sauvegarder vos favoris et votre liste de souhaits.'
                : 'Connectez-vous pour retrouver vos favoris et votre historique.'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isRegisterMode ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom</Text>
                <View style={styles.inputWrapper}>
                  <UserIcon color="#71717a" size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom"
                    placeholderTextColor="#71717a"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse e-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail color="#71717a" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="nom@exemple.com"
                  placeholderTextColor="#71717a"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Lock color="#71717a" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#71717a"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isRegisterMode ? 'S\'inscrire' : 'Se connecter'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleLink}
              onPress={() => {
                if (isRegisterMode) {
                  router.replace('/login');
                } else {
                  router.push({ pathname: '/login', params: { mode: 'register' } });
                }
                setError(null);
              }}
              activeOpacity={0.7}>
              <Text style={styles.toggleLinkText}>
                {isRegisterMode
                  ? 'Déjà un compte ? Se connecter'
                  : 'Pas encore de compte ? S\'inscrire'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  welcomeSub: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#e50914',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  userEmail: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 24,
  },
  roleText: {
    color: '#f4f4f5',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleLinkText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
});
