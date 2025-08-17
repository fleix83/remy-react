import { supabase } from '../lib/supabase'
import type { User, UserBlock } from '../types/database.types'

interface BlockedUserInfo {
  id: string
  username: string
  avatar_url?: string | null
  created_at: string
}

interface UserBlockWithUser extends UserBlock {
  blocked_user?: BlockedUserInfo
}

export class UserSearchService {
  // Search users by username (for blocking)
  static async searchUsers(query: string, excludeUserId?: string): Promise<Partial<User>[]> {
    if (!query.trim() || query.length < 2) {
      return []
    }

    try {
      let searchQuery = supabase
        .from('users')
        .select('id, username, avatar_url, created_at')
        .ilike('username', `%${query.trim()}%`)
        .limit(10)

      if (excludeUserId) {
        searchQuery = searchQuery.neq('id', excludeUserId)
      }

      const { data, error } = await searchQuery

      if (error) {
        console.error('User search error:', error)
        throw new Error('Failed to search users')
      }

      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  // Get blocked users for a specific user
  static async getBlockedUsers(userId: string): Promise<UserBlockWithUser[]> {
    try {
      // First get the blocked user IDs
      const { data: blockedIds, error: blockedError } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id, blocked_at')
        .eq('blocker_id', userId)
        .order('blocked_at', { ascending: false })

      if (blockedError) {
        console.error('Error fetching blocked user IDs:', blockedError)
        throw new Error('Failed to load blocked users')
      }

      if (!blockedIds || blockedIds.length === 0) {
        return []
      }

      // Then get the user info for blocked users
      const blockedUserIds = blockedIds.map(block => block.blocked_id)
      const { data: blockedUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url, created_at')
        .in('id', blockedUserIds)

      if (usersError) {
        console.error('Error fetching blocked users info:', usersError)
        throw new Error('Failed to load blocked users')
      }

      // Combine the data
      const result = blockedIds.map(block => ({
        ...block,
        blocked_user: blockedUsers?.find(user => user.id === block.blocked_id)
      }))

      return result
    } catch (error) {
      console.error('Error getting blocked users:', error)
      throw error
    }
  }

  // Block a user
  static async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself')
    }

    try {
      // Check if already blocked
      const { data: existing } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single()

      if (existing) {
        throw new Error('User is already blocked')
      }

      // Insert block record
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: blockerId,
          blocked_id: blockedId,
          blocked_at: new Date().toISOString()
        })

      if (error) {
        console.error('Block user error:', error)
        throw new Error('Failed to block user')
      }
    } catch (error) {
      console.error('Error blocking user:', error)
      throw error
    }
  }

  // Unblock a user
  static async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)

      if (error) {
        console.error('Unblock user error:', error)
        throw new Error('Failed to unblock user')
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      throw error
    }
  }

  // Check if a user is blocked
  static async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking block status:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Error checking if user is blocked:', error)
      return false
    }
  }

  // Get users who have blocked the current user (to filter them out of searches)
  static async getUsersWhoBlockedMe(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocked_id', userId)

      if (error) {
        console.error('Error getting users who blocked me:', error)
        return []
      }

      return data.map(block => block.blocker_id)
    } catch (error) {
      console.error('Error getting users who blocked me:', error)
      return []
    }
  }
}

export default UserSearchService