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

/**
 * Vrai pour les documents d'embed servis par notre API (`/api/embed…`).
 *
 * Le CDN Vidzy répond 403 aux playlists et segments dont l'en-tête `Referer`
 * pointe vers un domaine non autorisé (dont celui de l'app). On charge donc ces
 * documents depuis une copie HTML récupérée par l'app, dans laquelle on force la
 * politique de référant `no-referrer` avant l'exécution des scripts.
 */
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

/** Force `no-referrer` sur le document d'embed (avant tout script). */
function withNoReferrerPolicy(html: string): string {
  const existing = /<meta[^>]+name=["']referrer["'][^>]*>/i;
  if (existing.test(html)) {
    return html.replace(existing, NO_REFERRER_META);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (head) => `${head}${NO_REFERRER_META}`);
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
  const [selectedLang, setSelectedLang] = useState<string>('VF');
  const [selectedHost, setSelectedHost] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Document d'embed récupéré par l'app (voir `isEmbedDocumentUrl`) + compteur
  // de rechargement pour forcer une nouvelle récupération.
  const [embedDoc, setEmbedDoc] = useState<EmbedDoc | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Player natif expo-video (pour flux direct mp4 / m3u8)
  const isDirect = activeUrl ? /\.(m3u8|mp4|webm)($|\?)/i.test(activeUrl) : false;
  const player = useVideoPlayer(isDirect ? activeUrl : null, (p) => {
    p.loop = false;
    p.play();
  });

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

  // Résolution des sources vidéo : aucune mise à jour d'état ici, l'appelant
  // applique le résultat après `await` (règle react-hooks/set-state-in-effect).
  const resolveSources = useCallback(async (): Promise<ResolvedSources> => {
    // 1. Si une URL directe a été transmise
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
      // 2. Appel de la route API /api/media-sources
      const res = await Api.getMediaSources(
        targetId,
        params.type === 'series' || params.type === 'anime' ? 'series' : 'movie',
        params.provider || 'FSTREAMTV',
        params.title || ''
      );

      if (res && res.sources && res.sources.length > 0) {
        // Corrige les URLs localhost renvoyées par l'API en URLs joignables
        const resolved = res.sources.map((s: MediaSourceItem) => ({
          ...s,
          url: resolveApiUrl(s.url),
        }));
        return { sources: resolved, activeUrl: resolved[0].url, error: null };
      }
    } catch {
      // Repli si l'API distante n'est pas encore redéployée
    }

    // 3. Repli : Extraction directe de l'iframe depuis la page HTML du site
    try {
      const baseUrl = getBaseApiUrl();
      const provider = params.provider || 'FSTREAMTV';
      const providerPath = provider === 'TMDB' ? 'tmdb' : provider === 'FRENCHSTREAM' ? 'partner' : 'fstreamtv';
      const typePath = params.type === 'series' || params.type === 'anime' ? 'series' : 'films';
      const typePathAnime = params.type === 'anime' ? 'animes' : typePath;
      const webPath = params.webPath || `/${typePathAnime}/${providerPath}/${targetId}`;
      const pageRes = await fetch(`${baseUrl}${webPath}`, {
        headers: { 'User-Agent': CHROME_USER_AGENT },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const extracted: MediaSourceItem[] = [];
        const seenUrls = new Set<string>();

        // Regex d'extraction des embeds
        const optionRegex = /data-url(?:-default)?="([^"]+)"/gi;
        let match: RegExpExecArray | null;
        while ((match = optionRegex.exec(html)) !== null) {
          const rawUrl = resolveApiUrl(match[1].trim());
          if (!seenUrls.has(rawUrl)) {
            seenUrls.add(rawUrl);
            let host = 'Serveur';
            try {
              host = new URL(rawUrl).hostname.replace(/^www\./, '').split('.')[0];
              host = host.charAt(0).toUpperCase() + host.slice(1);
            } catch {}
            extracted.push({
              host,
              label: host,
              lang: 'VF',
              season: 1,
              episode: 1,
              url: rawUrl,
            });
          }
        }

        // Si aucun bouton d'option, chercher la balise iframe brute
        if (extracted.length === 0) {
          const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
          if (iframeMatch && iframeMatch[1]) {
            const rawUrl = resolveApiUrl(iframeMatch[1].trim());
            extracted.push({
              host: 'Lecteur Principal',
              label: 'Lecteur Principal',
              lang: 'VF',
              season: 1,
              episode: 1,
              url: rawUrl,
            });
          }
        }

        if (extracted.length > 0) {
          return { sources: extracted, activeUrl: extracted[0].url, error: null };
        }
      }
    } catch (extractErr) {
      console.warn('Extraction repli échouée :', extractErr);
    }

    // 4. Dernier repli : URL Vidzy directe
    const isSeries = params.type === 'series' || params.type === 'anime';
    const fallbackUrl = isSeries
      ? `https://vidzy.org/serie/${targetId}/1/1?color=7c3aed`
      : `https://vidzy.org/movie/${targetId}?color=7c3aed`;

    return {
      sources: [
        {
          host: 'Vidzy',
          label: 'Vidzy',
          lang: 'VF',
          season: 1,
          episode: 1,
          url: fallbackUrl,
        },
      ],
      activeUrl: fallbackUrl,
      error: null,
    };
  }, [
    params.streamUrl,
    params.id,
    params.tmdbId,
    params.type,
    params.provider,
    params.title,
    params.webPath,
  ]);

  const applySources = useCallback((result: ResolvedSources) => {
    setSources(result.sources);
    setError(result.error);
    setActiveUrl(result.activeUrl);

    const first = result.sources[0];
    if (first) {
      setSelectedLang(first.lang || 'VF');
      setSelectedHost(first.host);
      setSelectedEpisode(first.episode || 1);
    }

    setLoading(false);
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setEmbedDoc(null);
    setReloadCount((count) => count + 1);
    void (async () => {
      applySources(await resolveSources());
    })();
  }, [applySources, resolveSources]);

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

  // Charge le HTML de l'embed côté app : c'est le seul moyen de maîtriser la
  // politique de référant du document (le CDN Vidzy rejette les requêtes dont
  // le Referer pointe vers notre domaine).
  useEffect(() => {
    const url = activeUrl;
    if (!url || isDirect || !isEmbedDocumentUrl(url)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    void (async () => {
      try {
        const res = await fetch(url, {
          headers: { Accept: 'text/html' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = withNoReferrerPolicy(await res.text());
        if (!cancelled) setEmbedDoc({ url, html });
      } catch (err) {
        console.warn('Lecteur embarqué indisponible, repli sur l’URL :', err);
        if (!cancelled) setEmbedDoc({ url, html: null });
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

  // Filtrage selon les choix de l'utilisateur
  const availableLangs = useMemo(() => {
    const langs = Array.from(new Set(sources.map((s) => s.lang)));
    return langs.length > 0 ? langs : ['VF'];
  }, [sources]);

  const langSources = useMemo(() => {
    const list = sources.filter((s) => s.lang === selectedLang);
    return list.length > 0 ? list : sources;
  }, [sources, selectedLang]);

  const episodes = useMemo(() => {
    const eps = Array.from(new Set(langSources.map((s) => s.episode || 1))).sort((a, b) => a - b);
    return eps;
  }, [langSources]);

  const episodeSources = useMemo(() => {
    return langSources.filter((s) => (s.episode || 1) === selectedEpisode);
  }, [langSources, selectedEpisode]);

  // Source du WebView : document HTML récupéré (sans Referer) pour nos embeds,
  // URL directe sinon. `null` = document en cours de récupération.
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

    const doc = embedDoc && embedDoc.url === activeUrl ? embedDoc : null;
    if (!doc) return null;
    return doc.html ? { html: doc.html, baseUrl: activeUrl } : { uri: activeUrl };
  }, [activeUrl, embedDoc]);

  const handleSelectLang = (lang: string) => {
    setSelectedLang(lang);
    const available = sources.filter((s) => s.lang === lang);
    if (available.length > 0) {
      setSelectedHost(available[0].host);
      setActiveUrl(available[0].url);
    }
  };

  const handleSelectHost = (source: MediaSourceItem) => {
    setSelectedHost(source.host);
    setActiveUrl(source.url);
  };

  const handleSelectEpisode = (ep: number) => {
    setSelectedEpisode(ep);
    const target = langSources.find((s) => (s.episode || 1) === ep);
    if (target) {
      setSelectedHost(target.host);
      setActiveUrl(target.url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barre de navigation supérieure */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}>
          <ArrowLeft color="#ffffff" size={22} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title || 'Lecture Vidéo'}
          </Text>
          {selectedHost ? (
            <Text style={styles.headerSub}>
              {selectedHost} • {selectedLang}
              {(params.type === 'series' || params.type === 'anime') ? ` • Ép. ${selectedEpisode}` : ''}
            </Text>
          ) : null}
        </View>
      </SafeAreaView>

      {/* Surface Vidéo (Natif direct ou Embed pur) */}
      <View style={styles.videoSurface}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#e50914" />
            <Text style={styles.loadingText}>Recherche des serveurs disponibles...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload}>
              <RefreshCw color="#ffffff" size={16} />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : activeUrl && isDirect ? (
          // Lecteur Expo Video 100% natif
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
            <Text style={styles.loadingText}>Chargement du lecteur...</Text>
          </View>
        ) : activeUrl && webViewSource ? (
          // Iframe pur du lecteur vidéo (Uqload, Vidzy, Voe, etc.)
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
                "Impossible de charger le lecteur vidéo. Vérifiez votre connexion puis réessayez."
              );
            }}
          />
        ) : null}
      </View>

      {/* Panneau de contrôle natif (Langues, Serveurs, Épisodes) */}
      <ScrollView style={styles.controlsScroll} showsVerticalScrollIndicator={false}>
        {/* 1. Choix de la Langue */}
        {availableLangs.length > 1 && (
          <View style={styles.controlSection}>
            <View style={styles.sectionHeader}>
              <Volume2 color="#a1a1aa" size={16} />
              <Text style={styles.sectionTitle}>Langue audio</Text>
            </View>
            <View style={styles.pillsRow}>
              {availableLangs.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.pill, selectedLang === lang && styles.activePill]}
                  onPress={() => handleSelectLang(lang)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.pillText,
                      selectedLang === lang && styles.activePillText,
                    ]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 2. Choix du Serveur / Hébergeur */}
        {episodeSources.length > 0 && (
          <View style={styles.controlSection}>
            <View style={styles.sectionHeader}>
              <Server color="#a1a1aa" size={16} />
              <Text style={styles.sectionTitle}>Changer de serveur</Text>
            </View>
            <View style={styles.pillsRow}>
              {episodeSources.map((source, index) => {
                const isActive = activeUrl === source.url;
                return (
                  <TouchableOpacity
                    key={`${source.host}-${index}`}
                    style={[styles.serverPill, isActive && styles.activeServerPill]}
                    onPress={() => handleSelectHost(source)}
                    activeOpacity={0.8}>
                    {isActive ? <Check color="#ffffff" size={14} /> : null}
                    <Text
                      style={[
                        styles.serverPillText,
                        isActive && styles.activeServerPillText,
                      ]}>
                      {source.label || source.host}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. Choix des Épisodes (pour les Séries) */}
        {(params.type === 'series' || params.type === 'anime') && episodes.length > 1 && (
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Épisodes</Text>
            <FlatList
              data={episodes}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(ep) => ep.toString()}
              contentContainerStyle={styles.episodesList}
              renderItem={({ item: ep }) => (
                <TouchableOpacity
                  style={[styles.epPill, selectedEpisode === ep && styles.activeEpPill]}
                  onPress={() => handleSelectEpisode(ep)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.epPillText,
                      selectedEpisode === ep && styles.activeEpPillText,
                    ]}>
                    Épisode {ep}
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
