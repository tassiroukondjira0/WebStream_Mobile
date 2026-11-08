import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  Film,
  ListVideo,
  Play,
  Tv,
} from 'lucide-react-native';
import {
  MediaItem,
  MediaSourceItem,
  PlaybackEpisode,
} from '@/types/media';
import { Api, getBaseApiUrl, resolveApiUrl, toMediaSlug } from '@/services/api';
import { cleanTitle } from '@/services/media.utils';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/theme';

const { width } = Dimensions.get('window');
const VIDZY_HOST = 'vidzy-org';

/** Formatte un libellé de langue. */
function formatLangLabel(lang: string): string {
  const norm = (lang ?? '').trim().toLowerCase();
  if (norm === 'vf') return 'VF';
  if (norm === 'vostfr') return 'VOSTFR';
  if (norm === 'vo') return 'VO';
  return lang.toUpperCase();
}

/** Extraire tmdbId et provider depuis un MediaItem. */
function extractTmdbInfo(media: MediaItem): { tmdbId: string; provider: string } {
  let tmdbId = media.externalId || media.id;
  let provider = media.provider || 'FSTREAMTV';
  if (media.slug) {
    const slugMatch = media.slug.match(
      /^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/i,
    );
    if (slugMatch) {
      const [, segment, , externalId] = slugMatch;
      tmdbId = externalId;
      const segmentToProvider: Record<string, string> = {
        partner: 'FRENCHSTREAM',
        frenchmanga: 'FRENCHMANGA',
        tmdb: 'TMDB',
        fstreamtv: 'FSTREAMTV',
      };
      provider = segmentToProvider[segment.toLowerCase()] ?? provider;
    }
  }
  return { tmdbId, provider };
}


