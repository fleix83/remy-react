import { supabase } from '../lib/supabase'

export interface BlockedUser {
  id: string
  username: string
  avatar_url?: string | null
  blocked_at: string
}

export class UserBlocksService {
  // Block a user
  async blockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    if (user.id === userId) {
      throw new Error('Cannot block yourself')
    }

    // Check if already blocked
    const isAlreadyBlocked = await this.isUserBlocked(userId)
    if (isAlreadyBlocked) {
      throw new Error('User is already blocked')
    }

    const { error } = await supabase
      .from('user_blocks')
      .insert([{
        blocker_id: user.id,
        blocked_id: userId,
        blocked_at: new Date().toISOString()
      }])

    if (error) {
      console.error('Error blocking user:', error)
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_blocks" does not exist')) {
        throw new Error('User blocking system is not available')
      }
      throw error
    }

    console.log(`User ${userId} blocked by ${user.id}`)
  }

  // Unblock a user
  async unblockUser(userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)

    if (error) {
      console.error('Error unblocking user:', error)
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_blocks" does not exist')) {
        throw new Error('User blocking system is not available')
      }
      throw error
    }

    console.log(`User ${userId} unblocked by ${user.id}`)
  }

  // Check if current user has blocked another user
  async isUserBlocked(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking block status:', error)
      if (error.message.includes('relation "public.user_blocks" does not exist')) {
        console.warn('User blocks table not found - returning false')
      }
      return false
    }

    return !!data
  }

  // Check if current user is blocked by another user
  async isBlockedBy(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocker_id', userId)
      .eq('blocked_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking if blocked by user:', error)
      if (error.message.includes('relation "public.user_blocks" does not exist')) {
        console.warn('User blocks table not found - returning false')
      }
      return false
    }

    return !!data
  }

  // Get list of users blocked by current user
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select(`
        blocked_at,
        blocked_user:users!user_blocks_blocked_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .eq('blocker_id', user.id)
      .order('blocked_at', { ascending: false })

    if (error) {
      console.error('Error fetching blocked users:', error)
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_blocks" does not exist')) {
        console.warn('User blocks table not found - returning empty list')
        return []
      }
      throw error
    }

    if (!blocks) return []

    return blocks.map(block => ({
      id: (block.blocked_user as any).id,
      username: (block.blocked_user as any).username,
      avatar_url: (block.blocked_user as any).avatar_url,
      blocked_at: block.blocked_at
    }))
  }

  // Get count of blocked users
  async getBlockedUsersCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('user_blocks')
      .select('*', { count: 'exact', head: true })
      .eq('blocker_id', user.id)

    if (error) {
      console.error('Error getting blocked users count:', error)
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_blocks" does not exist')) {
        console.warn('User blocks table not found - returning 0 count')
      }
      return 0
    }

    return count || 0
  }

  // Check block relationship between two users (for moderation/admin use)
  async checkBlockRelationship(userId1: string, userId2: string): Promise<{
    user1BlockedUser2: boolean
    user2BlockedUser1: boolean
  }> {
    const [user1Blocks, user2Blocks] = await Promise.all([
      supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', userId1)
        .eq('blocked_id', userId2)
        .single(),
      supabase
        .from('user_blocks')
        .select('blocker_id')
        .eq('blocker_id', userId2)
        .eq('blocked_id', userId1)
        .single()
    ])

    return {
      user1BlockedUser2: !!user1Blocks.data,
      user2BlockedUser1: !!user2Blocks.data
    }
  }

  // Toggle block status (block if not blocked, unblock if blocked)
  async toggleBlockUser(userId: string): Promise<{ action: 'blocked' | 'unblocked' }> {
    const isBlocked = await this.isUserBlocked(userId)
    
    if (isBlocked) {
      await this.unblockUser(userId)
      return { action: 'unblocked' }
    } else {
      await this.blockUser(userId)
      return { action: 'blocked' }
    }
  }
}