import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Trash2 } from 'lucide-react-native';
import { useNotifications } from '@/context/NotificationContext';
import { AppNotification } from '@/types/media';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleRemoveNotification,
    handleClearAll,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Marquer toutes comme lues quand on ouvre la page
    if (unreadCount > 0) {
      handleMarkAllAsRead();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const onClearAll = () => {
    Alert.alert('Vider les notifications', 'Supprimer toutes les notifications ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => handleClearAll(),
      },
    ]);
  };

  const handleRemove = (id: string) => {
    handleRemoveNotification(id);
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadItem]}
      onPress={() => handleMarkAsRead(item.id)}
      activeOpacity={0.7}>
      <View style={styles.notifIcon}>
        <Bell color={item.read ? '#71717a' : '#e50914'} size={20} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, item.read && styles.readTitle]}>
          {item.title}
        </Text>
        <Text style={[styles.notifBody, item.read && styles.readBody]} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.notifDate}>{formatDate(item.date)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={(e) => {
          e.stopPropagation();
          handleRemove(item.id);
        }}
        activeOpacity={0.7}>
        <Trash2 color="#71717a" size={16} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={onClearAll} activeOpacity={0.7}>
            <Text style={styles.clearAllText}>Tout vider</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell color="#3f3f46" size={48} />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySub}>
            Les annonces et mises à jour de CinéMax apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e50914" />
          }
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  unreadItem: {
    backgroundColor: '#18181b',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  readTitle: {
    color: '#a1a1aa',
  },
  notifBody: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  readBody: {
    color: '#71717a',
  },
  notifDate: {
    color: '#52525b',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#52525b',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#3f3f46',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
