import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '@/types/media';
import { getBaseApiUrl } from '@/services/api';

const NOTIFICATIONS_KEY = '@cinemax_notifications';
const DEVICE_TOKEN_KEY = '@cinemax_device_token';

// Configurer le comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function loadNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveNotifications(notifications: AppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Erreur sauvegarde notifications:', e);
  }
}

/**
 * Demande les permissions et inscrit l'appareil pour recevoir des push notifications.
 * Retourne le token de l'appareil (EAS push token ou device push token).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Permission de notification refusée');
        return null;
      }

      // Sur Expo Go, on utilise devicePushToken ; sur un build, on utilise registerForPushNotificationsAsync
      try {
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '',
        });
        token = pushToken.data;
      } catch {
        // Fallback pour Expo Go sans projectId
        const pushToken = await Notifications.getDevicePushTokenAsync();
        token = pushToken.data;
      }

      await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token || '');
    } catch (e) {
      console.error('Erreur inscription push:', e);
    }
  } else {
    console.warn('Les notifications push nécessitent un appareil physique.');
  }

  return token;
}

export async function getDeviceToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Récupère la liste des notifications stockées localement. */
export async function getNotifications(): Promise<AppNotification[]> {
  return loadNotifications();
}

/** Ajoute une notification (appelée quand une push arrive ou via polling API). */
export async function addNotification(notification: Omit<AppNotification, 'id' | 'date' | 'read'>): Promise<void> {
  const notifications = await loadNotifications();
  const newNotif: AppNotification = {
    ...notification,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    date: new Date().toISOString(),
    read: false,
  };
  notifications.unshift(newNotif);
  await saveNotifications(notifications);
}

/** Marque une notification comme lue. */
export async function markAsRead(id: string): Promise<void> {
  const notifications = await loadNotifications();
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx >= 0) {
    notifications[idx].read = true;
    await saveNotifications(notifications);
  }
}

/** Marque toutes les notifications comme lues. */
export async function markAllAsRead(): Promise<void> {
  const notifications = await loadNotifications();
  notifications.forEach((n) => { n.read = true; });
  await saveNotifications(notifications);
}

/** Supprime une notification. */
export async function removeNotification(id: string): Promise<void> {
  const notifications = await loadNotifications();
  const filtered = notifications.filter((n) => n.id !== id);
  await saveNotifications(filtered);
}

/** Vide toutes les notifications. */
export async function clearAllNotifications(): Promise<void> {
  await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
}

/** Compte le nombre de notifications non lues. */
export async function getUnreadCount(): Promise<number> {
  const notifications = await loadNotifications();
  return notifications.filter((n) => !n.read).length;
}

/**
 * Envoie un token d'appareil au serveur pour qu'un admin puisse cibler cet appareil.
 * L'API doit exposer POST /api/notifications/register-device.
 */
export async function registerDeviceToken(token: string): Promise<void> {
  try {
    const baseUrl = getBaseApiUrl();
    await fetch(`${baseUrl}/api/notifications/register-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.warn('Impossible d\'enregistrer le token device sur le serveur:', e);
  }
}

/**
 * Récupère les notifications depuis le serveur (polling).
 * L'API doit exposer GET /api/notifications.
 */
export async function fetchServerNotifications(): Promise<AppNotification[]> {
  try {
    const baseUrl = getBaseApiUrl();
    const res = await fetch(`${baseUrl}/api/notifications`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const existing = await loadNotifications();
        const existingIds = new Set(existing.map((n) => n.id));
        const newOnes: AppNotification[] = data
          .filter((n: any) => !existingIds.has(n.id))
          .map((n: any) => ({
            id: n.id || Date.now().toString() + Math.random().toString(36).slice(2, 9),
            title: n.title || 'Annonce',
            body: n.body || n.message || '',
            date: n.date || new Date().toISOString(),
            read: false,
            data: n.data,
          }));
        if (newOnes.length > 0) {
          const allNotifs = [...newOnes, ...existing];
          await saveNotifications(allNotifs);
          return allNotifs;
        }
      }
    }
  } catch (e) {
    console.warn('Polling notifications serveur:', e);
  }
  return loadNotifications();
}
