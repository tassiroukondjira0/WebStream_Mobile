import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Api } from '@/services/api';
import { colors } from '@/theme/theme';

const targets = [
  { value: 'ALL' as const, label: 'Tous (sauf admins)' },
  { value: 'SUBSCRIBERS' as const, label: 'Abonnés Premium' },
  { value: 'MOBILE_APP' as const, label: 'Appareils mobiles (push)' },
];

const types = [
  { value: 'ANNONCE' as const, label: 'Annonce' },
  { value: 'NOUVEAUTE' as const, label: 'Nouveauté' },
];

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<'ALL' | 'SUBSCRIBERS' | 'MOBILE_APP'>('ALL');
  const [type, setType] = useState<'ANNONCE' | 'NOUVEAUTE'>('ANNONCE');
  const [sending, setSending] = useState(false);

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Erreur', 'Titre et message sont requis.');
      return;
    }
    setSending(true);
    try {
      const res = await Api.sendAdminNotification({
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || null,
        target,
        type,
      });
      Alert.alert('Succès', res.message);
      setTitle('');
      setMessage('');
      setLink('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'envoyer la notification.');
    } finally {
      setSending(false);
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
            <Send color={colors.warning} size={18} />
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <Text style={styles.formDesc}>
            Envoyez une notification in-app à tous vos utilisateurs, aux abonnés Premium,
            ou une push notification uniquement aux appareils mobiles.
          </Text>

          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            placeholder="Titre de la notification"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message de la notification"
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Lien (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor={colors.textTertiary}
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Cible</Text>
          <View style={styles.chipRow}>
            {targets.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, target === t.value && styles.chipActive]}
                onPress={() => setTarget(t.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, target === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {types.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, type === t.value && styles.chipActive]}
                onPress={() => setType(t.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={sendNotification}
            activeOpacity={0.7}
            disabled={sending}
          >
            <Send color={colors.primaryForeground} size={18} />
            <Text style={styles.sendBtnText}>{sending ? 'Envoi...' : 'Envoyer'}</Text>
          </TouchableOpacity>
        </View>
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
  form: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 14,
  },
  formDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});
