import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useCommentsStore } from '../stores/comments.store'
import { useAuthStore } from '../stores/auth.store'
import { isCommentRecentlyCreated, clearCommentFromCreated } from '../utils/comment-dedup'
import type { Comment } from '../types/database.types'

// Cache channels to prevent duplicate subscriptions
const commentChannels = new Map<number, any>()

export const useCommentsRealtime = (postId: number) => {
  const { updateComment, deleteComment, addComment } = useCommentsStore()
  const { user } = useAuthStore()
  const throttleTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // Only subscribe if user is authenticated and postId is valid
    if (!user || !postId) return

    // Use existing channel if available
    let channel = commentChannels.get(postId)

    if (!channel) {
      const throttledHandler = (handler: Function) => (payload: any) => {
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current)
        }

        throttleTimeoutRef.current = setTimeout(() => {
          handler(payload)
        }, 100) // 100ms throttle to prevent rapid-fire updates
      }

      channel = supabase
        .channel(`comments:post_${postId}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${postId}`
          },
          throttledHandler(async (payload: any) => {
            const newComment = payload.new as Comment

            // Check if this comment was recently created locally
            // If so, skip it to avoid duplicate (store already added it)
            if (isCommentRecentlyCreated(postId, newComment.id)) {
              clearCommentFromCreated(postId, newComment.id)
              return
            }

            // Fetch the complete comment with user data
            try {
              const { data: commentWithUser, error } = await supabase
                .from('comments')
                .select(`
                  *,
                  users!inner(id, username, avatar_url, role)
                `)
                .eq('id', newComment.id)
                .single()

              if (error) {
                console.error('Error fetching comment with user:', error)
                return
              }

              if (commentWithUser) {
                addComment(postId, commentWithUser as any)
              }
            } catch (error) {
              console.error('Error in comment INSERT handler:', error)
            }
          })
        )
        .on('postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'comments',
            filter: `post_id=eq.${postId}`
          },
          throttledHandler(async (payload: any) => {
            const updatedComment = payload.new as Comment

            // Comments start invisible ('pending' under RLS) and only reach
            // other clients once moderation approves them — as an UPDATE, not
            // an INSERT. If we don't have the comment yet, treat the approval
            // like a fresh insert; otherwise patch it in place.
            const tree = useCommentsStore.getState().comments[postId.toString()]
            const inTree = (list: any[] | undefined): boolean =>
              !!list?.some(c => c.id === updatedComment.id || inTree(c.replies))
            if (inTree(tree)) {
              updateComment(postId, updatedComment.id, updatedComment)
              return
            }
            if ((updatedComment as any).moderation_status !== 'approved') return
            if (isCommentRecentlyCreated(postId, updatedComment.id)) return
            try {
              const { data: commentWithUser, error } = await supabase
                .from('comments')
                .select(`
                  *,
                  users!inner(id, username, avatar_url, role)
                `)
                .eq('id', updatedComment.id)
                .single()
              if (!error && commentWithUser) {
                addComment(postId, commentWithUser as any)
              }
            } catch (error) {
              console.error('Error in comment UPDATE handler:', error)
            }
          })
        )
        .on('postgres_changes',
          { 
            event: 'DELETE', 
            schema: 'public', 
            table: 'comments',
            filter: `post_id=eq.${postId}`
          },
          throttledHandler((payload: any) => {
            const deletedComment = payload.old as Comment
            deleteComment(postId, deletedComment.id)
          })
        )
        .subscribe()
      
      commentChannels.set(postId, channel)
    }
      
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
      }
      
      // Only remove channel if this is the last subscriber for this post
      // In a real app, you'd track subscribers per post
      // For now, we'll keep channels alive for better performance
      // supabase.removeChannel(channel)
      // commentChannels.delete(postId)
    }
  }, [postId, user, addComment, updateComment, deleteComment])
}