import * as SecureStore from 'expo-secure-store';
import {
  CatalogResponse,
  MediaItem,
  MediaSourcesResponse,
  SearchResultItem,
  User,
  VideoUrlResponse,
} from '@/types/media';

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
      title: title || slug,
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
    title: title || slug,
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

  // Recherche
  async search(query: string, limit: number = 20): Promise<{ results: SearchResultItem[] }> {
    const encoded = encodeURIComponent(query);
    return request<{ results: SearchResultItem[] }>(`/api/search?q=${encoded}&limit=${limit}`);
  },

  // Résolution d'URL Vidéo (Directe ou Embed)
  async getVideoUrl(tmdbId: string, type: 'movie' | 'series' = 'movie'): Promise<VideoUrlResponse> {
    return request<VideoUrlResponse>(`/api/video-url?tmdb=${tmdbId}&type=${type}`);
  },

  // Récupération des sources directes (Vidzy, Uqload, Voe, etc.)
  async getMediaSources(id: string, type: string = 'movie', provider: string = 'FSTREAMTV', title: string = ''): Promise<MediaSourcesResponse> {
    const encTitle = encodeURIComponent(title);
    return request<MediaSourcesResponse>(`/api/media-sources?id=${id}&type=${type}&provider=${provider}&title=${encTitle}`);
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

  async register(name: string, email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const data = await request<{ success: boolean; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data.token) {
      await setAuthToken(data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
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
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },
};
