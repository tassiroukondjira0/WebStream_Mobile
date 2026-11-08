import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, CheckCircle, RefreshCw } from 'lucide-react-native';
import { Api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { consumeTempPassword } from '@/services/auth.utils';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { loginRaw } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  // Le mot de passe est chargé depuis SecureStore au montage, puis effacé
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Charger le mot de passe temporaire depuis SecureStore au montage
  useEffect(() => {
    let mounted = true;
    consumeTempPassword().then((pw) => {
      if (mounted) {
        setTempPassword(pw);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Erreur', 'Le code est trop court.');
      return;
    }

    setLoading(true);
    try {
      const res = await Api.verifyEmail(email || '', code);
      if (res.success) {
        setVerified(true);

        // Si on a le mot de passe, se reconnecter automatiquement
        if (tempPassword) {
          setLoggingIn(true);
          try {
            const loginRes = await loginRaw(email || '', tempPassword);
            if (loginRes.ok && loginRes.user) {
              // Connexion réussée après vérification
              // Effacer le mot de passe de la mémoire
              setTempPassword(null);
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1500);
              return;
            }
          } catch {
            // Ignorer — l'utilisateur peut se connecter manuellement
          }
          // Effacer le mot de passe après utilisation
          setTempPassword(null);
        }

        // Sinon, rediriger vers la connexion
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        Alert.alert('Erreur', res.message || 'Code incorrect.');
      }
    } catch (err: any) {
      const message = err.message || 'Code incorrect ou expiré.';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
      setLoggingIn(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await Api.resendVerificationCode(email || '');
      Alert.alert('Code envoyé', res.message || 'Un nouveau code a été envoyé à votre email.');
    } catch {
      Alert.alert('Erreur', 'Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#e4e4e7" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification</Text>
          <View style={styles.backBtnSpacer} />
        </View>

        <View style={styles.content}>
          {verified ? (
            <>
              <CheckCircle size={80} color="#22c55e" style={styles.icon} />
              <Text style={styles.title}>Email vérifié !</Text>
              {loggingIn ? (
                <Text style={styles.subtitle}>Connexion automatique en cours…</Text>
              ) : (
                <Text style={styles.subtitle}>
                  Redirection vers la connexion…
                </Text>
              )}
            </>
          ) : (
            <>
              <Mail size={80} color="#7c3aed" style={styles.icon} />
              <Text style={styles.title}>Vérifiez votre email</Text>
              <Text style={styles.subtitle}>
                Nous avons envoyé un code à 6 chiffres à{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="XXXXXX"
                placeholderTextColor="#71717a"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                textAlign="center"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.verifyBtn, code.length !== 6 && styles.verifyBtnDisabled]}
                onPress={handleVerify}
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyBtnText}>Vérifier</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendLink}>
                <View style={styles.resendRow}>
                  <RefreshCw size={14} color="#7c3aed" style={resending ? styles.spinIcon : {}} />
                  <Text style={styles.resendText}>
                    {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
  },
  backBtn: {
    padding: 8,
  },
  backBtnSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fafafa',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailText: {
    color: '#fafafa',
    fontWeight: '600',
  },
  codeInput: {
    width: '100%',
    height: 56,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    color: '#fafafa',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: 24,
  },
  verifyBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendLink: {
    marginTop: 8,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '500',
  },
  spinIcon: {
    transform: [{ rotate: '360deg' }],
  },
});
