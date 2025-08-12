import { useEffect } from 'react'
import { useAuthStore } from '../stores/auth.store'
import { useNotificationsStore } from '../stores/notifications.store'

export const useNotificationsRealtime = () => {
  const { user } = useAuthStore()
  const { subscribeToRealtime } = useNotificationsStore()
  
  useEffect(() => {
    if (!user) return
    
    // Subscribe to real-time notifications
    const unsubscribe = subscribeToRealtime(user.id)
    
    return unsubscribe
  }, [user?.id, subscribeToRealtime])
}