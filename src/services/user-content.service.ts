import { supabase } from '../lib/supabase'
import type { Post, PostDraft, PostWithRelations, CommentWithUser } from '../types/database.types'

export class UserContentService {
  // Get user's posts with status information
  static async getUserPosts(userId: string, limit: number = 50): Promise<PostWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories(id, name_de),
          therapists(id, form_of_address, first_name, last_name, designation, institution)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user posts:', error)
        throw new Error('Failed to load user posts')
      }

      return data || []
    } catch (error) {
      console.error('Error getting user posts:', error)
      throw error
    }
  }

  // Get user's comments with post references
  static async getUserComments(userId: string, limit: number = 50): Promise<(CommentWithUser & { posts?: Post })[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          posts(id, title, category_id, created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user comments:', error)
        throw new Error('Failed to load user comments')
      }

      return data || []
    } catch (error) {
      console.error('Error getting user comments:', error)
      throw error
    }
  }

  // Get user's drafts
  static async getUserDrafts(userId: string, limit: number = 50): Promise<PostDraft[]> {
    try {
      const { data, error } = await supabase
        .from('post_drafts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching user drafts:', error)
        throw new Error('Failed to load user drafts')
      }

      return data || []
    } catch (error) {
      console.error('Error getting user drafts:', error)
      throw error
    }
  }

  // Delete a draft
  static async deleteDraft(draftId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('post_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', userId) // Security: ensure user can only delete their own drafts

      if (error) {
        console.error('Error deleting draft:', error)
        throw new Error('Failed to delete draft')
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      throw error
    }
  }

  // Get post status badge info
  static getPostStatusBadge(post: Post) {
    if (post.is_banned) {
      return {
        text: 'Banned',
        className: 'bg-red-100 text-red-800 border-red-200'
      }
    }
    
    if (!post.is_active) {
      return {
        text: 'Inactive',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    }
    
    if (!post.is_published) {
      return {
        text: 'Pending Review',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }
    }
    
    if (post.is_published && post.is_active && !post.is_banned) {
      return {
        text: 'Published',
        className: 'bg-green-100 text-green-800 border-green-200'
      }
    }
    
    return {
      text: 'Unknown',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get comment count for a post
  static async getPostCommentCount(postId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('is_active', true)
        .neq('is_banned', true)

      if (error) {
        console.error('Error getting comment count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting post comment count:', error)
      return 0
    }
  }
}

export default UserContentService