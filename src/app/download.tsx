import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, Smartphone } from 'lucide-react-native';
import { Link } from 'expo-router';

// Lien direct vers le build APK sur EAS
const APK_DOWNLOAD_URL =
  'https://expo.dev/accounts/tassirou/projects/cinemax-mobile/builds/050909d7-d764-4e20-aec1-e375e96446ca';

export default function DownloadScreen() {
  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Smartphone size={80} color="#e50914" style={styles.icon} />

        <Text style={styles.title}>CinéMax pour Android</Text>

        <Text style={styles.description}>
          Téléchargez l&#39;application CinéMax et profitez de vos films, séries et animes préférés
          directement sur votre appareil Android.
        </Text>

        <View style={styles.features}>
          <FeatureItem emoji="🎬" text="Films en streaming" />
          <FeatureItem emoji="📺" text="Séries complètes" />
          <FeatureItem emoji="🇯🇵" text="Catalogue anime" />
          <FeatureItem emoji="❤️" text="Favorites et wishlist" />
        </View>

        {isWeb ? (
          <View style={styles.downloadBox}>
            <Text style={styles.downloadText}>
              📱 Version Android disponible
            </Text>
            <Link href={APK_DOWNLOAD_URL} target="_blank" asChild>
              <TouchableOpacity style={styles.downloadButton}>
                <Download size={20} color="#fff" />
                <Text style={styles.downloadButtonText}>Télécharger l&#39;APK</Text>
              </TouchableOpacity>
            </Link>
            <Text style={styles.versionInfo}>Version 1.0.0 • Android</Text>
          </View>
        ) : (
          <View style={styles.downloadBox}>
            <Text style={styles.downloadText}>
              📱 Vous utilisez déjà l&#39;application mobile !
            </Text>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                Linking.openURL(APK_DOWNLOAD_URL);
              }}>
              <Download size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Partager le lien de téléchargement</Text>
            </TouchableOpacity>
            <Text style={styles.versionInfo}>Version 1.0.0 • Android</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  features: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#18181b',
    borderRadius: 8,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#d4d4d8',
  },
  downloadBox: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#18181b',
    borderRadius: 12,
    gap: 12,
  },
  downloadText: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  versionInfo: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
});
