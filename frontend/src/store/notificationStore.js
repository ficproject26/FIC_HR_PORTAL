import { create } from 'zustand'
import api from '../utils/api'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await api.get('/notifications?limit=10')
      set({ notifications: res.data.data, unreadCount: res.data.unreadCount })
    } catch (e) {}
  },

  markRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (e) {}
  },

  markAllRead: async () => {
    try {
      await api.put('/notifications/read-all')
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }))
    } catch (e) {}
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 10),
      unreadCount: state.unreadCount + 1
    }))
  }
}))

export default useNotificationStore
