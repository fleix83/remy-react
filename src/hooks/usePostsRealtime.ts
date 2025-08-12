import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useForumStore } from '../stores/forum.store'
import type { Post } from '../types/database.types'

export const usePostsRealtime = () => {
  const forumStore = useForumStore()
  
  useEffect(() => {
    const channel = supabase
      .channel('posts:realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'posts',
          filter: 'is_published=eq.true'
        },
        async (payload) => {
          const newPost = payload.new as Post
          
          // Only add if it matches current filters
          const { filters } = useForumStore.getState()
          
          let shouldAdd = true
          if (filters.category && newPost.category_id !== filters.category) {
            shouldAdd = false
          }
          
          if (shouldAdd) {
            // Fetch the complete post with relationships
            const { data: postWithRelations } = await supabase
              .from('posts')
              .select(`
                *,
                users!inner(id, username, avatar_url, role),
                categories!inner(id, name_de, name_fr, name_it),
                therapists(*)
              `)
              .eq('id', newPost.id)
              .single()
            
            if (postWithRelations) {
              // Add to beginning of posts
              const currentPosts = useForumStore.getState().posts
              useForumStore.setState({
                posts: [postWithRelations, ...currentPosts]
              })
            }
          }
        }
      )
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'posts'
        },
        async (payload) => {
          const updatedPost = payload.new as Post
          
          // Fetch updated post with relationships
          const { data: postWithRelations } = await supabase
            .from('posts')
            .select(`
              *,
              users!inner(id, username, avatar_url, role),
              categories!inner(id, name_de, name_fr, name_it),
              therapists(*)
            `)
            .eq('id', updatedPost.id)
            .single()
          
          if (postWithRelations) {
            forumStore.updatePost(updatedPost.id, postWithRelations)
          }
        }
      )
      .on('postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'posts'
        },
        (payload) => {
          const deletedPost = payload.old as Post
          forumStore.deletePost(deletedPost.id)
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [forumStore])
}