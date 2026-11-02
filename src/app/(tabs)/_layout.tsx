import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Film, Tv, User, MonitorPlay } from 'lucide-react-native';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e50914',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: '#09090b',
          borderTopColor: '#27272a',
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="films"
        options={{
          title: 'Films',
          tabBarLabel: 'Films',
          tabBarIcon: ({ color, size }) => (
            <Film color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: 'Séries',
          tabBarLabel: 'Séries',
          tabBarIcon: ({ color, size }) => (
            <Tv color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="animes"
        options={{
          title: 'Animés',
          tabBarLabel: 'Animés',
          tabBarIcon: ({ color, size }) => (
            <MonitorPlay color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
