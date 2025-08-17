import { supabase } from '../lib/supabase'
import type { ModerationQueueItem, ModerationStatus, Post, Comment } from '../types/database.types'

export class ModerationQueueService {
  // Get all pending content for moderation queue
  async getPendingContent(): Promise<ModerationQueueItem[]> {
    // Get pending posts
    const { data: pendingPosts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        users!posts_user_id_fkey(id, username, email, role, avatar_url),
        categories!inner(id, name_de, name_fr, name_it)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })

    if (postsError) {
      console.error('Error fetching pending posts:', postsError)
      throw postsError
    }

    // Get pending comments
    const { data: pendingComments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        users!comments_user_id_fkey(id, username, email, role, avatar_url)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching pending comments:', commentsError)
      throw commentsError
    }

    // Transform posts to ModerationQueueItem format
    const postItems: ModerationQueueItem[] = (pendingPosts || []).map(post => ({
      content_type: 'post' as const,
      id: post.id,
      user_id: post.user_id,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      moderation_status: post.moderation_status,
      moderated_by: post.moderated_by,
      moderated_at: post.moderated_at,
      rejection_reason: post.rejection_reason,
      users: post.users,
      category_id: post.category_id
    }))

    // Transform comments to ModerationQueueItem format
    const commentItems: ModerationQueueItem[] = (pendingComments || []).map(comment => ({
      content_type: 'comment' as const,
      id: comment.id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      moderation_status: comment.moderation_status,
      moderated_by: comment.moderated_by,
      moderated_at: comment.moderated_at,
      rejection_reason: comment.rejection_reason,
      post_id: comment.post_id,
      users: comment.users
    }))

