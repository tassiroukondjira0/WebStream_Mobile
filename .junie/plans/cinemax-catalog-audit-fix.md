---
sessionId: session-261103-140142-1mjo
---

# Résultats de l'audit

### Architecture actuelle

**Chaîne de flux de données :**
```
API (/api/catalog) → Api.getCatalog() → Écrans d'onglets → MediaCard → /media/[id] → /player
```

**Fichiers clés :**
- `src/services/api.ts` — Client API, gestion des slugs, normalisation des favoris
- `src/types/media.ts` — Interface MediaItem avec id, externalId, slug, provider, type
- `src/app/(tabs)/films.tsx`, `series.tsx`, `animes.tsx` — Écrans du catalogue
- `src/components/MediaCard.tsx` — Navigation de la carte vers les détails
- `src/app/media/[id].tsx` — Page de détails, navigation vers le lecteur
- `src/app/player.tsx` — Lecteur vidéo avec contrôles saisons/épisodes
- `src/app/explore.tsx` — Résultats de recherche
- `src/app/favorites.tsx`, `wishlist.tsx` — Écrans favoris/liste de souhaits

### Problème 1 — Incohérence d'ID entre la page de détails et le lecteur

`media/[id].tsx` lignes 129-139 navigue vers le lecteur avec les paramètres `id`, `title`, `tmdbId`, `type`, `provider`, `webPath` — mais **ne transmet jamais `externalId`**. Le lecteur (lignes 98-101) résout `targetId` comme `params.externalId || params.id`. Lorsque le fournisseur n'est pas TMDB, l'`id` du catalogue peut ne pas correspondre à l'ID attendu par `Api.getMediaSources()`.

### Problème 2 — Type ANIME mappé sur "series" dans l'appel API du lecteur

Lecteur lignes 159-163 :
```ts
Api.getMediaSources(targetId, isSeries ? 'series' : 'movie', ...)
```
Où `isSeries = mediaType === 'series' || mediaType === 'anime'` (lignes 93-94).
Cela signifie que le contenu ANIME est envoyé comme type `series` à l'API, ce qui peut retourner de mauvaises sources si le backend distingue les animés des séries.

### Problème 3 — Pas de déduplication dans le chargement du catalogue

Les écrans d'onglets récupèrent plusieurs pages et distribuent les éléments par tranches d'index (`films.tsx` lignes 54-65). Aucune détection de doublons n'existe. Si l'API retourne le même élément sur plusieurs pages ou catégories, il apparaîtra plusieurs fois.

### Problème 4 — keyExtractor instable dans MediaRow

`MediaRow.tsx` ligne 24 :
```ts
keyExtractor={(item) => item.id || item.externalId || Math.random().toString()}
```
`Math.random()` provoque des problèmes de réconciliation React — les éléments peuvent se re-rendre de manière imprévisible.

### Problème 5 — Épisodes affichés horizontalement

`player.tsx` lignes 654-681 utilise `FlatList horizontal` pour les épisodes. L'utilisateur souhaite un affichage vertical.

### Problème 6 — Pas de cache local

Le catalogue est récupéré à chaque chargement. Aucun cache AsyncStorage ou SecureStore n'existe pour les éléments du catalogue. La tâche mentionne le cache mais le code n'en implémente pas encore.

### Problème 7 — Classification des catégories dépend entièrement de l'API

L'application mobile ne corrige ni ne valide le champ `type` de l'API. Si le backend classe un animé comme SERIES, l'application l'affiche tel quel. Aucun mécanisme de correction côté client n'existe.


# Conception technique

### Changements proposés

#### 1. Correction de la propagation des ID de la page de détails vers le lecteur (`media/[id].tsx`)

- Ajouter `externalId` aux paramètres du routeur lors de la navigation vers `/player`.
- S'assurer que `tmdbId` dans les paramètres correspond à `externalId` de l'élément média, et non uniquement à l'analyse du slug.
- Transmettre le bon `externalId` pour que `player.tsx` puisse résoudre correctement `targetId`.

#### 2. Correction du traitement du type ANIME dans le lecteur (`player.tsx`)

- Modifier l'appel `Api.getMediaSources()` pour transmettre `'anime'` comme type lorsque `mediaType === 'anime'`, au lieu de mapper sur `'series'`.
- Mettre à jour : `isSeries ? 'series' : 'movie'` → un mappage à trois voies : `anime` → `'anime'`, `series` → `'series'`, sinon → `'movie'`.

