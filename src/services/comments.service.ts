import { supabase } from '../lib/supabase'
import type { Comment, CommentWithRelations } from '../types/database.types'

export class CommentsService {
  // Get all comments for a post with user information
  async getComments(postId: number): Promise<CommentWithRelations[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users!inner(id, username, avatar_url, role),
        replies:comments!parent_comment_id(
          *,
          users!inner(id, username, avatar_url, role)
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .eq('is_active', true)
      .eq('is_banned', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      throw error
    }

    return data || []
  }

  // Get replies to a specific comment
  async getReplies(parentCommentId: number): Promise<CommentWithRelations[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users!inner(id, username, avatar_url, role)
      `)
      .eq('parent_comment_id', parentCommentId)
      .eq('is_active', true)
      .eq('is_banned', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching replies:', error)
      throw error
    }

    return data || []
  }

  // Create a new comment
  async createComment(commentData: {
    post_id: number
    content: string
    parent_comment_id?: number
    quoted_text?: string
  }): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        ...commentData,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      throw error
    }

    return data
  }

  // Update a comment
  async updateComment(commentId: number, content: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('comments')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id) // Ensure user owns the comment
      .select()
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      throw error
    }

    return data
  }

  // Delete a comment (soft delete)
  async deleteComment(commentId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('comments')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id) // Ensure user owns the comment

    if (error) {
      console.error('Error deleting comment:', error)
      throw error
    }
  }

  // Get comment count for a post
  async getCommentCount(postId: number): Promise<number> {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_active', true)
      .eq('is_banned', false)

    if (error) {
      console.error('Error getting comment count:', error)
      throw error
    }

    return count || 0
  }
}