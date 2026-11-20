import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppNotification } from '@/types/media';
import * as Notifications from 'expo-notifications';
import {
  getNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  getUnreadCount,
  registerForPushNotificationsAsync,
  registerDeviceToken,
  fetchServerNotifications,
} from '@/services/notification.service';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  handleMarkAsRead: (id: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  handleRemoveNotification: (id: string) => Promise<void>;
  handleClearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadNotifications = useCallback(async () => {
    const [notifs, count] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ]);
    setNotifications(notifs);
    setUnreadCount(count);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const notifs = await fetchServerNotifications();
    const count = await getUnreadCount();
    setNotifications(notifs);
    setUnreadCount(count);
  }, []);

  const initialLoad = useRef(true);

  // Charger les notifications au démarrage + récupérer la dernière notification tapée
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      (async () => {
        // Récupère la dernière notification sur laquelle l'utilisateur a appuyé
        // (cas où l'app était fermée et l'utilisateur a tapé une notification)
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse?.notification) {
          const { title, body, data } = lastResponse.notification.request.content;
          await addNotification({
            title: title || 'Annonce CinéMax',
            body: body || '',
            data: data as Record<string, string> | undefined,
          });
        }
        // Rafraîchir depuis le serveur pour synchroniser les notifications
        await fetchServerNotifications();
        await loadNotifications();
      })();
    }
  }, [loadNotifications]);

  // S'inscrire aux push notifications au démarrage
  useEffect(() => {
    let subscribed = true;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (subscribed && token) {
        await registerDeviceToken(token);
      }
    })();
    return () => {
      subscribed = false;
    };
  }, []);

  // Écouter les notifications push entrantes (app en premier plan)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      addNotification({
        title: title || 'Annonce CinéMax',
        body: body || '',
        data: data as Record<string, string> | undefined,
      });
      loadNotifications();
    });

    // Écouter quand l'utilisateur appuie sur une notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;
      // Ajouter la notification si elle n'existe pas déjà (cas arrière-plan)
      addNotification({
        title: title || 'Annonce CinéMax',
        body: body || '',
        data: data as Record<string, string> | undefined,
      });
      // Marquer comme lue
      const notifId = response.notification.request.identifier;
      markAsRead(notifId);
      loadNotifications();
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead(id);
    await loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    await loadNotifications();
  }, [loadNotifications]);

  const handleRemoveNotification = useCallback(async (id: string) => {
    await removeNotification(id);
    await loadNotifications();
  }, [loadNotifications]);

  const handleClearAll = useCallback(async () => {
    await clearAllNotifications();
    await loadNotifications();
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        handleMarkAsRead,
        handleMarkAllAsRead,
        handleRemoveNotification,
        handleClearAll,
      }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