#### 3. Ajout d'un utilitaire de déduplication (`src/services/media.utils.ts`)

- Créer la fonction `deduplicateMediaItems(items: MediaItem[]): MediaItem[]`.
- Clé de déduplication : combiner `slug` (si disponible), sinon `provider + externalId + type + title`.
- Conserver l'entrée avec les données les plus complètes (posterUrl, synopsis, releaseYear, totalEpisodes).
- Appliquer la déduplication dans les écrans d'onglets après la récupération des données.

#### 4. Correction du keyExtractor de MediaRow (`MediaRow.tsx`)

- Remplacer la valeur par défaut `Math.random()` par un hachage stable : `${item.title}-${item.type}-${item.provider}`.
- Utiliser `slug` comme clé principale lorsqu'il est disponible.

#### 5. Refonte de l'interface du lecteur — saisons horizontales, épisodes verticaux (`player.tsx`)

- Saisons : conserver le défilement horizontal (déjà des pilules), améliorer le surbrillance visuelle.
- Épisodes : remplacer `FlatList horizontal` par un `ScrollView` vertical ou `FlatList` (non-horizontal).
- Chaque élément d'épisode affiche le numéro, le titre (si disponible depuis les sources), et l'état sélectionné.
- Supprimer `FlatList` pour les épisodes ; utiliser une `View` simple avec les éléments mappés à l'intérieur du `ScrollView` existant.

#### 6. Ajout d'une couche de cache du catalogue (`src/services/media.cache.ts`)

- Utiliser `@react-native-async-storage/async-storage` (déjà installé) pour mettre en cache les réponses du catalogue.
- Clé de cache : `catalog:${type}:${page}`.
- TTL du cache : 1 heure (configurable).
- À la récupération : retourner les données mises en cache si fraîches, sinon récupérer et mettre à jour le cache.
- Invalidation du cache : lors du tir pour rafraîchir, vider le cache pour le type concerné.

#### 7. Normalisation du type (`src/services/media.utils.ts`)

