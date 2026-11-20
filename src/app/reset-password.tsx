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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react-native';
import { Api } from '@/services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (code.length < 4) {
      Alert.alert('Erreur', 'Le code est trop court.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères avec 3 types différents (minuscules, majuscules, chiffres, symboles).');
      return;
    }
    // Vérifier la complexité : au moins 3 types de caractères
    let types = 0;
    if (/[a-z]/.test(newPassword)) types++;
    if (/[A-Z]/.test(newPassword)) types++;
    if (/[0-9]/.test(newPassword)) types++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) types++;
    if (types < 3) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 3 types de caractères différents (minuscules, majuscules, chiffres, symboles).');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await Api.resetPassword(email || '', code, newPassword);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        Alert.alert('Erreur', res.message || 'Code incorrect ou expiré.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Code incorrect ou expiré.');
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
          <Text style={styles.headerTitle}>Réinitialisation</Text>
          <View style={styles.backBtnSpacer} />
        </View>

        <View style={styles.content}>
          {success ? (
            <>
              <CheckCircle size={80} color="#22c55e" style={styles.icon} />
              <Text style={styles.title}>Mot de passe changé !</Text>
              <Text style={styles.subtitle}>
                Votre mot de passe a été réinitialisé avec succès.
              </Text>
              <Text style={styles.hint}>Redirection vers la connexion...</Text>
            </>
          ) : (
            <>
              <Lock size={80} color="#7c3aed" style={styles.icon} />
              <Text style={styles.title}>Nouveau mot de passe</Text>
              <Text style={styles.subtitle}>
                Entrez le code reçu à{'\n'}
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
              />

              <View style={styles.inputWrapper}>
                <Lock color="#71717a" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor="#71717a"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock color="#71717a" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#71717a"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (code.length !== 6 || !newPassword || newPassword !== confirmPassword) && styles.submitBtnDisabled,
                ]}
                onPress={handleReset}
                disabled={loading || code.length !== 6 || !newPassword || newPassword !== confirmPassword}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Réinitialiser</Text>
                )}
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
  hint: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 16,
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
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#fafafa',
    fontSize: 15,
  },
  submitBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