export default function MediaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; mediaData?: string }>();

  let media: MediaItem | null = null;
  if (params.mediaData) {
    try {
      media = JSON.parse(params.mediaData);
    } catch {
      media = null;
    }
  }

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const bookmarkSlug = media ? toMediaSlug(media) : '';

  // ─── Sources state (même logique que player.tsx) ───
  const [sources, setSources] = useState<MediaSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  // Sélecteurs de lecture
  const [selectedLang, setSelectedLang] = useState<string>('VF');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  // État des menus déroulants
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [seasonMenuOpen, setSeasonMenuOpen] = useState(false);
  const [episodeMenuOpen, setEpisodeMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);

  // ─── Détails TMDB des épisodes (optionnel, pour la liste) ───
  const [tmdbEpisodes, setTmdbEpisodes] = useState<PlaybackEpisode[]>([]);

  // ─── Bookmarks ───
  useEffect(() => {
    if (!isAuthenticated || !bookmarkSlug) return;

    let cancelled = false;
    (async () => {
      try {
        const { bookmarks } = await Api.getBookmarks();
        if (!cancelled) {
          setIsBookmarked(bookmarks.some((item) => item.slug === bookmarkSlug));
        }
      } catch {
        // Silencieux
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, bookmarkSlug]);

  // Fallback vers le lecteur dédié
  const handleFallbackPlay = useCallback(() => {
    if (!media) return;
    const { tmdbId, provider } = extractTmdbInfo(media);
    const isSeries = media.type === 'SERIES';
    const isAnime = media.type === 'ANIME';

    let webPath: string;
    if (isAnime) {
      const p = provider === 'FRENCHSTREAM' ? 'partner' : provider.toLowerCase();
      webPath = `/animes/${p}/${tmdbId}`;
    } else if (provider === 'TMDB') {
      webPath = isSeries ? `/series/tmdb/${tmdbId}` : `/films/tmdb/${tmdbId}`;
    } else if (provider === 'PARTNER' || provider === 'FRENCHSTREAM') {
      webPath = isSeries ? `/series/partner/${tmdbId}` : `/films/partner/${tmdbId}`;
    } else {
      webPath = isSeries ? `/series/fstreamtv/${tmdbId}` : `/films/fstreamtv/${tmdbId}`;
    }

    const fallbackExternalId = provider === 'TMDB' ? tmdbId : media.externalId || media.id;

    router.push({
      pathname: '/player',
      params: {
        id: media.id,
        title: media.title,
        tmdbId: provider === 'TMDB' ? tmdbId : undefined,
        externalId: fallbackExternalId,
        type: isSeries ? 'series' : isAnime ? 'anime' : 'movie',
        provider,
        webPath,
      },
    });
  }, [media, router]);

  // ─── Charge les sources (même logique que player.tsx) ───
  const resolveSources = useCallback(async () => {
    if (!media) return { sources: [] as MediaSourceItem[], activeUrl: null, error: null };

    const { tmdbId, provider } = extractTmdbInfo(media);
    const targetId = provider === 'TMDB' ? tmdbId : media.id;
    const apiType =
      media.type === 'ANIME' ? 'anime' : media.type === 'SERIES' ? 'series' : 'movie';

    try {
      const res = await Api.getMediaSources(
        targetId,
        apiType,
        provider,
        cleanTitle(media.title),
      );

      if (res?.sources?.length) {
        const resolved = res.sources
          .filter((s) => typeof s.url === 'string' && s.url.trim().length > 0)
          .map((s) => ({
            ...s,
            url: resolveApiUrl(s.url),
            season: Number(s.season) || 1,
            episode: Number(s.episode) || 1,
          }));

        if (resolved.length > 0) {
          return { sources: resolved, activeUrl: resolved[0].url, error: null };
        }
      }

      return {
        sources: [],
        activeUrl: null,
        error: 'Aucune source vidéo disponible.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[MediaDetail] Sources API failed:', message);
      return {
        sources: [],
        activeUrl: null,
        error: 'Impossible de récupérer les sources vidéo.',
      };
    }
  }, [media]);

  const applySources = useCallback((result: { sources: MediaSourceItem[]; activeUrl: string | null; error: string | null }) => {
    setSources(result.sources);
    setSourcesError(result.error);
    setActiveUrl(result.activeUrl);

    const first = result.sources[0];
    if (first) {
      setSelectedLang(first.lang || 'VF');
      setSelectedSeason(first.season || 1);
      setSelectedEpisode(first.episode || 1);
    }

    setSourcesLoading(false);
  }, []);

  useEffect(() => {
    if (!media) return;

    let cancelled = false;
    (async () => {
      const timeoutMs = 45_000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs),
      );

      try {
        const result = await Promise.race([resolveSources(), timeout]);
        if (!cancelled) {
          if (result.sources.length === 0 && result.error) {
            handleFallbackPlay();
          } else {
            applySources(result);
          }
        }
      } catch {
        if (!cancelled) handleFallbackPlay();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [media, resolveSources, applySources, handleFallbackPlay]);

  // ─── Charge les détails TMDB des épisodes (optionnel) ───
  useEffect(() => {
    if (!media || (media.type !== 'SERIES' && media.type !== 'ANIME')) return;

    const { tmdbId } = extractTmdbInfo(media);
    const type = media.type === 'ANIME' ? 'tv' : 'tv';

    let cancelled = false;
    (async () => {
      try {
        const data = await Api.getMediaPlayback({
          tmdbId,
          type,
          title: cleanTitle(media.title),
          year: media.releaseYear ?? null,
        });
        if (!cancelled && data?.episodes?.length) {
          setTmdbEpisodes(data.episodes);
        }
      } catch {
        // Silencieux — la liste d'épisodes fonctionne sans les détails TMDB
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [media]);

  // ─── Langues disponibles ───
  const availableLangs = useMemo(() => {
    const langs = Array.from(new Set(sources.map((s) => s.lang || 'VF')));
    return langs.length > 0 ? langs : ['VF'];
  }, [sources]);

  // ─── Sources de la langue sélectionnée ───
  const langSources = useMemo(() => {
    const list = sources.filter((s) => (s.lang || 'VF') === selectedLang);
    return list.length > 0 ? list : sources;
  }, [sources, selectedLang]);

  // ─── Saisons disponibles ───
  const availableSeasons = useMemo(() => {
    return Array.from(new Set(langSources.map((s) => Number(s.season) || 1))).sort((a, b) => a - b);
  }, [langSources]);

  // ─── Sources de la saison sélectionnée ───
  const seasonSources = useMemo(() => {
    return langSources.filter((s) => (Number(s.season) || 1) === selectedSeason);
  }, [langSources, selectedSeason]);

  // ─── Épisodes disponibles ───
  const availableEpisodes = useMemo(() => {
    return Array.from(new Set(seasonSources.map((s) => Number(s.episode) || 1))).sort((a, b) => a - b);
  }, [seasonSources]);

  // Épisode effectif : reste sur selectedEpisode tant qu'il est disponible,
  // sinon bascule sur le premier épisode de la saison.
  const effectiveEpisode =
    availableEpisodes.includes(selectedEpisode) ? selectedEpisode : availableEpisodes[0] ?? 1;

  // ─── Sources de l'épisode sélectionné ───
  const episodeSources = useMemo(() => {
    return seasonSources.filter((s) => (Number(s.episode) || 1) === effectiveEpisode);
  }, [seasonSources, effectiveEpisode]);

  // Source active : privilégie Vidzy, sinon la première
  const activeSource = useMemo(() => {
    const vidzy = episodeSources.find((s) => s.host === VIDZY_HOST);
    return vidzy ?? episodeSources[0] ?? null;
  }, [episodeSources]);

  // Trouver les détails TMDB pour un épisode donné
  const getEpisodeDetails = useCallback(
    (epNum: number): PlaybackEpisode | undefined => {
      return tmdbEpisodes.find((e) => e.episode_number === epNum);
    },
    [tmdbEpisodes],
  );

  // ─── Actions ───
  const handleToggleBookmark = async () => {
    if (!media) return;

    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter ce titre à vos favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Connexion', onPress: () => router.push('/profile') },
      ]);
      return;
    }

    if (bookmarkLoading) return;

    try {
      setBookmarkLoading(true);
      const result = await Api.toggleBookmark(bookmarkSlug);
      setIsBookmarked(result.isBookmarked ?? !isBookmarked);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', 'Impossible de mettre à jour les favoris : ' + message);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleSelectSource = (source: MediaSourceItem) => {
    setActiveUrl(source.url);
    setSourceMenuOpen(false);
  };

  const handleSelectLang = (lang: string) => {
    setSelectedLang(lang);
    const available = sources.filter((s) => (s.lang || 'VF') === lang);
    if (available.length > 0) {
      const target = available[0];
      setSelectedSeason(Number(target.season) || 1);
      setSelectedEpisode(Number(target.episode) || 1);
      setActiveUrl(target.url);
    }
    setLangMenuOpen(false);
  };

  const handleSelectSeason = (season: number) => {
    setSelectedSeason(season);
    const target = langSources.find((s) => (Number(s.season) || 1) === season);
    if (target) {
      setSelectedEpisode(Number(target.episode) || 1);
      setActiveUrl(target.url);
    }
    setSeasonMenuOpen(false);
  };

  const handleSelectEpisode = (ep: number) => {
    setSelectedEpisode(ep);
    const target = seasonSources.find((s) => (Number(s.episode) || 1) === ep);
    if (target) {
      setActiveUrl(target.url);
    }
    setEpisodeMenuOpen(false);
  };


  if (!media) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Média introuvable.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const posterUri =
    media.posterUrl ||
    media.backdropUrl ||
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800';

  const displayTitle = cleanTitle(media.title);
  const displayYear = media.releaseYear;
  const displayTotalEpisodes = media.totalEpisodes;
  const displayOverview = media.synopsis;
  const isSeries = media.type === 'SERIES' || media.type === 'ANIME';

  return (
    <View style={styles.container}>
      {/* Background Backdrop Image */}
      <View style={styles.backdropContainer}>
        <Image source={{ uri: posterUri }} style={styles.backdrop} contentFit="cover" />
        <View style={styles.gradientOverlay} />
      </View>

      {/* Top Floating Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}>
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleToggleBookmark}
          disabled={bookmarkLoading}
          activeOpacity={0.8}>
          {isBookmarked ? (
            <Check color="#22c55e" size={20} />
          ) : (
            <Bookmark color="#ffffff" size={20} />
          )}
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.spacer} />

        <View style={styles.detailsBody}>
          {/* Badge & Title */}
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {media.type === 'SERIES' ? 'SÉRIE' : media.type === 'ANIME' ? 'ANIMÉ' : 'FILM'}
              </Text>
            </View>
            {displayYear ? (
              <Text style={styles.yearText}>{displayYear}</Text>
            ) : null}
            {displayTotalEpisodes ? (
              <Text style={styles.episodesText}>{displayTotalEpisodes} épisodes</Text>
            ) : null}
          </View>

          <Text style={styles.title}>{displayTitle}</Text>

          {/* ─── Lecteur intégré ─── */}
          {sourcesLoading ? (
            <View style={styles.playerLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.playerLoadingText}>Chargement du lecteur…</Text>
            </View>
          ) : sourcesError ? (
            <View style={styles.playerError}>
              <Film color={colors.textTertiary} size={32} />
              <Text style={styles.playerErrorText}>Lecteur indisponible</Text>
              <TouchableOpacity
                style={styles.fallbackBtn}
                onPress={handleFallbackPlay}
                activeOpacity={0.8}>
                <Play fill="#ffffff" color="#ffffff" size={16} />
                <Text style={styles.fallbackBtnText}>Ouvrir le lecteur alternatif</Text>
              </TouchableOpacity>
            </View>
          ) : activeUrl ? (
            <>
              {/* WebView du lecteur */}
              <View style={styles.playerContainer}>
                <WebView
                  key={activeUrl}
                  source={{
                    uri: activeUrl,
                    headers: {
                      Referer: getBaseApiUrl(),
                      Origin: getBaseApiUrl(),
                    },
                  }}
                  style={styles.webview}
                  originWhitelist={['*']}
                  allowsFullscreenVideo
                  javaScriptEnabled
                  domStorageEnabled
                  mixedContentMode="always"
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  allowsBackForwardNavigationGestures
                />
              </View>

              {/* ─── Contrôles de lecture ─── */}
              <View style={styles.controlsSection}>
                <Text style={styles.controlsTitle}>Contrôles de lecture</Text>

                {/* Langue */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>Langue</Text>
                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => setLangMenuOpen(!langMenuOpen)}
                    activeOpacity={0.7}>
                    <Text style={styles.controlBtnText}>{formatLangLabel(selectedLang)}</Text>
                    <ChevronDown color={colors.textSecondary} size={16} />
                  </TouchableOpacity>
                  {langMenuOpen && (
                    <View style={styles.dropdown}>
                      {availableLangs.map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.dropdownItem,
                            lang.toLowerCase() === selectedLang.toLowerCase() &&
                              styles.dropdownItemActive,
                          ]}
                          onPress={() => handleSelectLang(lang)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              lang.toLowerCase() === selectedLang.toLowerCase() &&
                                styles.dropdownItemTextActive,
                            ]}>
                            {formatLangLabel(lang)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Saison (séries uniquement) */}
                {isSeries && availableSeasons.length > 1 && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Saison</Text>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => setSeasonMenuOpen(!seasonMenuOpen)}
                      activeOpacity={0.7}>
                      <Text style={styles.controlBtnText}>S{selectedSeason}</Text>
                      <ChevronDown color={colors.textSecondary} size={16} />
                    </TouchableOpacity>
                    {seasonMenuOpen && (
                      <View style={styles.dropdown}>
                        {availableSeasons.map((s) => (
                          <TouchableOpacity
                            key={s}
                            style={[
                              styles.dropdownItem,
                              s === selectedSeason && styles.dropdownItemActive,
                            ]}
                            onPress={() => handleSelectSeason(s)}
                            activeOpacity={0.7}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                s === selectedSeason && styles.dropdownItemTextActive,
                              ]}>
                              Saison {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Épisode (séries et animés uniquement) */}
                {isSeries && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Épisode</Text>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => setEpisodeMenuOpen(!episodeMenuOpen)}
                      activeOpacity={0.7}>
                      <Text style={styles.controlBtnText}>E{effectiveEpisode}</Text>
                      <ChevronDown color={colors.textSecondary} size={16} />
                    </TouchableOpacity>
                    {episodeMenuOpen && (
                      <ScrollView style={styles.dropdown} nestedScrollEnabled>
                        {availableEpisodes.map((ep) => {
                          const details = getEpisodeDetails(ep);
                          return (
                            <TouchableOpacity
                              key={ep}
                              style={[
                                styles.dropdownItem,
                                ep === effectiveEpisode && styles.dropdownItemActive,
                              ]}
                              onPress={() => handleSelectEpisode(ep)}
                              activeOpacity={0.7}>
                              <View style={styles.dropdownEpisodeRow}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    ep === effectiveEpisode && styles.dropdownItemTextActive,
                                  ]}>
                                  Épisode {ep}
                                </Text>
                                {details?.name && (
                                  <Text style={styles.dropdownEpName} numberOfLines={1}>
                                    {details.name}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Source / Lecteur */}
                {episodeSources.length > 1 && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Lecteur</Text>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => setSourceMenuOpen(!sourceMenuOpen)}
                      activeOpacity={0.7}>
                      <Text style={styles.controlBtnText} numberOfLines={1}>
                        {activeSource?.label ?? '—'}
                      </Text>
                      <ChevronDown color={colors.textSecondary} size={16} />
                    </TouchableOpacity>
                    {sourceMenuOpen && (
                      <View style={styles.dropdown}>
                        {episodeSources.map((src, idx) => {
                          const isActive = activeUrl === src.url;
                          return (
                            <TouchableOpacity
                              key={`${src.host}-${idx}`}
                              style={[
                                styles.dropdownItem,
                                isActive && styles.dropdownItemActive,
                              ]}
                              onPress={() => handleSelectSource(src)}
                              activeOpacity={0.7}>
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  isActive && styles.dropdownItemTextActive,
                                ]}>
                                {src.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* ─── Liste des épisodes (séries uniquement) ─── */}
              {isSeries && tmdbEpisodes.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <ListVideo color={colors.primary} size={20} />
                    <Text style={styles.sectionHeading}>
                      Épisodes — Saison {selectedSeason}
                    </Text>
                  </View>
                  {tmdbEpisodes.map((ep) => {
                    const isActive = ep.episode_number === effectiveEpisode;
                    return (
                      <TouchableOpacity
                        key={ep.episode_number}
                        style={[styles.episodeItem, isActive && styles.episodeItemActive]}
                        onPress={() => handleSelectEpisode(ep.episode_number)}
                        activeOpacity={0.7}>
                        <View
                          style={[
                            styles.episodeThumb,
                            isActive && styles.episodeThumbActive,
                          ]}>
                          {ep.still_path ? (
                            <Image
                              source={{ uri: `https://image.tmdb.org/t/p/w154${ep.still_path}` }}
                              style={styles.episodeThumbImg}
                              contentFit="cover"
                            />
                          ) : (
                            <Tv color={colors.textTertiary} size={20} />
                          )}
                          {isActive && (
                            <View style={styles.episodePlayingOverlay}>
                              <Play fill="#ffffff" color="#ffffff" size={12} />
                            </View>
                          )}
                        </View>
                        <View style={styles.episodeInfo}>
                          <Text style={styles.episodeTitle}>
                            <Text style={styles.episodeNum}>Épisode {ep.episode_number}</Text>
                            {ep.name ? ` — ${ep.name}` : ''}
                          </Text>
                          {ep.overview && (
                            <Text style={styles.episodeOverview} numberOfLines={2}>
                              {ep.overview}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            /* Aucune source disponible */
            <View style={styles.unavailableContainer}>
              <Film color={colors.textTertiary} size={48} />
              <Text style={styles.unavailableTitle}>Flux indisponible</Text>
              <Text style={styles.unavailableText}>
                Ce titre n&#39;est pas disponible pour le moment. Nos sources sont régulièrement mises à
                jour.
              </Text>
              <TouchableOpacity
                style={styles.fallbackBtn}
                onPress={handleFallbackPlay}
                activeOpacity={0.8}>
                <Play fill="#ffffff" color="#ffffff" size={16} />
                <Text style={styles.fallbackBtnText}>Essayer le lecteur alternatif</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Synopsis */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Synopsis</Text>
            <Text style={styles.synopsisText}>
              {displayOverview ||
                "Plongez dans l'univers de ce titre disponible en streaming haute définition sur CinéMax."}
            </Text>
          </View>

          {/* Informations */}
          {sources.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Informations</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Langues :</Text>
                <Text style={styles.infoValue}>
                  {availableLangs.map(formatLangLabel).join(' / ')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sources :</Text>
                <Text style={styles.infoValue}>{sources.length} disponible(s)</Text>
              </View>
            </View>
          )}
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
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: 380,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  spacer: {
    height: 240,
  },
  detailsBody: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    minHeight: 500,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  yearText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  episodesText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  synopsisText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Lecteur ───
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  webview: {
    width: '100%',
    height: '100%',
  },
  playerLoading: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  playerLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  playerError: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    padding: 24,
  },
  playerErrorText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  fallbackBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  unavailableContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    padding: 24,
  },
  unavailableTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  unavailableText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Contrôles ───
  controlsSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlsTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  controlRow: {
    marginBottom: 10,
  },
  controlLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  controlBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dropdown: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'scroll',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  dropdownItemText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropdownEpisodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  dropdownEpName: {
    color: colors.textTertiary,
    fontSize: 12,
    flex: 1,
  },

  // ─── Liste d'épisodes ───
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  episodeItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  episodeThumb: {
    width: 100,
    height: 56,
    borderRadius: 6,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  episodeThumbActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  episodeThumbImg: {
    width: '100%',
    height: '100%',
  },
  episodePlayingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    minWidth: 0,
  },
  episodeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  episodeNum: {
    color: colors.primary,
  },
  episodeOverview: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 16,
  },
});
