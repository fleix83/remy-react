import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCommentsStore } from '../stores/comments.store'
import type { Comment } from '../types/database.types'

export const useCommentsRealtime = (postId: number) => {
  const { addComment, updateComment, deleteComment } = useCommentsStore()
  
  useEffect(() => {
    const channel = supabase
      .channel(`comments:post_id=eq.${postId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          const newComment = payload.new as Comment
          
          // Fetch the complete comment with user data
          const { data: commentWithUser } = await supabase
            .from('comments')
            .select(`
              *,
              users!inner(id, username, avatar_url, role)
            `)
            .eq('id', newComment.id)
            .single()
          
          if (commentWithUser) {
            addComment(postId, commentWithUser)
          }
        }
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          const updatedComment = payload.new as Comment
          updateComment(postId, updatedComment.id, updatedComment)
        }
      )
      .on('postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          const deletedComment = payload.old as Comment
          deleteComment(postId, deletedComment.id)
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, addComment, updateComment, deleteComment])
}