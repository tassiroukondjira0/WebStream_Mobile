# 📱 CinéMax Mobile (React Native & Expo)

Application mobile native de streaming vidéo pour CinéMax, connectée à l'API Next.js.

---

## 🚀 Démarrage rapide

### 1. Prérequis
Installez l'application **Expo Go** sur votre smartphone :
- [Expo Go sur Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [Expo Go sur iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)

### 2. Configuration de l'API
Le fichier `.env` est déjà configuré :
```env
EXPO_PUBLIC_API_URL=https://web-stream-mncx.onrender.com
```
> Si vous testez avec votre serveur local Next.js :
> - Sur **Android Emulator** : `http://10.0.2.2:3000`
> - Sur **Téléphone physique** : `http://<IP-DE-VOTRE-PC>:3000` (ex: `http://192.168.1.50:3000`)

### 3. Lancer l'application
Dans ce dossier :
```bash
npm start
```
1. Un **QR code** s'affiche dans votre terminal.
2. Ouvrez l'application **Expo Go** sur votre téléphone et scannez le QR code.
3. L'application se charge instantanément sur votre mobile !

---

## 📂 Structure du projet

- `src/app/` : Écrans et navigation (Expo Router)
  - `index.tsx` : Accueil avec carrousels Films, Séries, Animés
  - `explore.tsx` : Recherche instantanée
  - `media/[id].tsx` : Fiche détaillée (synopsis, affiche, bouton lecture)
  - `player.tsx` : Lecteur vidéo (natif `expo-video` pour HLS/MP4 + repli WebView pour iframes)
  - `login.tsx` : Connexion et profil utilisateur
- `src/services/api.ts` : Client HTTP connecté aux routes Next.js avec jeton Bearer
- `src/context/AuthContext.tsx` : Gestion de la session et stockage sécurisé (SecureStore)
- `src/components/` : Composants réutilisables (`MediaCard`, `MediaRow`, etc.)
