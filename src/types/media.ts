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

// ─── Admin API types ───

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'SUBSCRIBER' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
}

export interface AdminStatsResponse {
  success: boolean;
  totals: {
    totalUsers: number;
    premiumUsers: number;
    standardUsers: number;
    totalViews: number;
    monthViews: number;
    partnerTotal: number;
    partnerPublished: number;
  };
  viewsByMonth: { label: string; views: number }[];
  signupsByMonth: { label: string; signups: number }[];
  premiumSplit: { label: string; value: number }[];
}

export interface AdminMediaItem {
  id: string;
  title: string;
  type: 'MOVIE' | 'SERIES' | 'ANIME';
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
  durationMinutes: number | null;
  videoUrl: string | null;
  accessLevel: 'FREE' | 'PREMIUM';
  isPublished: boolean;
  categories: string[];
  episodeSources: { season: number; episode: number; videoUrl: string }[];
}

export interface AdminMediaListResponse {
  items: AdminMediaItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminReview {
  id: string;
  mediaSlug: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface AdminProviderAsset {
  id: string;
  provider: string;
  externalId: string;
  contentType: 'MOVIE' | 'SERIES' | 'ANIME';
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  isPublished: boolean;
  trendingRank: number | null;
}

export interface AdminProviderAssetListResponse {
  items: AdminProviderAsset[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminSyncRun {
  id: string;
  status: string;
  pagesFetched: number;
  assetsUpserted: number;
  assetsPruned: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AdminSyncState {
  success: boolean;
  assets: Record<string, number>;
  runs: AdminSyncRun[];
}

export interface AdminSyncReport {
  success: boolean;
  message: string;
  report: Record<string, unknown>;
}

export interface AdminNotificationPayload {
  title: string;
  message: string;
  link?: string | null;
  target: 'ALL' | 'SUBSCRIBERS' | 'MOBILE_APP';
  type: 'ANNONCE' | 'NOUVEAUTE';
}

export interface AdminNotificationResponse {
  success: boolean;
  count: number;
  pushSent: number;
  message: string;
}
