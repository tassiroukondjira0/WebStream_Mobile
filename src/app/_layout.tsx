import React, { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Masquer le splash screen une fois prêt
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider value={DarkTheme}>
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
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
