import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, LogOut, Mail, MapPin, Phone, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { saveTempPassword, clearTempPassword } from '@/services/auth.utils';

const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire", prefix: '+225' },
  { code: 'SN', name: 'Sénégal', prefix: '+221' },
  { code: 'ML', name: 'Mali', prefix: '+223' },
  { code: 'BF', name: 'Burkina Faso', prefix: '+226' },
  { code: 'GN', name: 'Guinée', prefix: '+224' },
  { code: 'CM', name: 'Cameroun', prefix: '+237' },
  { code: 'FR', name: 'France', prefix: '+33' },
  { code: 'BE', name: 'Belgique', prefix: '+32' },
  { code: 'CA', name: 'Canada', prefix: '+1' },
  { code: 'CD', name: 'RD Congo', prefix: '+243' },
  { code: 'CG', name: 'Congo', prefix: '+242' },
  { code: 'TG', name: 'Togo', prefix: '+228' },
  { code: 'BJ', name: 'Bénin', prefix: '+229' },
  { code: 'NE', name: 'Niger', prefix: '+227' },
  { code: 'GA', name: 'Gabon', prefix: '+241' },
  { code: 'GQ', name: 'Guinée équatoriale', prefix: '+240' },
  { code: 'CF', name: 'Centrafrique', prefix: '+236' },
  { code: 'MR', name: 'Mauritanie', prefix: '+222' },
  { code: 'OTHER', name: 'Autre', prefix: '' },
];

// --- Protection contre les attaques brute force ---

/** Nombre maximum de tentatives échouées avant verrouillage */
const MAX_FAILED_ATTEMPTS = 5;
/** Durée du verrouillage en millisecondes (30 minutes) */
const LOCKOUT_DURATION = 30 * 60 * 1000;
/** Délai de base entre les tentatives en millisecondes */
const BASE_DELAY_MS = 1000;

/**
 * Valide le format d'une adresse email.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Vérifie la complexité du mot de passe : au moins 3 types parmi
 * minuscules, majuscules, chiffres et symboles.
 */
function hasSufficientPasswordComplexity(password: string): boolean {
  let types = 0;
  if (/[a-z]/.test(password)) types++;       // minuscules
  if (/[A-Z]/.test(password)) types++;       // majuscules
  if (/[0-9]/.test(password)) types++;       // chiffres
  if (/[^a-zA-Z0-9]/.test(password)) types++; // symboles
  return types >= 3;
}

/**
 * Retourne le délai à attendre en millisecondes en fonction du nombre
 * d'échecs consécutifs (délai progressif : 1s, 2s, 4s, 8s…).
 */
function getRetryDelay(failedAttempts: number): number {
  return BASE_DELAY_MS * Math.pow(2, Math.min(failedAttempts, 4));
}

/**
 * Vérifie si le formulaire est verrouillé en raison d'echecs répétés.
 */
