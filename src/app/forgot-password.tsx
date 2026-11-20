import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Api } from '@/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner votre adresse email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Erreur', 'Adresse email invalide.');
      return;
    }

    setLoading(true);
    try {
      const res = await Api.forgotPassword(email.trim());
      if (res.success) {
        setSent(true);
        // Rediriger vers la page de saisie du code après 2 secondes
        setTimeout(() => {
          router.replace(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        }, 2000);
      } else {
        Alert.alert('Erreur', res.message || 'Impossible d\'envoyer le code.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le code.');
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Mot de passe oublié</Text>
          <View style={styles.backBtnSpacer} />
        </View>

        <View style={styles.content}>
          {sent ? (
            <>
              <Mail size={80} color="#22c55e" style={styles.icon} />
              <Text style={styles.title}>Code envoyé !</Text>
              <Text style={styles.subtitle}>
                Un code de réinitialisation a été envoyé à{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>
              <Text style={styles.hint}>Redirection en cours...</Text>
            </>
          ) : (
            <>
              <LockIcon size={80} color="#7c3aed" />
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Entrez votre adresse email pour recevoir un code de réinitialisation.
              </Text>

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
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !email.trim() && styles.submitBtnDisabled]}
                onPress={handleSend}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Envoyer le code</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LockIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={[styles.iconPlaceholder, { width: size, height: size, backgroundColor: color + '20' }]}>
      <Text style={{ color, fontSize: size * 0.5 }}>🔑</Text>
    </View>
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
  iconPlaceholder: {
    marginBottom: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  hint: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    gap: 10,
    width: '100%',
    marginBottom: 24,
  },
  input: {
    flex: 1,
    color: '#fafafa',
    fontSize: 16,
  },
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
