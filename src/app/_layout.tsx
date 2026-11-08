import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Api } from '@/services/api';

const LAST_BUILD_DATE_KEY = '@cinemax_last_build_date';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Masquer le splash screen une fois prêt
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Vérifier s'il y a un nouveau build disponible au démarrage
  useEffect(() => {
    let cancelled = false;
    const checkForNewBuild = async () => {
      try {
        const lastKnownDate = await AsyncStorage.getItem(LAST_BUILD_DATE_KEY);
        const result = await Api.checkLatestBuild();

        if (cancelled) return;

        if (result.hasNewBuild && result.latestBuild) {
          // Si c'est la première fois ou si la date a changé → nouveau build
          if (lastKnownDate !== result.latestBuild.buildDate) {
            Alert.alert(
              'Mise à jour disponible',
              'Une nouvelle mise à jour est disponible.',
              [
                {
                  text: 'Plus tard',
                  style: 'cancel',
                },
                {
                  text: 'Télécharger',
                  onPress: () => {
                    AsyncStorage.setItem(LAST_BUILD_DATE_KEY, result.latestBuild!.buildDate);
                    router.push('/download');
                  },
                },
              ]
            );
          } else {
            // L'utilisateur a déjà vu cette notification
          }
        }

        // Si c'est la première ouverture et qu'aucun build n'est connu, stocker la date
        if (!lastKnownDate && result.hasNewBuild && result.latestBuild) {
          await AsyncStorage.setItem(LAST_BUILD_DATE_KEY, result.latestBuild.buildDate);
        }
      } catch (e) {
        console.warn('Erreur vérification nouveau build:', e);
      }
    };

    // Délai de 2 secondes pour ne pas bloquer le démarrage
    const timeout = setTimeout(checkForNewBuild, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider value={DarkTheme}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#09090b' },
              animation: 'slide_from_right',
            }}>
            {/* Tabs group — bottom tab navigation */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* Non-tab screens */}
            <Stack.Screen name="explore" />
            <Stack.Screen name="media/[id]" />
            <Stack.Screen
              name="player"
              options={{
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="login"
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="favorites"
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="wishlist"
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="change-password"
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen name="download" />
          </Stack>
          </SafeAreaProvider>
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