    // Combine and sort by creation date
    const allItems = [...postItems, ...commentItems]
    allItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return allItems
  }

  // Get pending content count for dashboard
  async getPendingContentCount(): Promise<{ posts: number; comments: number; total: number }> {
    const [postsResult, commentsResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'pending'),
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'pending')
    ])

    const posts = postsResult.count || 0
    const comments = commentsResult.count || 0

    return {
      posts,
      comments,
      total: posts + comments
    }
  }

  // Approve a post
  async approvePost(postId: number, moderatorId: string): Promise<void> {
    const updateData = {
      moderation_status: 'approved' as ModerationStatus,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      is_published: true, // Make it visible
      updated_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)

    if (error) {
      console.error('Error approving post:', error)
      throw error
    }

    console.log(`✅ Post ${postId} approved by moderator ${moderatorId}`)
  }

  // Reject a post
  async rejectPost(postId: number, moderatorId: string, reason?: string): Promise<void> {
    const updateData = {
      moderation_status: 'rejected' as ModerationStatus,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      rejection_reason: reason || null,
      is_banned: true, // Ban the post - only author can see it
      is_published: false, // Ensure it's not publicly visible
      updated_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)

    if (error) {
      console.error('Error rejecting post:', error)
      throw error
    }

    console.log(`❌ Post ${postId} rejected and banned by moderator ${moderatorId}`)
  }

  // Approve a comment
  async approveComment(commentId: number, moderatorId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({
        moderation_status: 'approved' as ModerationStatus,
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString(),
        is_published: true // Make it visible
      })
      .eq('id', commentId)

    if (error) {
      console.error('Error approving comment:', error)
      throw error
    }

    console.log(`✅ Comment ${commentId} approved by moderator ${moderatorId}`)
  }

  // Reject a comment
  async rejectComment(commentId: number, moderatorId: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .update({
        moderation_status: 'rejected' as ModerationStatus,
        moderated_by: moderatorId,
        moderated_at: new Date().toISOString(),
        rejection_reason: reason || null,
        is_banned: true, // Ban the comment - only author can see it
        is_published: false // Ensure it's not publicly visible
      })
      .eq('id', commentId)

    if (error) {
      console.error('Error rejecting comment:', error)
      throw error
    }

    console.log(`❌ Comment ${commentId} rejected and banned by moderator ${moderatorId}`)
  }

  // Get moderation history for a specific moderator
  async getModerationHistory(moderatorId: string, limit = 50): Promise<{
    posts: (Post & { moderated_content_type: 'post' })[]
    comments: (Comment & { moderated_content_type: 'comment' })[]
  }> {
    const [postsResult, commentsResult] = await Promise.all([
      supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey(id, username, email, avatar_url)
        `)
        .eq('moderated_by', moderatorId)
        .not('moderation_status', 'eq', 'pending')
        .order('moderated_at', { ascending: false })
        .limit(limit),
      supabase
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey(id, username, email, avatar_url)
        `)
        .eq('moderated_by', moderatorId)
        .not('moderation_status', 'eq', 'pending')
        .order('moderated_at', { ascending: false })
        .limit(limit)
    ])

    if (postsResult.error) {
      console.error('Error fetching moderated posts:', postsResult.error)
      throw postsResult.error
    }

    if (commentsResult.error) {
      console.error('Error fetching moderated comments:', commentsResult.error)
      throw commentsResult.error
    }

    return {
      posts: (postsResult.data || []).map(post => ({ ...post, moderated_content_type: 'post' as const })),
      comments: (commentsResult.data || []).map(comment => ({ ...comment, moderated_content_type: 'comment' as const }))
    }
  }

  // Get moderation statistics
  async getModerationStats(): Promise<{
    pending: { posts: number; comments: number; total: number }
    approved: { posts: number; comments: number; total: number }
    rejected: { posts: number; comments: number; total: number }
    totalProcessed: number
  }> {
    const [
      pendingPosts, pendingComments,
      approvedPosts, approvedComments,
      rejectedPosts, rejectedComments
    ] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected'),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('moderation_status', 'rejected')
    ])

    const pending = {
      posts: pendingPosts.count || 0,
      comments: pendingComments.count || 0,
      total: (pendingPosts.count || 0) + (pendingComments.count || 0)
    }

    const approved = {
      posts: approvedPosts.count || 0,
      comments: approvedComments.count || 0,
      total: (approvedPosts.count || 0) + (approvedComments.count || 0)
    }

    const rejected = {
      posts: rejectedPosts.count || 0,
      comments: rejectedComments.count || 0,
      total: (rejectedPosts.count || 0) + (rejectedComments.count || 0)
    }

    return {
      pending,
      approved,
      rejected,
      totalProcessed: approved.total + rejected.total
    }
  }

  // Bulk approve multiple items
  async bulkApprove(items: { type: 'post' | 'comment'; id: number }[], moderatorId: string): Promise<void> {
    const posts = items.filter(item => item.type === 'post').map(item => item.id)
    const comments = items.filter(item => item.type === 'comment').map(item => item.id)

    const postUpdateData = {
      moderation_status: 'approved' as ModerationStatus,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      is_published: true,
      updated_at: new Date().toISOString()
    }

    const commentUpdateData = {
      moderation_status: 'approved' as ModerationStatus,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      is_published: true
    }

    const promises = []

    if (posts.length > 0) {
      promises.push(
        supabase
          .from('posts')
          .update(postUpdateData)
          .in('id', posts)
      )
    }

    if (comments.length > 0) {
      promises.push(
        supabase
          .from('comments')
          .update(commentUpdateData)
          .in('id', comments)
      )
    }

    const results = await Promise.all(promises)
    
    for (const result of results) {
      if (result.error) {
        console.error('Error in bulk approve:', result.error)
        throw result.error
      }
    }

    console.log(`✅ Bulk approved ${items.length} items by moderator ${moderatorId}`)
  }

  // Delete a post permanently
  async deletePost(postId: number, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      throw error
    }

    console.log(`🗑️ Post ${postId} deleted permanently${reason ? ` (${reason})` : ''}`)
  }

  // Delete a comment permanently
  async deleteComment(commentId: number, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error)
      throw error
    }

    console.log(`🗑️ Comment ${commentId} deleted permanently${reason ? ` (${reason})` : ''}`)
  }

  // Bulk delete multiple items
  async bulkDelete(items: { type: 'post' | 'comment'; id: number }[], reason?: string): Promise<void> {
    const posts = items.filter(item => item.type === 'post').map(item => item.id)
    const comments = items.filter(item => item.type === 'comment').map(item => item.id)

    const promises = []

    if (posts.length > 0) {
      promises.push(
        supabase
          .from('posts')
          .delete()
          .in('id', posts)
      )
    }

    if (comments.length > 0) {
      promises.push(
        supabase
          .from('comments')
          .delete()
          .in('id', comments)
      )
    }

    const results = await Promise.all(promises)
    
    for (const result of results) {
      if (result.error) {
        console.error('Error in bulk delete:', result.error)
        throw result.error
      }
    }

    console.log(`🗑️ Bulk deleted ${items.length} items${reason ? ` (${reason})` : ''}`)
  }
}