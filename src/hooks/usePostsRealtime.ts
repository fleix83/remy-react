import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { postsKeys } from './usePosts'
import { useAuthStore } from '../stores/auth.store'

// Global channel reference to prevent multiple subscriptions
let globalPostsChannel: any = null
let subscriberCount = 0

export const usePostsRealtime = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const debouncedInvalidate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      // Only invalidate if the user is still authenticated and on a posts page
      const currentPath = window.location.pathname
      if (user && (currentPath === '/' || currentPath.includes('/post/'))) {
        queryClient.invalidateQueries({ queryKey: postsKeys.all })
      }
    }, 1000) // Increased debounce to 1s to reduce API calls
  }, [queryClient, user])
  
  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!user) return
    
    subscriberCount++
    
    // Create global channel only if it doesn't exist
    if (!globalPostsChannel) {
      const currentUserId = user.id
      // Skip self-originated events: the mutation already updated the cache
      // locally, so a follow-up refetch is pure waste.
      const isSelfWrite = (payload: { new?: { user_id?: string } }) =>
        payload?.new?.user_id === currentUserId

      globalPostsChannel = supabase
        .channel('posts:global')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'posts',
            filter: 'is_published=eq.true,is_active=eq.true,is_banned=eq.false'
          },
          (payload) => {
            if (isSelfWrite(payload)) return
            console.log('New post detected:', payload)
            debouncedInvalidate()
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: 'is_published=eq.true,is_active=eq.true'
          },
          (payload) => {
            if (isSelfWrite(payload)) return
            console.log('Post updated:', payload)
            debouncedInvalidate()
          }
        )
        .subscribe()
    }
      
    return () => {
      subscriberCount--
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Only remove channel when no more subscribers
      if (subscriberCount === 0 && globalPostsChannel) {
        supabase.removeChannel(globalPostsChannel)
        globalPostsChannel = null
      }
    }
  }, [user, debouncedInvalidate])
}