import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('API failed');
      }

      const data = await response.json();
      const notifications = Array.isArray(data?.notifications) ? data.notifications : Array.isArray(data) ? data : [];
      const unreadCount = notifications.filter((n: Notification) => !n.read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch {
      set({ notifications: [], unreadCount: 0, isLoading: false });
    }
  },

  markRead: async (id: string) => {
    // Optionally make a patch request to API
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Ignore API failure for client-side state update
    }

    const { notifications } = get();
    const updated = notifications.map(n => {
      if (n.id === id && !n.read) {
        return { ...n, read: true };
      }
      return n;
    });

    const unreadCount = updated.filter(n => !n.read).length;
    set({ notifications: updated, unreadCount });
  },

  markAllRead: async () => {
    try {
      await fetch('/api/notifications/read', { method: 'PATCH' });
    } catch {
      // Ignore API failure for client-side state update
    }

    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  addNotification: (notification: Notification) => {
    const { notifications } = get();
    const updated = [notification, ...notifications];
    const unreadCount = updated.filter(n => !n.read).length;
    set({ notifications: updated, unreadCount });
  },
}));
