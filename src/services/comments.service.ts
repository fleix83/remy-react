import { supabase } from '../lib/supabase'
import { withPerformanceTracking } from '../utils/performance-monitor'
import type { Comment, CommentWithRelations } from '../types/database.types'

export class CommentsService {
  // Get all comments for a post with user information
  getComments = withPerformanceTracking(
    async (postId: number): Promise<CommentWithRelations[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, post_id,
          users!comments_user_id_fkey(id, username, avatar_url, role)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        throw error
      }

      // Normalize the user relationship from array to object
      return (data || []).map(comment => ({
        ...comment,
        users: Array.isArray(comment.users) ? comment.users[0] : comment.users
      })) as unknown as CommentWithRelations[]
    }, 'comments.getComments'
  )

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

    // Fire-and-forget: a failed notification must never block the comment
    this.notifyPostAuthor(data).catch(err =>
      console.warn('Could not create post-answered notification:', err)
    )

    return data
  }

  // "Post answered" notification for the post author (skipped when the
  // author comments on their own post)
  private async notifyPostAuthor(comment: Comment): Promise<void> {
    if (!comment.user_id || !comment.post_id) return

    const [{ data: post }, { data: commenter }] = await Promise.all([
      supabase.from('posts').select('user_id, title').eq('id', comment.post_id).single(),
      supabase.from('users').select('username').eq('id', comment.user_id).single()
    ])

    if (!post || post.user_id === comment.user_id) return

    const postRef = post.title?.trim() ? `deinen Beitrag «${post.title}»` : 'deinen Beitrag'
    const { error } = await (supabase.from('notifications' as any) as any).insert([{
      user_id: post.user_id,
      type: 'post_comment',
      title: 'Neue Antwort',
      message: `${commenter?.username ?? 'Jemand'} hat auf ${postRef} geantwortet`,
      related_post_id: comment.post_id,
      related_comment_id: comment.id,
      is_read: false
    }])

    // Silently skip while the notifications table doesn't exist yet
    if (error && !error.message?.includes('relation "public.notifications" does not exist')) {
      throw error
    }
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