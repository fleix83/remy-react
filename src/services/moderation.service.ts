import { supabase } from '../lib/supabase'
import type { User } from '../types/database.types'

export class ModerationService {
  // User Management
  async getUsers(limit = 50, offset = 0): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getUsersByRole(role: 'user' | 'moderator' | 'admin'): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async updateUserRole(userId: string, newRole: 'user' | 'moderator' | 'admin'): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
  }

  async banUser(userId: string, _reason?: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_banned: true, 
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    // Optionally log ban reason in a separate moderation_actions table
    // This would require creating that table first
  }

  async unbanUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_banned: false, 
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error
  }

  // Content Moderation
  async deletePost(postId: number, _reason?: string): Promise<void> {
    // First delete all comments associated with the post
    await supabase
      .from('comments')
      .delete()
      .eq('post_id', postId)

    // Then delete the post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) throw error
  }

  async deleteComment(commentId: number, _reason?: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  }

  async editPost(postId: number, updates: { title?: string; content?: string }, _reason?: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (error) throw error
  }

  async editComment(commentId: number, content: string, _reason?: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (error) throw error
  }

  // Reports and Flagging (for future implementation)
  async getReportedContent(): Promise<any[]> {
    // This would require a reports table to be implemented
    return []
  }

  // Check user permissions
  async checkUserPermissions(userId: string): Promise<{ 
    role: 'user' | 'moderator' | 'admin'
    canModerate: boolean
    canAdmin: boolean
    isBanned: boolean
  }> {
    const { data, error } = await supabase
      .from('users')
      .select('role, is_banned')
      .eq('id', userId)
      .single()

    if (error) throw error

    const role = data.role as 'user' | 'moderator' | 'admin'
    
    return {
      role,
      canModerate: role === 'moderator' || role === 'admin',
      canAdmin: role === 'admin',
      isBanned: data.is_banned
    }
  }

  // Get moderation statistics
  async getModerationStats(): Promise<{
    totalUsers: number
    bannedUsers: number
    moderators: number
    admins: number
    totalPosts: number
    totalComments: number
  }> {
    const [usersResult, bannedResult, moderatorsResult, adminsResult, postsResult, commentsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'moderator'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true })
    ])

    return {
      totalUsers: usersResult.count || 0,
      bannedUsers: bannedResult.count || 0,
      moderators: moderatorsResult.count || 0,
      admins: adminsResult.count || 0,
      totalPosts: postsResult.count || 0,
      totalComments: commentsResult.count || 0
    }
  }
}