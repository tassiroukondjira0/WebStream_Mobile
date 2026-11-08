export interface MediaItem {
  id: string;
  externalId?: string;
  /** Slug serveur (`tmdb-movie-15139014`) — renseigné pour les listes favorites. */
  slug?: string;
  provider?: string;
  type: 'MOVIE' | 'SERIES' | 'ANIME';
  title: string;
  releaseYear?: number;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  synopsis?: string | null;
  totalEpisodes?: number;
  categorySlug?: string | null;
  language?: string | null;
  theme?: string | null;
  /** Rang de popularité du fournisseur (1 = plus tendance). */
  trendingRank?: number | null;
}

export interface CatalogPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CatalogResponse {
  type: 'MOVIE' | 'SERIES' | 'ANIME';
  items: MediaItem[];
  pagination: CatalogPagination;
}

export interface SearchResultItem {
  title: string;
  href: string;
  type: string;
  posterUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  country: string | null;
  phoneNumber: string | null;
  role: 'USER' | 'SUBSCRIBER' | 'ADMIN' | 'SUPER_ADMIN';
  emailVerified: boolean;
}

export interface VideoUrlResponse {
  videoUrl?: string;
  type?: 'direct' | 'embed';
  error?: string;
}

export interface MediaSourceItem {
  host: string;
  label: string;
  lang: string;
  season: number;
  episode: number;
  url: string;
}

export interface MediaSourcesResponse {
  title: string;
  contentType: string;
  sources: MediaSourceItem[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  data?: Record<string, string>;
}

// ─── Playback API (media-playback endpoint) ───

export interface PlaybackEpisode {
  episode_number: number;
  season_number?: number;
  name: string;
  overview?: string | null;
  air_date?: string | null;
  still_path?: string | null;
  runtime?: number | null;
}

export interface PlaybackSeason {
  season: number;
  episodes: number[];
}

export interface PlaybackSource {
  host: string;
  label: string;
  lang: string;
  season: number;
  episode: number;
  url: string;
}

export interface MediaPlaybackResponse {
  title: string;
  posterUrl: string | null;
  year: number | null;
  overview: string | null;
  totalEpisodes: number;
  mediaType: 'movie' | 'tv';
  sources: PlaybackSource[];
  languages: string[];
  seasons: PlaybackSeason[];
  episodes: PlaybackEpisode[];
}
