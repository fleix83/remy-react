import { supabase } from '../lib/supabase'
import type { Comment, CommentWithRelations } from '../types/database.types'

export class CommentsService {
  // Get all comments for a post with user information
  async getComments(postId: number): Promise<CommentWithRelations[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users!inner(id, username, avatar_url, role)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      throw error
    }

    return data || []
  }

  // Get replies to a specific comment (not supported in current schema)
  async getReplies(_parentCommentId: number): Promise<CommentWithRelations[]> {
    // The current database schema doesn't support threaded comments
    // Return empty array for now
    console.log('⚠️ Threaded comments not supported in current schema')
    return []
  }

  // Create a new comment
  async createComment(commentData: {
    post_id: number
    content: string
  }): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Only use fields that exist in the actual database schema
    const insertData = {
      post_id: commentData.post_id,
      content: commentData.content,
      user_id: user.id
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([insertData])
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
        content
        // Note: updated_at doesn't exist in current schema
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

  // Delete a comment (hard delete - schema doesn't support soft delete)
  async deleteComment(commentId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('comments')
      .delete()
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

    if (error) {
      console.error('Error getting comment count:', error)
      throw error
    }

    return count || 0
  }
}