- Ajouter `normalizeMediaType(item: MediaItem): MediaItem` pour préserver le type de l'API sans transformation.
- S'assurer que `toMediaSlug()` dans `api.ts` gère correctement ANIME → 'anime' dans le slug (déjà fait, ligne 91).
- S'assurer que `mediaFromSlug()` analyse correctement le type 'anime' (déjà fait, ligne 127).

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/services/api.ts` | Aucune modification — couche API correcte |
| `src/services/media.utils.ts` | **Nouveau** — déduplication, normalisation du type, cache |
| `src/services/media.cache.ts` | **Nouveau** — couche de cache AsyncStorage |
| `src/app/media/[id].tsx` | Correction des paramètres de navigation vers le lecteur (ajout externalId) |
| `src/app/player.tsx` | Correction du type ANIME dans l'appel API, refonte de l'UI des épisodes |
| `src/components/MediaRow.tsx` | Correction du keyExtractor |
| `src/app/(tabs)/films.tsx` | Application de la déduplication |
| `src/app/(tabs)/series.tsx` | Application de la déduplication |
| `src/app/(tabs)/animes.tsx` | Application de la déduplication |
| `src/app/(tabs)/index.tsx` | Application de la déduplication |

### Diagramme d'architecture

``` mermaid
graph LR
  A[API /api/catalog] --> B[Api.getCatalog]
  B --> C[Couche de cache media.cache.ts]
  C --> D[Déduplication media.utils.ts]
  D --> E[Écrans d'onglets]
  E --> F[MediaCard]
  F --> G[media/[id].tsx]
  G --> H[player.tsx]
  H --> I[Api.getMediaSources]
  I --> A
```


# Étapes de livraison

### ✓ Step 1 : Création des modules utilitaires pour la déduplication, la normalisation du type et le cache
Ajouter deux nouveaux fichiers de service qui fournissent des utilitaires partagés pour le pipeline du catalogue.
- Créer `src/services/media.utils.ts` avec `deduplicateMediaItems()`, `normalizeMediaType()` et `getStableKey()`.
- Créer `src/services/media.cache.ts` avec un cache basé sur AsyncStorage (TTL 1h, invalidation par type).
- Ces utilitaires seront consommés par tous les écrans d'onglets et le flux détails/lecteur.

### ✓ Step 2 : Correction de la propagation des ID et du traitement du type ANIME dans la navigation du lecteur
Corriger le flux de données de la page de détails vers le lecteur afin que les bons identifiants et types atteignent l'API.
- **`src/app/media/[id].tsx`** : Ajouter `externalId` aux paramètres du routeur lors de la navigation vers `/player`. S'assurer que le paramètre `tmdbId` correspond directement à `media.externalId`.
- **`src/app/player.tsx`** : Changer le paramètre de type dans `Api.getMediaSources()` du binaire `isSeries ? 'series' : 'movie'` à un mappage à trois voies : `'anime'` → `'anime'`, `'series'` → `'series'`, par défaut → `'movie'`. Cela garantit que le contenu animé interroge l'API avec le bon type.
- Vérifier que la résolution de `targetId` utilise correctement `externalId` pour tous les types de fournisseurs.

### ✓ Step 3 : Refonte de l'interface du lecteur — saisons horizontales, épisodes verticaux
Restructurer la section de contrôles du lecteur dans `src/app/player.tsx`.
- **Saisons** : Conserver la disposition horizontale en pilules mais l'améliorer avec `ScrollView horizontal` pour un meilleur défilement lorsqu'il y a beaucoup de saisons. Améliorer la surbrillance visuelle de la saison sélectionnée.
- **Épisodes** : Remplacer le `FlatList` horizontal (lignes 654-681) par une liste verticale à l'intérieur du `ScrollView` existant. Chaque épisode affiche son numéro, son titre (si disponible depuis les données de source), et un indicateur d'état sélectionné.
- Mettre à jour les styles : supprimer la disposition horizontale `episodesList`, ajouter des styles de ligne d'épisode verticaux avec une surbrillance de sélection claire.
- S'assurer que la sélection d'épisode met à jour `selectedEpisode`, trouve la source correspondante et lit la vidéo correcte.

### ✓ Step 4 : Correction du keyExtractor de MediaRow et application de la déduplication dans les écrans d'onglets
Stabiliser le rendu du catalogue et éliminer les doublons.
- **`src/components/MediaRow.tsx`** : Remplacer `Math.random()` dans keyExtractor par `getStableKey(item)` depuis media.utils.ts. Utiliser `slug` comme clé principale lorsqu'il est disponible.
- **`src/app/(tabs)/films.tsx`** : Après `loadFilms()`, appeler `deduplicateMediaItems()` avant `distributeItems()`. Intégrer la couche de cache.
- **`src/app/(tabs)/series.tsx`** : Même déduplication + intégration du cache.
- **`src/app/(tabs)/animes.tsx`** : Même déduplication + intégration du cache.
- **`src/app/(tabs)/index.tsx`** : Appliquer la déduplication à `movieList`, `seriesList`, `animeList` après `loadData()`.
- Lors du tir pour rafraîchir, vider le cache pour le type concerné avant de récupérer à nouveau.

### ✓ Step 5 : Exécution du lint et du typecheck, vérification de l'absence de régression
Validation finale de toutes les modifications.
- Exécuter `npx expo lint` pour vérifier les problèmes de linting.
- Exécuter `npx tsc --noEmit` pour vérifier que la vérification TypeScript passe.
- Vérifier que tous les fichiers modifiés se compilent sans erreurs.
- Confirmer que le flux de navigation (MediaCard → détails → lecteur) transmet tous les paramètres requis.
- Confirmer que la déduplication ne supprime pas des éléments distincts légitimes avec des titres similaires.

### ✓ Step 6 : Correction des doublons dans les résultats de recherche
Éliminer les doublons dans `src/app/explore.tsx`.
- Ajouter une fonction de déduplication pour `SearchResultItem` basée sur `href` (chaque résultat unique a un `href` unique).
- Appliquer la déduplication après `Api.search()` avant d'afficher les résultats.
- Corriger le `keyExtractor` pour utiliser `item.href` seul sans l'index, car après déduplication chaque `href` est unique.

### ✓ Step 7 : Correction de la propagation des IDs depuis la recherche vers le lecteur
Corriger le flux de données quand l'utilisateur vient de la recherche.
- **`src/app/explore.tsx`** : Améliorer l'extraction des informations depuis `item.href`. Actuellement, seul `rawId` est utilisé comme `id` et `externalId`, mais le provider peut être mal normalisé. S'assurer que le provider extrait de l'`href` correspond exactement au format attendu par `Api.getMediaSources()`.
- Vérifier que le type extrait de l'`href` est correctement mappé (`series` → `SERIES`, `animes` → `ANIME`, sinon `MOVIE`).
- S'assurer que tous les paramètres nécessaires (`id`, `externalId`, `provider`, `type`, `title`) sont correctement transmis à `[id].tsx` puis au lecteur.

### ✓ Step 8 : Lint et typecheck final
- Exécuter `npx expo lint` et `npx tsc --noEmit` pour valider les corrections.

### ✓ Step 9 : Filtrage des animés mal classés comme séries
Retirer du catalogue et des résultats de recherche les animés typés comme séries qui ne fonctionnent pas.
- **`src/services/media.utils.ts`** : Ajouter `MISCLASSIFIED_ANIME_IDS` (liste configurable), `isNotMisclassifiedAnime()`, `filterMisclassifiedAnime()` et `filterSearchResultsForMisclassifiedAnime()`.
- **`src/app/(tabs)/series.tsx`** : Appliquer `filterMisclassifiedAnime()` après la déduplication dans `loadSeries()`.
- **`src/app/(tabs)/index.tsx`** : Appliquer `filterMisclassifiedAnime()` à `seriesList` après `loadData()`.
- **`src/app/explore.tsx`** : Ajouter `filterBrokenAnimeFromSearch()` pour retirer les résultats dont l'href indique "series" mais le type API indique "anime".
- **`src/app/favorites.tsx`** : Appliquer `filterMisclassifiedAnime()` après `Api.getBookmarks()`.
- **`src/app/wishlist.tsx`** : Appliquer `filterMisclassifiedAnime()` après `Api.getWishlist()`.
- **Lint et typecheck** : `npx expo lint` (0 erreur, 2 avertissements pré-existants) et `npx tsc --noEmit` passent sans erreur.

### ✓ Step 10 : Nettoyage — suppression des filtres côté client redondants avec le backend
Le backend Web_Stream gère déjà la déduplication (`isDuplicate: false`), la publication (`isPublished: true`), les sources (`hasSources: true`) et la reclassification ANIME/SERIES (`reclass.ts`). Les filtres côté client sont donc inutiles.
- **`src/services/media.utils.ts`** : Supprimer `MISCLASSIFIED_ANIME_IDS`, `isNotMisclassifiedAnime()`, `filterMisclassifiedAnime()` et `filterSearchResultsForMisclassifiedAnime()`. Ajouter un commentaire expliquant que le backend est la source de vérité.
- **`src/app/(tabs)/series.tsx`** : Retirer l'import et l'appel à `filterMisclassifiedAnime()`.
- **`src/app/(tabs)/index.tsx`** : Retirer l'import et l'appel à `filterMisclassifiedAnime()`.
- **`src/app/explore.tsx`** : Supprimer `filterBrokenAnimeFromSearch()` et son appel dans `handleSearch()`.
- **`src/app/favorites.tsx`** : Retirer l'import et l'appel à `filterMisclassifiedAnime()`.
- **`src/app/wishlist.tsx`** : Retirer l'import et l'appel à `filterMisclassifiedAnime()`.
- **Lint et typecheck** : `npx expo lint` (0 erreur) et `npx tsc --noEmit` passent sans erreur.

### ✓ Step 11 : Alignement de la recherche mobile sur le scénario Web_Stream
Le site web utilise `/api/search` qui retourne `{title, href, type, posterUrl}` et navigue directement vers l'href. Le backend dispose aussi de `/api/catalog/search` qui retourne des `MediaItem` complets (id, externalId, provider, type, etc.), identiques au catalogue. L'appli mobile doit utiliser cet endpoint pour obtenir les mêmes données complètes que le catalogue, éliminant la reconstruction fragile du MediaItem.
- **`src/services/api.ts`** : Ajouter `searchCatalog(query, limit)` qui appelle `/api/catalog/search` au lieu de `/api/search`. Retourner `{ items: MediaItem[] }` au lieu de `{ results: SearchResultItem[] }`.
- **`src/app/explore.tsx`** : Remplacer `Api.search()` par `Api.searchCatalog()`. Supprimer `handleSelect()` qui reconstruisait le MediaItem — utiliser directement les `MediaItem` retournés. Supprimer `deduplicateSearchResults()` et `getTypeLabel()` — utiliser `deduplicateMediaItems()` de media.utils.ts. Naviguer vers `[id].tsx` avec `mediaData` comme le catalogue.
- **Lint et typecheck** : `npx expo lint` et `npx tsc --noEmit` passent sans erreur.