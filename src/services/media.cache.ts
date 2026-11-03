import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogResponse } from '../types/media';
import { Api } from './api';

const CACHE_PREFIX = 'catalog:';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: CatalogResponse;
  timestamp: number;
}

function cacheKey(type: 'MOVIE' | 'SERIES' | 'ANIME', page: number): string {
  return `${CACHE_PREFIX}${type}:${page}`;
}

/**
 * Retrieve catalog data, using cache if fresh.
 * Falls through to the API if the cache entry is stale or missing.
 */
export async function getCatalogCached(
  type: 'MOVIE' | 'SERIES' | 'ANIME' = 'MOVIE',
  page: number = 1,
  limit: number = 20
): Promise<CatalogResponse> {
  const key = cacheKey(type, page);

  // Try cache first
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;
      if (age < CACHE_TTL_MS) {
        return entry.data;
      }
    }
  } catch (e) {
    console.warn('Catalog cache read failed:', e);
  }

  // Fetch from API
  const response = await Api.getCatalog(type, page, limit);

  // Store in cache
  try {
    const entry: CacheEntry = { data: response, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Catalog cache write failed:', e);
  }

  return response;
}

/**
 * Clear cached entries for a specific type.
 * Used on pull-to-refresh to force re-fetch.
 */
export async function clearCacheForType(type: 'MOVIE' | 'SERIES' | 'ANIME'): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter((k) => k.startsWith(`${CACHE_PREFIX}${type}:`));
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch (e) {
    console.warn('Catalog cache clear failed:', e);
  }
}

/**
 * Clear all catalog cache entries.
 */
export async function clearAllCatalogCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
  } catch (e) {
    console.warn('Catalog cache clear all failed:', e);
  }
}
