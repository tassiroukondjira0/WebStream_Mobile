import { MediaItem, SearchResultItem } from '../types/media';

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
 * Known anime titles/IDs that are misclassified as SERIES by the API.
 * These items should be excluded from the SERIES catalog to avoid broken content.
 * Populate this set with the externalId or title (lowercased) of misclassified anime.
 */
const MISCLASSIFIED_ANIME_IDS = new Set<string>([
  // Add externalId values of anime that appear in SERIES catalog
  // Example: '12345', 'anime-title-slug', etc.
]);

/**
 * Check if a SERIES item is actually a misclassified anime that should be filtered out.
 * Returns true if the item should be kept, false if it should be removed.
 */
export function isNotMisclassifiedAnime(item: MediaItem): boolean {
  if (item.type !== 'SERIES') return true;

  // Check by externalId
  if (item.externalId && MISCLASSIFIED_ANIME_IDS.has(item.externalId.toLowerCase())) {
    return false;
  }
  // Check by id
  if (item.id && MISCLASSIFIED_ANIME_IDS.has(item.id.toLowerCase())) {
    return false;
  }
  // Check by title (lowercased)
  if (item.title && MISCLASSIFIED_ANIME_IDS.has(item.title.toLowerCase().trim())) {
    return false;
  }

  return true;
}

/**
 * Filter out anime misclassified as SERIES from a catalog list.
 * Use this after deduplication, before displaying the SERIES catalog.
 */
export function filterMisclassifiedAnime(items: MediaItem[]): MediaItem[] {
  return items.filter(isNotMisclassifiedAnime);
}

/**
 * Filter search results to exclude anime that are misclassified as SERIES.
 * If a search result has type 'anime' but the API catalog classifies it as SERIES,
 * it will be excluded from SERIES results but kept in ANIME results.
 */
export function filterSearchResultsForMisclassifiedAnime(
  items: SearchResultItem[],
  catalogType: 'MOVIE' | 'SERIES' | 'ANIME'
): SearchResultItem[] {
  // For SERIES search results, exclude items that are actually anime
  if (catalogType === 'SERIES') {
    return items.filter(item => {
      const itemType = (item.type || '').toLowerCase();
      // If the search API says it's an anime, exclude it from SERIES results
      return itemType !== 'anime';
    });
  }
  return items;
}

