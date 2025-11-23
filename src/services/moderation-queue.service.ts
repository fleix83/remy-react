import { supabase } from '../lib/supabase'
import type { ModerationQueueItem, ModerationStatus, Post, Comment } from '../types/database.types'

export class ModerationQueueService {
  // Get all pending content for moderation queue
  async getPendingContent(): Promise<ModerationQueueItem[]> {
    // Get pending posts - exclude drafts
    // Drafts (is_draft = true) should never appear in moderation queue
    const { data: pendingPosts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        users!posts_user_id_fkey(id, username, role, avatar_url),
        categories!inner(id, name_de, name_fr, name_it)
      `)
      .eq('moderation_status', 'pending')
      .eq('is_active', true) // Only show active posts
      .eq('is_draft', false) // Exclude drafts - only show submitted posts
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
        users!comments_user_id_fkey(id, username, role, avatar_url)
      `)
      .eq('moderation_status', 'pending')
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching pending comments:', commentsError)
      throw commentsError
    }

    // Get therapists needing review
    // Handle gracefully if therapist review system isn't set up yet
    let pendingTherapists: any[] = []
    try {
      const { data, error: therapistsError } = await supabase
        .from('therapists')
        .select(`
          *,
          users!therapists_created_by_fkey(id, username, role, avatar_url)
        `)
        .eq('needs_review', true)
        .order('created_at', { ascending: true })

      if (therapistsError) {
        // If the foreign key doesn't exist yet (migration not applied), silently skip
        if (therapistsError.code === 'PGRST200' || therapistsError.message.includes('Could not find a relationship')) {
          console.warn('Therapist review system not set up yet - skipping therapist moderation')
          pendingTherapists = []
        } else {
          console.error('Error fetching pending therapists:', therapistsError)
          throw therapistsError
        }
      } else {
        pendingTherapists = data || []
      }
    } catch (error) {
      console.warn('Therapist moderation not available yet:', error)
      pendingTherapists = []
    }

    // Transform posts to ModerationQueueItem format
    const postItems: ModerationQueueItem[] = (pendingPosts || []).map((post: any) => ({
      content_type: 'post' as const,
      id: post.id,
      content_id: post.id, // Use post ID as content ID
      user_id: post.user_id,
      title: post.title,
      content: post.content,
      canton: post.canton,
      created_at: post.created_at,
      moderation_status: post.moderation_status,
      moderated_by: post.moderated_by,
      moderated_at: post.moderated_at,
      rejection_reason: post.rejection_reason,
      users: post.users,
      category_id: post.category_id
    }))

    // Transform comments to ModerationQueueItem format
    const commentItems: ModerationQueueItem[] = (pendingComments || []).map((comment: any) => ({
      content_type: 'comment' as const,
      id: comment.id,
      content_id: comment.id, // Use comment ID as content ID
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

    // Transform therapists to ModerationQueueItem format
    const therapistItems: ModerationQueueItem[] = (pendingTherapists || []).map((therapist: any) => ({
      content_type: 'therapist' as const,
      id: therapist.id,
      content_id: therapist.id, // Use therapist ID as content ID
      user_id: therapist.created_by,
      content: therapist.description || '', // Use description as content
      title: `${therapist.first_name} ${therapist.last_name}`,
      first_name: therapist.first_name,
      last_name: therapist.last_name,
      designation: therapist.designation,
      canton: therapist.canton,
      created_at: therapist.created_at,
      moderation_status: null, // Therapists don't have moderation_status
      needs_review: therapist.needs_review,
      moderated_by: therapist.reviewed_by,
      moderated_at: therapist.reviewed_at,
      users: therapist.users
    }))

    // Combine and sort by creation date
    const allItems = [...postItems, ...commentItems, ...therapistItems]
    allItems.sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate // newest first
    })

    return allItems
  }

  // Get pending content count for dashboard
  async getPendingContentCount(): Promise<{ posts: number; comments: number; therapists: number; total: number }> {
    const [postsResult, commentsResult, therapistsResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'pending')
        .eq('is_active', true) // Only count active posts (exclude soft-deleted)
        .eq('is_draft', false), // Exclude drafts from count
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('moderation_status', 'pending'),
      supabase
        .from('therapists')
        .select('id', { count: 'exact', head: true })
        .eq('needs_review', true)
    ])

    const posts = postsResult.count || 0
    const comments = commentsResult.count || 0
    const therapists = therapistsResult.count || 0

    return {
      posts,
      comments,
      therapists,
      total: posts + comments + therapists
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

    console.log(`❌ Post ${postId} rejected by moderator ${moderatorId}`)
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
        is_published: false // Ensure it's not publicly visible
      })
      .eq('id', commentId)

    if (error) {
      console.error('Error rejecting comment:', error)
      throw error
    }

    console.log(`❌ Comment ${commentId} rejected by moderator ${moderatorId}`)
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
          users!posts_user_id_fkey(id, username, avatar_url)
        `)
        .eq('moderated_by', moderatorId)
        .not('moderation_status', 'eq', 'pending')
        .order('moderated_at', { ascending: false })
        .limit(limit),
      supabase
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey(id, username, avatar_url)
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

  // Dismiss therapist review (mark as reviewed/approved)
  async dismissTherapist(therapistId: number, moderatorId: string): Promise<void> {
    const { error } = await supabase
      .from('therapists')
      .update({
        needs_review: false,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', therapistId)

    if (error) {
      console.error('Error dismissing therapist review:', error)
      throw error
    }

    console.log(`✅ Therapist ${therapistId} review dismissed by moderator ${moderatorId}`)
  }

  // Delete a therapist permanently
  async deleteTherapist(therapistId: number, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('therapists')
      .delete()
      .eq('id', therapistId)

    if (error) {
      console.error('Error deleting therapist:', error)
      throw error
    }

    console.log(`🗑️ Therapist ${therapistId} deleted permanently${reason ? ` (${reason})` : ''}`)
  }

  // Bulk delete multiple items
  async bulkDelete(items: { type: 'post' | 'comment' | 'therapist'; id: number }[], reason?: string): Promise<void> {
    const posts = items.filter(item => item.type === 'post').map(item => item.id)
    const comments = items.filter(item => item.type === 'comment').map(item => item.id)
    const therapists = items.filter(item => item.type === 'therapist').map(item => item.id)

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

    if (therapists.length > 0) {
      promises.push(
        supabase
          .from('therapists')
          .delete()
          .in('id', therapists)
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

  // Bulk dismiss therapists (approve for review)
  async bulkDismissTherapists(therapistIds: number[], moderatorId: string): Promise<void> {
    const { error } = await supabase
      .from('therapists')
      .update({
        needs_review: false,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString()
      })
      .in('id', therapistIds)

    if (error) {
      console.error('Error in bulk dismiss therapists:', error)
      throw error
    }

    console.log(`✅ Bulk dismissed ${therapistIds.length} therapists by moderator ${moderatorId}`)
  }
}