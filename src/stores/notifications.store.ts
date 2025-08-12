import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Notification, NotificationType } from '../types/database.types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  
  // Actions
  loadNotifications: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Notification) => void
  deleteNotification: (id: number) => Promise<void>
  subscribeToRealtime: (userId: string) => () => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  loadNotifications: async () => {
    try {
      set({ loading: true })
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      const unreadCount = data?.filter(n => !n.is_read).length || 0
      
      set({ 
        notifications: data || [],
        unreadCount 
      })
    } catch (error) {
      console.error('Error loading notifications:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  markAsRead: async (id: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      
      if (error) throw error
      
      set(state => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  },

  markAllAsRead: async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)
      
      if (error) throw error
      
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  },

  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1
    }))
  },

  deleteNotification: async (id: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      set(state => {
        const notification = state.notifications.find(n => n.id === id)
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: notification && !notification.is_read 
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount
        }
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  },

  subscribeToRealtime: (userId: string) => {
    const channel = supabase
      .channel(`notifications:user_id=eq.${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification
          get().addNotification(notification)
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico'
            })
          }
        }
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification
          set(state => ({
            notifications: state.notifications.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          }))
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel)
    }
  }
}))

// Helper function to create notifications
export const createNotification = async (notificationData: {
  user_id: string
  type: NotificationType
  title: string
  message: string
  related_post_id?: number
  related_comment_id?: number
}) => {
  const { error } = await supabase
    .from('notifications')
    .insert([notificationData])
  
  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

// Helper function to request notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return Notification.permission === 'granted'
}