function isFormLocked(lastFailedTime: number | null, failedAttempts: number): { locked: boolean; remainingMs: number } {
  if (lastFailedTime === null || failedAttempts < MAX_FAILED_ATTEMPTS) {
    return { locked: false, remainingMs: 0 };
  }
  const elapsed = Date.now() - lastFailedTime;
  const remaining = Math.max(0, LOCKOUT_DURATION - elapsed);
  return { locked: remaining > 0, remainingMs: remaining };
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user, loginRaw, register, logout } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegisterMode = params.mode === 'register';

  // États pour la protection contre le brute force (login uniquement)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const lastFailedTimeRef = useRef<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nettoyer le timer de verrouillage au démontage
  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
      clearTempPassword();
    };
  }, []);

  // Mettre à jour le compte à rebours du verrouillage
  const updateLockoutTimer = useCallback(() => {
    const { locked, remainingMs } = isFormLocked(lastFailedTimeRef.current, failedAttempts);
    setLockoutRemaining(remainingMs);
    if (locked && remainingMs > 0) {
      lockoutTimerRef.current = setInterval(() => {
        const { remainingMs } = isFormLocked(lastFailedTimeRef.current, failedAttempts);
        setLockoutRemaining(remainingMs);
        if (remainingMs <= 0) {
          if (lockoutTimerRef.current) {
            clearInterval(lockoutTimerRef.current);
            lockoutTimerRef.current = null;
          }
        }
      }, 1000);
    }
  }, [failedAttempts]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  const handleSubmit = async () => {
    if (isRegisterMode) {
      if (!name.trim() || !email.trim() || !password) {
        setError('Veuillez renseigner tous les champs.');
        return;
      }
      if (!isValidEmail(email.trim())) {
        setError('Adresse email invalide.');
        return;
      }
      if (!country) {
        setError('Veuillez sélectionner votre pays.');
        return;
      }
      if (!phoneNumber.trim()) {
        setError('Veuillez renseigner votre numéro de téléphone.');
        return;
      }
      if (password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères avec 3 types différents (minuscules, majuscules, chiffres, symboles).');
        return;
      }
      if (!hasSufficientPasswordComplexity(password)) {
        setError('Le mot de passe doit contenir au moins 3 types de caractères différents (minuscules, majuscules, chiffres, symboles).');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await register(name.trim(), email.trim(), password, country, phoneNumber.trim());
        // Effacer le mot de passe de la mémoire après utilisation
        setPassword('');
        // Rediriger vers la page de vérification email (sans le mot de passe dans l'URL)
        router.replace(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } catch (err: any) {
        setError(err.message || 'Erreur lors de l\'inscription.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Vérifier le verrouillage du formulaire
      const { locked, remainingMs } = isFormLocked(lastFailedTimeRef.current, failedAttempts);
      if (locked) {
        setLockoutRemaining(remainingMs);
        const minutes = Math.ceil(remainingMs / 60000);
        setError(`Trop de tentatives échouées. Veuillez réessayer dans ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        updateLockoutTimer();
        return;
      }

      if (!email.trim() || !password) {
        setError('Veuillez renseigner votre email et mot de passe.');
        return;
      }
      if (!isValidEmail(email.trim())) {
        setError('Adresse email invalide.');
        return;
      }

      // Appliquer un délai progressif si des échecs précédents
      if (failedAttempts > 0) {
        const delay = getRetryDelay(failedAttempts);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      setError(null);
      setSubmitting(true);
      try {
        const res = await loginRaw(email.trim(), password);
        if (res.ok && res.user) {
          // Connexion réussie — réinitialiser le compteur d'échecs
          setFailedAttempts(0);
          lastFailedTimeRef.current = null;
          setLockoutRemaining(0);
          // Effacer le mot de passe de la mémoire
          setPassword('');
          router.back();
        } else if (res.status === 403 && res.emailVerified === false) {
          // Email non vérifié — stocker le mot de passe de manière sécurisée
          await saveTempPassword(password);
          // Effacer le mot de passe de la mémoire
          setPassword('');
          Alert.alert(
            'Email non vérifié',
            'Vérifiez d\'abord votre adresse email avant de vous connecter. Un code vous a été envoyé par email.',
            [
              {
                text: 'Vérifier',
                onPress: () => router.replace(
                  `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
                ),
              },
              { text: 'Annuler', style: 'cancel' },
            ]
          );
        } else {
          throw new Error(res.error || 'Identifiants incorrects.');
        }
      } catch (err: any) {
        // Incrémenter le compteur d'échecs
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        lastFailedTimeRef.current = Date.now();

        // Vérifier si le verrouillage doit s'activer
        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          if (lockoutTimerRef.current) {
            clearInterval(lockoutTimerRef.current);
          }
          lockoutTimerRef.current = setInterval(() => {
            const { remainingMs } = isFormLocked(lastFailedTimeRef.current, newFailedAttempts);
            setLockoutRemaining(remainingMs);
            if (remainingMs <= 0) {
              if (lockoutTimerRef.current) {
                clearInterval(lockoutTimerRef.current);
                lockoutTimerRef.current = null;
              }
              // Réinitialiser après le verrouillage
              setFailedAttempts(0);
              lastFailedTimeRef.current = null;
            }
          }, 1000);
          setLockoutRemaining(LOCKOUT_DURATION);
          setError(`Trop de tentatives échouées. Le formulaire est verrouillé pour 30 minutes.`);
        } else {
          const remaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
          setError(`${err.message || 'Identifiants incorrects.'} (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}).`);
        }
        // Effacer le mot de passe de la mémoire après un échec
        setPassword('');
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

            {isRegisterMode ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pays</Text>
                <View style={[styles.inputWrapper, { paddingHorizontal: 8 }]}>
                  <MapPin color="#71717a" size={18} />
                  <Picker
                    selectedValue={country}
                    onValueChange={setCountry}
                    style={[styles.input, { height: 32, marginVertical: -2 }]}
                  >
                    <Picker.Item label="Sélectionnez votre pays" value="" />
                    {COUNTRIES.map((c) => (
                      <Picker.Item key={c.code} label={c.name} value={c.code} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : null}

            {isRegisterMode ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                <View style={styles.inputWrapper}>
                  <Phone color="#71717a" size={18} />
                  <TextInput
                    style={styles.input}
                    placeholder={selectedCountry ? `${selectedCountry.prefix} XX XX XX XX` : 'Votre numéro'}
                    placeholderTextColor="#71717a"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            ) : null}

            {lockoutRemaining > 0 && !isRegisterMode ? (
              <View style={styles.lockoutBox}>
                <Text style={styles.lockoutText}>
          Formulaire verrouillé — réessayez dans {Math.ceil(lockoutRemaining / 1000)}s
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, lockoutRemaining > 0 && !isRegisterMode && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || lockoutRemaining > 0}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : lockoutRemaining > 0 && !isRegisterMode ? (
                <Text style={styles.submitBtnText}>
          Verrouillé ({Math.ceil(lockoutRemaining / 1000)}s)
                </Text>
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

            {!isRegisterMode ? (
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => router.push('/forgot-password')}
                activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            ) : null}
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
  submitBtnDisabled: {
    opacity: 0.5,
  },
  lockoutBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: '#eab308',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  lockoutText: {
    color: '#eab308',
    fontSize: 14,
    fontWeight: '600',
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
  forgotPasswordLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },
});
