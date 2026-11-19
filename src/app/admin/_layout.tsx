import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        router.replace('/(tabs)');
      }
    }, [user, router])
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" options={{ title: 'Admin' }} />
      <Stack.Screen name="users" options={{ title: 'Utilisateurs' }} />
      <Stack.Screen name="medias" options={{ title: 'Médias' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="reviews" options={{ title: 'Avis' }} />
      <Stack.Screen name="sync" options={{ title: 'Synchronisation' }} />
      <Stack.Screen name="provider-assets" options={{ title: 'Assets partenaires' }} />
    </Stack>
  );
}
