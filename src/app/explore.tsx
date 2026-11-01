import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { Api } from '@/services/api';
import { SearchResultItem } from '@/types/media';

function getTypeLabel(href: string): string {
  const first = href.split('/').filter(Boolean)[0] ?? '';
  if (first === 'series') return 'Série';
  if (first === 'animes') return 'Animé';
  return 'Film';
}

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await Api.search(text, 24);
      setResults(res.results || []);
    } catch (err) {
      console.error('Erreur recherche :', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  const handleSelect = (item: SearchResultItem) => {
    // Extraire les informations depuis l'href (ex: /films/tmdb/12345 ou /series/fstreamtv/black-torch)
    const parts = item.href.split('/').filter(Boolean);
    // Format attendu : [typePlural, provider, id]
    const typePlural = parts[0] ?? '';
    const provider = parts[1] ?? 'fstreamtv';
    const rawId = parts[2] ?? '';

    // Mapper le provider vers le format attendu par le player
    let providerNormalized = 'FSTREAMTV';
    if (provider === 'tmdb') providerNormalized = 'TMDB';
    else if (provider === 'partner') providerNormalized = 'FRENCHSTREAM';
    else if (provider === 'frenchmanga') providerNormalized = 'FRENCHMANGA';

    // Déterminer le type depuis l'href — l'API renvoie toujours type: "Catalogue",
    // le vrai type est dans le premier segment de l'URL (schéma identique à Web_Stream).
    const mediaType =
      typePlural === 'series' ? 'SERIES' :
      typePlural === 'animes' ? 'ANIME' :
      'MOVIE';

    router.push({
      pathname: '/media/[id]',
      params: {
        id: rawId,
        mediaData: JSON.stringify({
          id: rawId,
          externalId: rawId,
          title: item.title,
          posterUrl: item.posterUrl,
          type: mediaType,
          provider: providerNormalized,
        }),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Search color="#71717a" size={18} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher un film, série, animé..."
            placeholderTextColor="#71717a"
            value={query}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
              <X color="#71717a" size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e50914" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item, index) => `${item.href}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelect(item)}
              activeOpacity={0.8}>
              <View style={styles.posterWrapper}>
                <Image
                  source={{
                    uri:
                      item.posterUrl ||
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
                  }}
                  style={styles.poster}
                  contentFit="cover"
                />
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{getTypeLabel(item.href)}</Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : hasSearched ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noResultsTitle}>Aucun résultat trouvé</Text>
          <Text style={styles.noResultsSub}>
            Essayez avec un autre mot-clé ou vérifiez l&apos;orthographe.
          </Text>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Search color="#3f3f46" size={48} />
          <Text style={styles.placeholderText}>
            Trouvez vos films et séries préférés instantanément
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    flex: 1 / 3,
    margin: 4,
  },
  posterWrapper: {
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1f1f23',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  typeText: {
    color: '#e4e4e7',
    fontSize: 9,
    fontWeight: '700',
  },
  title: {
    color: '#d4d4d8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  noResultsSub: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});
