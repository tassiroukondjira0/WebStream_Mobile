import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Api } from '@/services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères avec 3 types différents (minuscules, majuscules, chiffres, symboles).');
      return;
    }

    if (oldPassword === newPassword) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit être différent de l\'ancien.');
      return;
    }

    setLoading(true);
    try {
      const res = await Api.changePassword(oldPassword, newPassword);
      if (res.success) {
        Alert.alert(
          'Succès',
          'Votre mot de passe a été modifié avec succès.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de modifier le mot de passe.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', 'Échec de la modification : ' + message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ArrowLeft color="#ffffff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier mon mot de passe</Text>
        </View>
        <View style={styles.authPrompt}>
          <Lock color="#3f3f46" size={48} />
          <Text style={styles.promptTitle}>Connectez-vous</Text>
          <Text style={styles.promptSub}>
            Vous devez être connecté pour modifier votre mot de passe.
          </Text>
          <TouchableOpacity
            style={styles.authBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}>
            <Text style={styles.authBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier mon mot de passe</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Mot de passe actuel</Text>
        <View style={styles.inputWrapper}>
          <Lock color="#71717a" size={18} />
          <TextInput
            style={styles.input}
            placeholder="Entrez votre mot de passe actuel"
            placeholderTextColor="#52525b"
            secureTextEntry={!showOld}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity onPress={() => setShowOld(!showOld)} activeOpacity={0.7}>
            {showOld ? (
              <EyeOff color="#71717a" size={18} />
            ) : (
              <Eye color="#71717a" size={18} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Nouveau mot de passe</Text>
        <View style={styles.inputWrapper}>
          <Lock color="#71717a" size={18} />
          <TextInput
            style={styles.input}
            placeholder="Entrez le nouveau mot de passe"
            placeholderTextColor="#52525b"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)} activeOpacity={0.7}>
            {showNew ? (
              <EyeOff color="#71717a" size={18} />
            ) : (
              <Eye color="#71717a" size={18} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Confirmer le nouveau mot de passe</Text>
        <View style={styles.inputWrapper}>
          <Lock color="#71717a" size={18} />
          <TextInput
            style={styles.input}
            placeholder="Confirmez le nouveau mot de passe"
            placeholderTextColor="#52525b"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} activeOpacity={0.7}>
            {showConfirm ? (
              <EyeOff color="#71717a" size={18} />
            ) : (
              <Eye color="#71717a" size={18} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Lock color="#ffffff" size={18} />
              <Text style={styles.submitBtnText}>Modifier le mot de passe</Text>
            </>
          )}
        </TouchableOpacity>
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
  form: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 32,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  promptTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  promptSub: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  authBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  authBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
