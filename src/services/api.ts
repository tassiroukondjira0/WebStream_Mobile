import * as SecureStore from 'expo-secure-store';
import {
  CatalogResponse,
  MediaItem,
  MediaPlaybackResponse,
  MediaSourcesResponse,
  SearchResultItem,
  User,
  VideoUrlResponse,
} from '@/types/media';
import { cleanTitle, slugToFallbackTitle } from '@/services/media.utils';

const TOKEN_KEY = 'cinemax_auth_token';

// URL par défaut si non configurée dans .env
const DEFAULT_API_URL = 'https://web-stream-mncx.onrender.com';

export function getBaseApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_API_URL;
}

const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(?=[/?#]|$)/i;

/**
 * L'API construit certaines URLs (ex: /api/embed?src=...) avec l'origine du
 * serveur web (`https://localhost:10000`) au lieu de l'URL publique. Sur un
 * appareil, `localhost` désigne le téléphone lui-même → ERR_CONNECTION_REFUSED.
 * On réécrit donc l'origine vers l'URL de l'API configurée.
 */
export function resolveApiUrl(rawUrl: string): string {
  const raw = (rawUrl || '').trim();
  if (!raw) return raw;

  const baseUrl = getBaseApiUrl();
  const baseOrigin = baseUrl.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i)?.[0] ?? baseUrl;
  const baseProtocol = baseOrigin.slice(0, baseOrigin.indexOf(':'));

  // Origine locale sans schéma (ex: localhost:10000/api/embed?src=...)
  const schemeLessLocal = raw.match(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(?=[/?#]|$)/i);
  if (schemeLessLocal) {
    return `${baseOrigin}${raw.slice(schemeLessLocal[0].length)}`;
  }

  // URL relative (ex: /api/embed?src=...) → on préfixe avec la base
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    if (raw.startsWith('//')) {
      return `${baseProtocol}:${raw}`;
    }
    return `${baseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }

  // Origine locale renvoyée par le serveur → on la remplace par celle de l'API
  if (LOCAL_ORIGIN_REGEX.test(raw)) {
    return raw.replace(LOCAL_ORIGIN_REGEX, baseOrigin);
  }

  return raw;
}

/**
 * Correspondance fournisseur → préfixe de slug côté serveur.
 * L'API web enregistre les favoris sous la forme `segment-type-externalId`
 * (ex. `tmdb-movie-15139014`), partagée entre le site et l'application.
 */
const PROVIDER_SLUG_SEGMENTS: Record<string, string> = {
  FRENCHSTREAM: 'partner',
  PARTNER: 'partner',
  FRENCHMANGA: 'frenchmanga',
  TMDB: 'tmdb',
  FSTREAMTV: 'fstreamtv',
};

const SLUG_SEGMENT_PROVIDERS: Record<string, string> = {
  partner: 'FRENCHSTREAM',
  frenchmanga: 'FRENCHMANGA',
  tmdb: 'TMDB',
  fstreamtv: 'FSTREAMTV',
};

const SLUG_REGEX = /^(partner|frenchmanga|tmdb|fstreamtv)-(movie|series|anime)-(.+)$/i;

/** Slug de favori/souhait correspondant à un média du catalogue. */
export function toMediaSlug(media: MediaItem): string {
  if (media.slug) return media.slug;

  const provider = (media.provider || 'FSTREAMTV').toUpperCase();
  const segment = PROVIDER_SLUG_SEGMENTS[provider] ?? provider.toLowerCase();
  const kind =
    media.type === 'SERIES' ? 'series' : media.type === 'ANIME' ? 'anime' : 'movie';
  return `${segment}-${kind}-${media.externalId || media.id}`;
}

/**
 * Reconstruit un `MediaItem` affichable à partir d'un slug renvoyé par
 * `/api/bookmarks` ou `/api/wishlist` (qui ne renvoie que slugs + maps).
 */
function mediaFromSlug(
  slug: string,
  posterMap: Record<string, string | null>,
  titleMap: Record<string, string>
): MediaItem {
  const match = slug.match(SLUG_REGEX);
  const title = titleMap[slug];
  const yearMatch = title?.match(/\b(19|20)\d{2}\b/);

  if (!match) {
    // Ancien format (slug local ou identifiant nu) : on reste affichable.
    // Un identifiant purement numérique est un ID TMDB (cf. site web).
    const legacyProvider = /^\d+$/.test(slug) ? 'TMDB' : 'FSTREAMTV';
    return {
      id: slug,
      externalId: slug,
      slug,
      provider: legacyProvider,
      type: 'MOVIE',
      title: cleanTitle(title) || slugToFallbackTitle(slug),
      posterUrl: posterMap[slug] ?? null,
      releaseYear: yearMatch ? Number(yearMatch[0]) : undefined,
    };
  }

  const [, segment, kind, externalId] = match;
  const normalized = segment.toLowerCase();
  const provider = SLUG_SEGMENT_PROVIDERS[normalized] ?? normalized.toUpperCase();
  const mediaType = kind.toLowerCase() === 'series' ? 'SERIES' : kind.toLowerCase() === 'anime' ? 'ANIME' : 'MOVIE';

  return {
    id: slug,
    externalId,
    slug,
    provider,
    type: mediaType,
    title: cleanTitle(title) || slugToFallbackTitle(slug),
    posterUrl: posterMap[slug] ?? null,
    releaseYear: yearMatch ? Number(yearMatch[0]) : undefined,
  };
}

interface FavoriteCollectionPayload {
  bookmarks?: unknown;
  wishlist?: unknown;
  posterMap?: Record<string, string | null>;
  titleMap?: Record<string, string>;
}

/**
 * Normalise la réponse serveur (`{ bookmarks: string[], posterMap, titleMap }`)
 * en `MediaItem[]`. Tolère aussi une réponse déjà sous forme d'objets.
 */
function normalizeFavoriteCollection(
  entries: unknown,
  posterMap: Record<string, string | null> = {},
  titleMap: Record<string, string> = {}
): MediaItem[] {
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry): MediaItem[] => {
    if (typeof entry === 'string' && entry.trim()) {
      return [mediaFromSlug(entry.trim(), posterMap, titleMap)];
    }
    if (entry && typeof entry === 'object' && typeof (entry as MediaItem).id === 'string') {
      return [entry as MediaItem];
    }
    return [];
  });
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.error('Error saving auth token:', e);
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('Error removing auth token:', e);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError: string | undefined;
    try {
      const json = JSON.parse(errorText);
      parsedError = json.error || json.message;
    } catch {
      // Réponse non JSON (page HTML 404, proxy…) : on évite d'afficher tout le document.
      const trimmed = errorText.trimStart();
      if (trimmed && !trimmed.startsWith('<')) {
        parsedError = errorText.slice(0, 300);
      }
    }
    throw new Error(parsedError || `HTTP ${response.status}`);
  }

  return response.json();
}

export const Api = {
  // Catalogue
  async getCatalog(type: 'MOVIE' | 'SERIES' | 'ANIME' = 'MOVIE', page: number = 1, limit: number = 20): Promise<CatalogResponse> {
    return request<CatalogResponse>(`/api/catalog?type=${type}&page=${page}&limit=${limit}`);
  },

  // Titres tendance — "À la une" (films + séries + animes, triés par popularité et date de sortie)
  async getTrending(limit: number = 30): Promise<MediaItem[]> {
    const data = await request<{ items: MediaItem[] }>(`/api/catalog/trending?limit=${limit}`);
    return data.items ?? [];
  },

  // Recherche — retourne SearchResultItem[] (format legacy, utilisé par le site web)
  async search(query: string, limit: number = 20): Promise<{ results: SearchResultItem[] }> {
    const encoded = encodeURIComponent(query);
    return request<{ results: SearchResultItem[] }>(`/api/search?q=${encoded}&limit=${limit}`);
  },

  // Recherche catalogue — retourne MediaItem[] complets (id, externalId, provider, type, etc.)
  // Identique au format /api/catalog, permet de naviguer directement vers [id].tsx sans reconstruction
  async searchCatalog(query: string, limit: number = 24): Promise<{ items: MediaItem[] }> {
    const encoded = encodeURIComponent(query);
    return request<{ items: MediaItem[] }>(`/api/catalog/search?q=${encoded}&limit=${limit}`);
  },

  // Résolution d'URL Vidéo (Directe ou Embed)
  async getVideoUrl(tmdbId: string, type: 'movie' | 'series' = 'movie'): Promise<VideoUrlResponse> {
    return request<VideoUrlResponse>(`/api/video-url?tmdb=${tmdbId}&type=${type}`);
  },

  // Récupération des sources directes (Vidzy, Uqload, Voe, etc.)
  async getMediaSources(
      id: string,
      type: string = 'movie',
      provider: string = 'FSTREAMTV',
      title: string = ''
  ): Promise<MediaSourcesResponse> {
    const params = new URLSearchParams({
      id,
      type,
      provider,
      title,
    });

    return request<MediaSourcesResponse>(
        `/api/media-sources?${params.toString()}`
    );
  },

  // Playback complet — données de lecture (Vidzy + partenaires + TMDB épisodes)
  async getMediaPlayback(params: {
    tmdbId: string;
    type: 'movie' | 'tv';
    title?: string;
    year?: number | null;
    season?: number | null;
  }): Promise<MediaPlaybackResponse> {
    const qs = new URLSearchParams({
      tmdbId: params.tmdbId,
      type: params.type,
    });
    if (params.title) qs.set('title', params.title);
    if (params.year) qs.set('year', String(params.year));
    if (params.season) qs.set('season', String(params.season));

    return request<MediaPlaybackResponse>(`/api/media-playback?${qs.toString()}`);
  },

  // Authentification
  async login(email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const data = await request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      await setAuthToken(data.token);
    }
    return data;
  },

  // Version brute du login qui retourne la réponse complète (pour détecter emailVerified: false)
  async loginRaw(email: string, password: string): Promise<any> {
    const baseUrl = getBaseApiUrl();
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok && data.token) {
      await setAuthToken(data.token);
    }
    return { ok: response.ok, status: response.status, ...data };
  },

  async register(name: string, email: string, password: string, country: string, phoneNumber: string): Promise<{ success: boolean; user: User; token: string }> {
    const data = await request<{ success: boolean; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, country, phoneNumber }),
    });
    if (data.token) {
      await setAuthToken(data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
    // Invalider le token côté serveur (ignorer les erreurs — on supprime localement de toute façon)
    try {
      await request<void>('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignorer — le token sera supprimé localement
    }
    await removeAuthToken();
  },

  // Favoris
  async getBookmarks(): Promise<{ bookmarks: MediaItem[] }> {
    const data = await request<FavoriteCollectionPayload>('/api/bookmarks');
    return {
      bookmarks: normalizeFavoriteCollection(
        data.bookmarks,
        data.posterMap || {},
        data.titleMap || {}
      ),
    };
  },

  async toggleBookmark(mediaSlug: string): Promise<{ success: boolean; isBookmarked?: boolean }> {
    return request<{ success: boolean; isBookmarked?: boolean }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ mediaSlug }),
    });
  },

  // Liste de souhaits (Wishlist)
  async getWishlist(): Promise<{ wishlist: MediaItem[] }> {
    const data = await request<FavoriteCollectionPayload>('/api/wishlist');
    return {
      wishlist: normalizeFavoriteCollection(
        data.wishlist,
        data.posterMap || {},
        data.titleMap || {}
      ),
    };
  },

  async toggleWishlist(mediaSlug: string): Promise<{ success: boolean; inWishlist?: boolean }> {
    return request<{ success: boolean; inWishlist?: boolean }>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify({ mediaSlug }),
    });
  },

  // Historique de visionnage
  async getHistory(): Promise<{ history: any[] }> {
    return request<{ history: any[] }>('/api/history');
  },

  // Modification du mot de passe
  // Le backend attend: currentPassword, newPassword, confirmPassword
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword,
        confirmPassword: newPassword,
      }),
    });
  },

  // Récupération du synopsis depuis TMDB par titre
  async getMediaOverview(title: string): Promise<{ overview: string | null }> {
    const encoded = encodeURIComponent(title);
    return request<{ overview: string | null }>(`/api/media-overview?title=${encoded}`);
  },

  // Vérification email
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/verify', {
      method: 'PUT',
      body: JSON.stringify({ email }),
    });
  },

  // Réinitialisation du mot de passe
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  // Vérifier s'il y a un nouveau build disponible (endpoint public, pas d'auth requise)
  async checkLatestBuild(): Promise<{
    hasNewBuild: boolean;
    latestBuild: { type: 'eas' | 'local'; buildDate: string; downloadUrl: string; size?: number } | null;
  }> {
    const baseUrl = getBaseApiUrl();
    const response = await fetch(`${baseUrl}/api/latest-build`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { hasNewBuild: false, latestBuild: null };
    }
    return response.json();
  },

  // Réveiller le serveur Render (endpoint public, pas d'auth requise)
  // Retourne true si le serveur répond, false après épuisement des retries
  // Utilise /api/catalog car /api/health n'est pas implémenté côté serveur
  async wakeServer(maxRetries: number = 5): Promise<boolean> {
    const baseUrl = getBaseApiUrl();
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(`${baseUrl}/api/catalog?type=MOVIE&page=1&limit=1`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) return true;
      } catch {
        // Serveur encore en veille ou indisponible — on retry
      }
      // Délai exponentiel : 3s, 6s, 9s, 12s, 15s
      await new Promise((resolve) => setTimeout(resolve, 3000 * (i + 1)));
    }
    return false;
  },
};
