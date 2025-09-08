import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { postsKeys } from './usePosts'

export const usePostsRealtime = () => {
  const queryClient = useQueryClient()
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  useEffect(() => {
    const debouncedInvalidate = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        // Invalidate all posts queries to refetch with new data
        queryClient.invalidateQueries({ queryKey: postsKeys.all })
      }, 500) // 500ms debounce
    }

    const channel = supabase
      .channel('posts:realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts',
          filter: 'is_published=eq.true'
        },
        (payload) => {
          console.log('New post detected:', payload)
          debouncedInvalidate()
        }
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'posts'
        },
        (payload) => {
          console.log('Post updated:', payload)
          debouncedInvalidate()
        }
      )
      .on('postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'posts'
        },
        (payload) => {
          console.log('Post deleted:', payload)
          debouncedInvalidate()
        }
      )
      .subscribe()
      
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}