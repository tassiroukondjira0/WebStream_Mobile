import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Check, RefreshCw, Server, Volume2 } from 'lucide-react-native';
import { Api, getBaseApiUrl, resolveApiUrl } from '@/services/api';
import { MediaSourceItem } from '@/types/media';

const CHROME_USER_AGENT =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

type ResolvedSources = {
  sources: MediaSourceItem[];
  activeUrl: string | null;
  error: string | null;
};

type EmbedDoc = { url: string; html: string | null };

const NO_REFERRER_META = '<meta name="referrer" content="no-referrer">';

function isEmbedDocumentUrl(url: string): boolean {
  try {
    const target = new URL(url);
    const base = new URL(getBaseApiUrl());

    return (
        target.host.toLowerCase() === base.host.toLowerCase() &&
        target.pathname.startsWith('/api/embed')
    );
  } catch {
    return false;
  }
}

function withNoReferrerPolicy(html: string): string {
  const existing = /<meta[^>]+name=["']referrer["'][^>]*>/i;

  if (existing.test(html)) {
    return html.replace(existing, NO_REFERRER_META);
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(
        /<head[^>]*>/i,
        (head) => `${head}${NO_REFERRER_META}`
    );
  }

  return `${NO_REFERRER_META}${html}`;
}

export default function PlayerScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    tmdbId?: string;
    type?: string;
    provider?: string;
    webPath?: string;
    streamUrl?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<MediaSourceItem[]>([]);

  const [selectedLang, setSelectedLang] = useState('VF');
  const [selectedHost, setSelectedHost] = useState('');
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [embedDoc, setEmbedDoc] = useState<EmbedDoc | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const isSeries =
      params.type === 'series' || params.type === 'anime';

  const isDirect = activeUrl
      ? /\.(m3u8|mp4|webm)($|\?)/i.test(activeUrl)
      : false;

  // Lecteur vidéo natif
  const player = useVideoPlayer(
      isDirect ? activeUrl : null,
      (p) => {
        p.loop = false;
        p.play();
      }
  );

  useEffect(() => {
    if (isDirect && activeUrl && player) {
      try {
        player.replace(activeUrl);
        player.play();
      } catch (e) {
        console.warn('Erreur replace expo-video :', e);
      }
    }
  }, [isDirect, activeUrl, player]);

  // Récupération des sources vidéo
  const resolveSources = useCallback(async (): Promise<ResolvedSources> => {
    // Cas d'une URL directement transmise
    if (params.streamUrl) {
      const streamUrl = resolveApiUrl(params.streamUrl);

      return {
        sources: [
          {
            host: 'direct',
            label: 'Direct',
            lang: 'VF',
            season: 1,
            episode: 1,
            url: streamUrl,
          },
        ],
        activeUrl: streamUrl,
        error: null,
      };
    }

    const targetId = params.tmdbId || params.id;

    if (!targetId) {
      return {
        sources: [],
        activeUrl: null,
        error: 'Identifiant de vidéo introuvable.',
      };
    }

    try {
      const res = await Api.getMediaSources(
          targetId,
          isSeries ? 'series' : 'movie',
          params.provider || 'FSTREAMTV',
          params.title || ''
      );

      if (res && Array.isArray(res.sources) && res.sources.length > 0) {
        const resolved = res.sources
            .filter((source: MediaSourceItem) => {
              return (
                  typeof source.url === 'string' &&
                  source.url.trim().length > 0
              );
            })
            .map((source: MediaSourceItem) => ({
              ...source,
              url: resolveApiUrl(source.url),
              season: Number(source.season) || 1,
              episode: Number(source.episode) || 1,
            }));

        if (resolved.length > 0) {
          return {
            sources: resolved,
            activeUrl: resolved[0].url,
            error: null,
          };
        }
      }

      return {
        sources: [],
        activeUrl: null,
        error:
            'Aucune source vidéo valide n’a été fournie par le serveur. Réessaie plus tard.',
      };
    } catch (apiError) {
      console.warn(
          'Erreur de récupération des sources vidéo :',
          apiError
      );

      return {
        sources: [],
        activeUrl: null,
        error:
            'Impossible de récupérer les sources vidéo. Vérifie ta connexion puis réessaie.',
      };
    }
  }, [
    params.streamUrl,
    params.id,
    params.tmdbId,
    params.provider,
    params.title,
    isSeries,
  ]);

  // Application des sources récupérées
  const applySources = useCallback((result: ResolvedSources) => {
    setSources(result.sources);
    setError(result.error);
    setActiveUrl(result.activeUrl);
    setEmbedDoc(null);

    const first = result.sources[0];

    if (first) {
      setSelectedLang(first.lang || 'VF');
      setSelectedHost(first.host);
      setSelectedSeason(first.season || 1);
      setSelectedEpisode(first.episode || 1);
    }

    setLoading(false);
  }, []);

  // Rechargement
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setEmbedDoc(null);

    setReloadCount((count) => count + 1);

    void (async () => {
      const result = await resolveSources();
      applySources(result);
    })();
  }, [applySources, resolveSources]);

  // Chargement initial
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await resolveSources();

      if (cancelled) return;

      applySources(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [resolveSources, applySources]);

  // Chargement des documents d'embed de notre API
  useEffect(() => {
    const url = activeUrl;

    if (!url || isDirect || !isEmbedDocumentUrl(url)) {
      return;
    }

    let cancelled = false;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, 15000);

    void (async () => {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'text/html',
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const html = withNoReferrerPolicy(await res.text());

        if (!cancelled) {
          setEmbedDoc({ url, html });
        }
      } catch (err) {
        console.warn('Erreur chargement embed :', err);

        if (!cancelled) {
          setEmbedDoc({ url, html: null });
        }
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeUrl, isDirect, reloadCount]);

  // Langues disponibles
  const availableLangs = useMemo(() => {
    const langs = Array.from(
        new Set(sources.map((source) => source.lang || 'VF'))
    );

    return langs.length > 0 ? langs : ['VF'];
  }, [sources]);

  // Sources de la langue sélectionnée
  const langSources = useMemo(() => {
    const list = sources.filter(
        (source) => (source.lang || 'VF') === selectedLang
    );

    return list.length > 0 ? list : sources;
  }, [sources, selectedLang]);

  // Saisons disponibles
  const seasons = useMemo(() => {
    return Array.from(
        new Set(
            langSources.map((source) => Number(source.season) || 1)
        )
    ).sort((a, b) => a - b);
  }, [langSources]);

  // Sources de la saison sélectionnée
  const seasonSources = useMemo(() => {
    return langSources.filter(
        (source) =>
            (Number(source.season) || 1) === selectedSeason
    );
  }, [langSources, selectedSeason]);

  // Épisodes de la saison sélectionnée
  const episodes = useMemo(() => {
    return Array.from(
        new Set(
            seasonSources.map(
                (source) => Number(source.episode) || 1
            )
        )
    ).sort((a, b) => a - b);
  }, [seasonSources]);

  // Serveurs disponibles pour l'épisode sélectionné
  const episodeSources = useMemo(() => {
    return seasonSources.filter(
        (source) =>
            (Number(source.episode) || 1) === selectedEpisode
    );
  }, [seasonSources, selectedEpisode]);

  // Document affiché dans le WebView
  const webViewSource = useMemo(() => {
    if (!activeUrl) return null;

    if (!isEmbedDocumentUrl(activeUrl)) {
      return {
        uri: activeUrl,
        headers: {
          Referer: getBaseApiUrl(),
          Origin: getBaseApiUrl(),
        },
      };
    }

    const doc =
        embedDoc && embedDoc.url === activeUrl
            ? embedDoc
            : null;

    if (!doc) return null;

    return doc.html
        ? { html: doc.html, baseUrl: activeUrl }
        : { uri: activeUrl };
  }, [activeUrl, embedDoc]);

  // Changement de langue
  const handleSelectLang = (lang: string) => {
    setSelectedLang(lang);

    const available = sources.filter(
        (source) => (source.lang || 'VF') === lang
    );

    if (available.length > 0) {
      const target = available[0];

      setSelectedSeason(Number(target.season) || 1);
      setSelectedEpisode(Number(target.episode) || 1);
      setSelectedHost(target.host);
      setActiveUrl(target.url);
    }
  };

  // Changement de saison
  const handleSelectSeason = (season: number) => {
    setSelectedSeason(season);

    const target = langSources.find(
        (source) =>
            (Number(source.season) || 1) === season
    );

    if (target) {
      setSelectedEpisode(Number(target.episode) || 1);
      setSelectedHost(target.host);
      setActiveUrl(target.url);
    }
  };

  // Changement de serveur
  const handleSelectHost = (source: MediaSourceItem) => {
    setSelectedHost(source.host);
    setActiveUrl(source.url);
    setEmbedDoc(null);
  };

  // Changement d'épisode
  const handleSelectEpisode = (episode: number) => {
    setSelectedEpisode(episode);

    const target = seasonSources.find(
        (source) =>
            (Number(source.episode) || 1) === episode
    );

    if (target) {
      setSelectedHost(target.host);
      setActiveUrl(target.url);
      setEmbedDoc(null);
    }
  };

  return (
      <View style={styles.container}>
        {/* En-tête */}
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
          >
            <ArrowLeft color="#ffffff" size={22} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {params.title || 'Lecture Vidéo'}
            </Text>

            {selectedHost ? (
                <Text style={styles.headerSub}>
                  {selectedHost} • {selectedLang}
                  {isSeries
                      ? ` • S${selectedSeason} Ép. ${selectedEpisode}`
                      : ''}
                </Text>
            ) : null}
          </View>
        </SafeAreaView>

        {/* Lecteur vidéo */}
        <View style={styles.videoSurface}>
          {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#e50914" />
                <Text style={styles.loadingText}>
                  Recherche des serveurs disponibles...
                </Text>
              </View>
          ) : error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>

                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={reload}
                >
                  <RefreshCw color="#ffffff" size={16} />
                  <Text style={styles.retryText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
          ) : activeUrl && isDirect ? (
              <VideoView
                  style={styles.videoPlayer}
                  player={player}
                  nativeControls
                  allowsPictureInPicture
                  startsPictureInPictureAutomatically
              />
          ) : activeUrl && !webViewSource ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#e50914" />
                <Text style={styles.loadingText}>
                  Chargement du lecteur...
                </Text>
              </View>
          ) : activeUrl && webViewSource ? (
              <WebView
                  key={`${activeUrl}#${reloadCount}`}
                  source={webViewSource}
                  style={styles.videoPlayer}
                  originWhitelist={['*']}
                  allowsFullscreenVideo
                  javaScriptEnabled
                  domStorageEnabled
                  mixedContentMode="always"
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  userAgent={CHROME_USER_AGENT}
                  onError={() => {
                    setError(
                        'Impossible de charger le lecteur vidéo. Vérifie ta connexion puis réessaie.'
                    );
                  }}
              />
          ) : null}
        </View>

        {/* Commandes du lecteur */}
        <ScrollView
            style={styles.controlsScroll}
            showsVerticalScrollIndicator={false}
        >
          {/* Langues */}
          {availableLangs.length > 1 && (
              <View style={styles.controlSection}>
                <View style={styles.sectionHeader}>
                  <Volume2 color="#a1a1aa" size={16} />
                  <Text style={styles.sectionTitle}>
                    Langue audio
                  </Text>
                </View>

                <View style={styles.pillsRow}>
                  {availableLangs.map((lang) => (
                      <TouchableOpacity
                          key={lang}
                          style={[
                            styles.pill,
                            selectedLang === lang && styles.activePill,
                          ]}
                          onPress={() => handleSelectLang(lang)}
                          activeOpacity={0.8}
                      >
                        <Text
                            style={[
                              styles.pillText,
                              selectedLang === lang &&
                              styles.activePillText,
                            ]}
                        >
                          {lang}
                        </Text>
                      </TouchableOpacity>
                  ))}
                </View>
              </View>
          )}

          {/* Saisons */}
          {isSeries && seasons.length > 1 && (
              <View style={styles.controlSection}>
                <Text style={styles.sectionTitle}>Saisons</Text>

                <View style={styles.pillsRow}>
                  {seasons.map((season) => (
                      <TouchableOpacity
                          key={season}
                          style={[
                            styles.pill,
                            selectedSeason === season &&
                            styles.activePill,
                          ]}
                          onPress={() => handleSelectSeason(season)}
                          activeOpacity={0.8}
                      >
                        <Text
                            style={[
                              styles.pillText,
                              selectedSeason === season &&
                              styles.activePillText,
                            ]}
                        >
                          Saison {season}
                        </Text>
                      </TouchableOpacity>
                  ))}
                </View>
              </View>
          )}

          {/* Serveurs */}
          {episodeSources.length > 0 && (
              <View style={styles.controlSection}>
                <View style={styles.sectionHeader}>
                  <Server color="#a1a1aa" size={16} />
                  <Text style={styles.sectionTitle}>
                    Changer de serveur
                  </Text>
                </View>

                <View style={styles.pillsRow}>
                  {episodeSources.map((source, index) => {
                    const isActive = activeUrl === source.url;

                    return (
                        <TouchableOpacity
                            key={`${source.host}-${index}`}
                            style={[
                              styles.serverPill,
                              isActive && styles.activeServerPill,
                            ]}
                            onPress={() => handleSelectHost(source)}
                            activeOpacity={0.8}
                        >
                          {isActive && (
                              <Check color="#ffffff" size={14} />
                          )}

                          <Text
                              style={[
                                styles.serverPillText,
                                isActive &&
                                styles.activeServerPillText,
                              ]}
                          >
                            {source.label || source.host}
                          </Text>
                        </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
          )}

          {/* Épisodes */}
          {isSeries && episodes.length > 0 && (
              <View style={styles.controlSection}>
                <Text style={styles.sectionTitle}>
                  Épisodes — Saison {selectedSeason}
                </Text>

                <FlatList
                    data={episodes}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(episode) => episode.toString()}
                    contentContainerStyle={styles.episodesList}
                    renderItem={({ item: episode }) => (
                        <TouchableOpacity
                            style={[
                              styles.epPill,
                              selectedEpisode === episode &&
                              styles.activeEpPill,
                            ]}
                            onPress={() => handleSelectEpisode(episode)}
                            activeOpacity={0.8}
                        >
                          <Text
                              style={[
                                styles.epPillText,
                                selectedEpisode === episode &&
                                styles.activeEpPillText,
                              ]}
                          >
                            Épisode {episode}
                          </Text>
                        </TouchableOpacity>
                    )}
                />
              </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: '#09090b',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  videoSurface: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#a1a1aa',
    marginTop: 10,
    fontSize: 13,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e50914',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  controlsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  controlSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    backgroundColor: '#18181b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  activePill: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  pillText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '600',
  },
  activePillText: {
    color: '#ffffff',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  activeServerPill: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  serverPillText: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
  activeServerPillText: {
    color: '#ffffff',
  },
  episodesList: {
    paddingVertical: 8,
    gap: 8,
  },
  epPill: {
    backgroundColor: '#18181b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  activeEpPill: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  epPillText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  activeEpPillText: {
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 40,
  },
});