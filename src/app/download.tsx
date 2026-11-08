import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, Smartphone, Cloud, HardDrive } from 'lucide-react-native';
import { getBaseApiUrl } from '../services/api';

interface BuildInfo {
  type: 'local' | 'eas';
  buildDate: string;
  size: number;
  downloadUrl: string;
}

export default function DownloadScreen() {
  const isWeb = Platform.OS === 'web';
  const [builds, setBuilds] = useState<BuildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuilds = useCallback(async () => {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/app-apk`);
      if (res.ok) {
        const data = await res.json();
        if (data.builds && Array.isArray(data.builds)) {
          setBuilds(data.builds);
        }
      }
    } catch {
      // API non disponible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch from external API
    fetchBuilds();
  }, [fetchBuilds]);

  const handleDownload = useCallback((build: BuildInfo) => {
    if (build.type === 'local') {
      Linking.openURL(`${getBaseApiUrl()}/api/app-apk/download`);
    } else {
      Linking.openURL(build.downloadUrl);
    }
  }, []);

  const formatBuildDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} Mo`;
  };

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

        <View style={styles.downloadStack}>
          <Text style={styles.downloadText}>
            {isWeb ? '📱 Version Android disponible' : '📱 Vous utilisez déjà l&#39;application mobile !'}
          </Text>

          {loading ? (
            <View style={[styles.downloadBox, styles.buildBoxLoading]}>
              <ActivityIndicator color="#a1a1aa" />
              <Text style={styles.localNote}>Recherche du dernier build...</Text>
            </View>
          ) : builds.length === 0 ? (
            <View style={styles.downloadBox}>
              <Text style={styles.localNote}>
                Aucun build disponible pour le moment.
              </Text>
            </View>
          ) : (
            (() => {
              const build = builds[0];
              const isEas = build.type === 'eas';
              return (
                <View style={styles.downloadBox}>
                  <View style={styles.buildHeader}>
                    {isEas ? (
                      <Cloud size={16} color="#a1a1aa" />
                    ) : (
                      <HardDrive size={16} color="#a1a1aa" />
                    )}
                    <Text style={styles.buildLabel}>
                      {isEas ? 'Build Cloud EAS' : 'Build Local'}
                    </Text>
                  </View>
                  <Text style={styles.buildDate}>
                    Construit le {formatBuildDate(build.buildDate)}
                  </Text>
                  <Text style={styles.versionInfo}>
                    Version 1.0.0 • Android{formatSize(build.size) ? ` • ${formatSize(build.size)}` : ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(build)}
                    activeOpacity={0.7}>
                    <Download size={20} color="#fff" />
                    <Text style={styles.downloadButtonText}>
                      {isEas ? 'Télécharger depuis le cloud' : 'Télécharger le build local'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()
          )}
        </View>
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
  downloadStack: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  downloadBox: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#18181b',
    borderRadius: 12,
    gap: 12,
  },
  buildBoxLoading: {
    justifyContent: 'center',
    paddingVertical: 32,
  },
  buildHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  buildLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  buildDate: {
    fontSize: 13,
    color: '#71717a',
    fontStyle: 'italic',
  },
  localNote: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
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
