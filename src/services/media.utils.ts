import { MediaItem } from '../types/media';

/**
 * Generate a stable key for React list reconciliation.
 * Priority: slug > id > composite hash of title + type + provider.
 */
export function getStableKey(item: MediaItem): string {
  if (item.slug) return `slug-${item.slug}`;
  if (item.id) return `id-${item.id}`;
  return `${item.title}-${item.type}-${item.provider}`;
}

/**
 * Score how complete a MediaItem is. Higher score = more data available.
 */
function completenessScore(item: MediaItem): number {
  let score = 0;
  if (item.posterUrl) score += 2;
  if (item.backdropUrl) score += 1;
  if (item.synopsis) score += 2;
  if (item.releaseYear) score += 1;
  if (item.totalEpisodes) score += 1;
  if (item.externalId) score += 1;
  if (item.slug) score += 1;
  return score;
}

/**
 * Deduplicate a list of MediaItem entries.
 *
 * Strategy:
 * 1. Group by a deduplication key (slug if available, otherwise provider + externalId + type + title).
 * 2. Within each group, keep the entry with the highest completeness score.
 * 3. Return the deduplicated array, preserving the first-seen order.
 */
export function deduplicateMediaItems(items: MediaItem[]): MediaItem[] {
  const seen = new Map<string, MediaItem>();

  for (const item of items) {
    // Build deduplication key
    let key: string;
    if (item.slug) {
      key = `slug-${item.slug}`;
    } else {
      const parts = [
        item.provider ?? '',
        item.externalId ?? '',
        item.type,
        item.title.toLowerCase().trim(),
      ];
      key = `composite-${parts.join('|')}`;
    }

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
    } else {
      // Keep the one with more complete data
      if (completenessScore(item) > completenessScore(existing)) {
        seen.set(key, item);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize the media type field.
 * Preserves the API type without transformation — the API is the source of truth.
 * This function exists as a hook for future client-side corrections if needed.
 */
export function normalizeMediaType(item: MediaItem): MediaItem {
  // For now, simply return the item as-is. The API type is trusted.
  // Future: add correction logic here if specific titles need reclassification.
  return item;
}

/**
 * Nettoie un titre d'affichage en supprimant les préfixes/suffixes de type
 * (Film, Série, Animé, Movie, Series, Anime…) et les marqueurs de saison/épisode
 * ou de qualité/langue (VF, VOSTFR, HD…).
 *
 * Exemples :
 *   "Film - Inception" → "Inception"
 *   "Série - Breaking Bad - Saison 1" → "Breaking Bad"
 *   "Animé - Naruto - Épisode 5" → "Naruto"
 *   "Inception - VF" → "Inception"
 *   null/undefined → ""
 */
export function cleanTitle(title: string | null | undefined): string {
  if (!title) return '';

  let cleaned = title.trim();

  // Préfixes de type : "Film - ", "Série - ", "Animé - ", "Movie: ", etc.
  cleaned = cleaned.replace(
    /^(film|movie|série|serie|sér|anime|animé)\s*[-:–—]\s*/i,
    ''
  );

  // Suffixes de saison : " - Saison 1", " - Saison 2", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*saison\s*\d+.*$/i, '');

  // Suffixes d'épisode : " - Épisode 5", " - Episode 5", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*épisode\s*\d+.*$/i, '');
  cleaned = cleaned.replace(/\s*[-–—]\s*episode\s*\d+.*$/i, '');

  // Suffixes de qualité / langue : " - VF", " - VOSTFR", " - HD", etc.
  cleaned = cleaned.replace(/\s*[-–—]\s*(vf|vostfr|hd|french|vo)\s*$/i, '');

  return cleaned.trim();
}

/**
 * Convertit un slug de favori en titre lisible quand le titleMap ne fournit pas de titre.
 * Exemple : "tmdb-movie-15139014" → "15139014" (fallback, mieux que le slug brut)
 */
export function slugToFallbackTitle(slug: string): string {
  const m = slug.match(/^(?:partner|frenchmanga|tmdb|fstreamtv)-(?:movie|series|anime)-(.+)$/i);
  if (m) {
    return m[1].replace(/[-_]/g, ' ').trim();
  }
  return slug;
}

/**
 * Note: The backend Web_Stream already filters the catalog at the database level:
 * - isPublished: true — only admin-published titles
 * - isDuplicate: false — duplicates marked by dedupe.ts (FRENCHSTREAM vs TMDB)
 * - hasSources: true — only titles with working video sources
 * - Anime/Series reclassification is handled by reclass.ts in the backend
 *
 * The mobile app trusts the API as the source of truth. No client-side filtering
 * is needed for misclassified anime — fix them in the backend via reclass.ts instead.
 */

