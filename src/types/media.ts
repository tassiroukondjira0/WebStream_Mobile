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
  role: 'USER' | 'SUBSCRIBER' | 'ADMIN' | 'SUPER_ADMIN';
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
