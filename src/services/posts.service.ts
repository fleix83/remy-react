import { supabase } from '../lib/supabase'
import { withPerformanceTracking } from '../utils/performance-monitor'
import type { Post, PostWithRelations, Category, ModerationStatus } from '../types/database.types'
import { TagsService } from './tags.service'

// Thrown when the post row was written but a follow-up side-effect (tags)
// failed. Callers can inspect `postSaved` to know the DB row is fresh.
export class PostSideEffectError extends Error {
  readonly postSaved = true
  readonly updatedPost?: PostWithRelations
  readonly createdPost?: Post
  constructor(message: string, opts: { updatedPost?: PostWithRelations; createdPost?: Post } = {}) {
    super(message)
    this.name = 'PostSideEffectError'
    this.updatedPost = opts.updatedPost
    this.createdPost = opts.createdPost
  }
}

interface PostFilters {
  category?: number
  cantons?: string[]
  therapist?: string
  designations?: number[]
  gender?: 'm' | 'f' | 'both'
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export class PostsService {
  private static therapistEmbed(inner: boolean): string {
    return `therapists${inner ? '!inner' : ''}(id, form_of_address, first_name, last_name, full_title, designation_id, gender, institution, canton, designations(id, slug, label_de, label_fr, label_it))`
  }

  // Get all published posts with user and category information
  getPosts = withPerformanceTracking(
    async (filters?: PostFilters | number, includeUserBanned = false): Promise<PostWithRelations[]> => {
      const { posts } = await this.getPostsPage(filters, includeUserBanned)
      return posts
    }, 'posts.getPosts')

  // Same query, but also returns the total count of matching posts (for pagination)
  getPostsPage = withPerformanceTracking(
    async (filters?: PostFilters | number, includeUserBanned = false): Promise<{ posts: PostWithRelations[]; total: number }> => {
    // Handle legacy API (backward compatibility)
    let postFilters: PostFilters = {}
    if (typeof filters === 'number') {
      postFilters.category = filters
    } else if (filters) {
      postFilters = filters
    }

    // Use optimized query with selective fields and better JOIN strategy
    const needsTherapistJoin = Boolean(
      (postFilters.designations && postFilters.designations.length > 0) || postFilters.gender
    )
    let query = supabase
      .from('posts')
      .select(`
        id, title, content, created_at, user_id, category_id, therapist_id, canton,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(needsTherapistJoin)}
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (includeUserBanned) {
      // If including user's banned posts, get all posts (published + user's banned posts)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        query = query.or(`and(is_published.eq.true,is_banned.eq.false,moderation_status.eq.approved),and(user_id.eq.${user.id},is_banned.eq.true)`)
      } else {
        // Not authenticated, only show published posts
        query = query
          .eq('is_published', true)
          .eq('is_banned', false)
          .eq('moderation_status', 'approved')
      }
    } else {
      // Standard query - only published, non-banned, approved posts
      query = query
        .eq('is_published', true)
        .eq('is_banned', false)
        .eq('moderation_status', 'approved')
    }

    // Apply filters
    if (postFilters.category) {
      query = query.eq('category_id', postFilters.category)
    }

    if (postFilters.cantons && postFilters.cantons.length > 0) {
      query = query.in('canton', postFilters.cantons)
    }

    if (postFilters.therapist) {
      // Search by therapist ID (therapist filter now expects therapist ID)
      query = query.eq('therapist_id', parseInt(postFilters.therapist))
    }

    if (postFilters.designations && postFilters.designations.length > 0) {
      query = query.in('therapists.designation_id', postFilters.designations)
    }
    if (postFilters.gender && postFilters.gender !== 'both') {
      query = query.eq('therapists.gender', postFilters.gender)
    }

    if (postFilters.dateFrom) {
      // Convert to ISO string for proper date comparison
      const fromDate = new Date(postFilters.dateFrom)
      query = query.gte('created_at', fromDate.toISOString())
    }

    if (postFilters.dateTo) {
      // Add one day to include the entire day
      const toDate = new Date(postFilters.dateTo)
      toDate.setDate(toDate.getDate() + 1)
      query = query.lt('created_at', toDate.toISOString())
    }

    if (postFilters.search) {
      query = query.or(`title.ilike.%${postFilters.search}%,content.ilike.%${postFilters.search}%`)
    }

    // Add pagination
    const page = postFilters.page || 1
    const limit = postFilters.limit || 20
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      throw error
    }

    // Fetch comment counts separately for better performance
    const postsWithComments = await this.addCommentCounts(data || [])
    return { posts: postsWithComments, total: count ?? postsWithComments.length }
  }, 'posts.getPostsPage')

  // Get a single post with full details
  getPost = withPerformanceTracking(
    async (id: number, includeUserBanned = false): Promise<PostWithRelations | null> => {
    let query = supabase
      .from('posts')
      .select(`
        id, title, content, created_at, updated_at, user_id, category_id, therapist_id, canton, is_published, is_banned, moderation_status,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(false)}
      `)
      .eq('id', id)
      .eq('is_active', true)

    if (includeUserBanned) {
      // Check if user can see banned posts (either public posts or their own banned posts)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        query = query.or(`and(is_published.eq.true,is_banned.eq.false,moderation_status.eq.approved),and(user_id.eq.${user.id},is_banned.eq.true)`)
      } else {
        query = query
          .eq('is_published', true)
          .eq('is_banned', false)
          .eq('moderation_status', 'approved')
      }
    } else {
      query = query
        .eq('is_published', true)
        .eq('is_banned', false)
        .eq('moderation_status', 'approved')
    }

    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching post:', error)
      throw error
    }

    if (data) {
      // Add comment count separately
      const [postWithComments] = await this.addCommentCounts([data])
      return postWithComments as unknown as PostWithRelations
    }

    return null
  }, 'posts.getPost')

  // Create a new post
  async createPost(postData: {
    title: string
    content: string
    category_id: number
    canton: string
    therapist_id?: number
    is_published?: boolean
    is_draft?: boolean
    tags?: string[]
  }): Promise<Post> {
    console.log('🔧 PostsService: Starting createPost with data:', postData)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ PostsService: Auth error:', authError)
      throw new Error('Authentication failed: ' + authError.message)
    }

    if (!user) {
      console.error('❌ PostsService: No authenticated user')
      throw new Error('User not authenticated')
    }

    console.log('👤 PostsService: Authenticated user ID:', user.id)

    const { tags, is_draft, ...postDataWithoutTags } = postData

    // Set moderation status based on draft flag
    const draftStatus = is_draft ? null : 'pending'

    const insertData = {
      ...postDataWithoutTags,
      user_id: user.id,
      is_published: false, // Always start as unpublished - requires moderation approval for non-drafts
      is_draft: is_draft ?? false, // Default to false (submitted for moderation)
      moderation_status: draftStatus as ModerationStatus | null, // Drafts don't need moderation status yet
    }

    console.log('📤 PostsService: Inserting data:', insertData)

    const { data, error } = await supabase
      .from('posts')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ PostsService: Database error:', error)
      throw new Error('Database error: ' + error.message)
    }

    // Save tags if provided. The post row is already committed, so surface
    // tag failures as a distinct "post saved but tags failed" error.
    if (tags && tags.length > 0) {
      try {
        const tagsService = new TagsService()
        await tagsService.addTagsToPost(data.id, tags)
      } catch (err) {
        console.error('❌ PostsService: Tag save failed after post create:', err)
        throw new PostSideEffectError(
          'Beitrag wurde erstellt, aber die Tags konnten nicht gespeichert werden: ' +
            (err instanceof Error ? err.message : String(err)),
          { createdPost: data }
        )
      }
    }

    return data
  }

  // Get all categories
  getCategories = withPerformanceTracking(
    async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    return data || []
  }, 'posts.getCategories')

  // Search posts
  searchPosts = withPerformanceTracking(
    async (searchTerm: string): Promise<PostWithRelations[]> => {
    const term = `%${searchTerm}%`
    const baseSelect = `
        id, title, content, created_at, user_id, category_id, therapist_id, canton,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(false)}
      `
    const userInnerSelect = `
        id, title, content, created_at, user_id, category_id, therapist_id, canton,
        users!posts_user_id_fkey!inner(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(false)}
      `
    const therapistInnerSelect = `
        id, title, content, created_at, user_id, category_id, therapist_id, canton,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(true)}
      `
    const publishedFilter = (q: any) => q
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_banned', false)
      .eq('moderation_status', 'approved')

    // Run the four independent searches in parallel.
    // Username and therapist matches now filter server-side via inner-join + ilike,
    // instead of fetching all rows and filtering in JavaScript.
    const [titleContentResult, tagIdsResult, usernameResult, therapistResult] = await Promise.all([
      publishedFilter(supabase.from('posts').select(baseSelect))
        .or(`title.ilike.${term},content.ilike.${term}`)
        .order('created_at', { ascending: false }),

      supabase
        .from('post_tags')
        .select('post_id, tags!inner(name)')
        .ilike('tags.name', term),

      publishedFilter(supabase.from('posts').select(userInnerSelect))
        .ilike('users.username', term)
        .order('created_at', { ascending: false }),

      publishedFilter(supabase.from('posts').select(therapistInnerSelect))
        .not('therapist_id', 'is', null)
        .or(
          `first_name.ilike.${term},last_name.ilike.${term},institution.ilike.${term}`,
          { foreignTable: 'therapists' }
        )
        .order('created_at', { ascending: false }),
    ])

    if (titleContentResult.error) {
      console.error('Error searching posts by title/content:', titleContentResult.error)
      throw titleContentResult.error
    }
    if (tagIdsResult.error) console.error('Error searching tags:', tagIdsResult.error)
    if (usernameResult.error) console.error('Error fetching user posts:', usernameResult.error)
    if (therapistResult.error) console.error('Error fetching therapist posts:', therapistResult.error)

    const postMap = new Map<number, any>()
    titleContentResult.data?.forEach((post: any) => postMap.set(post.id, post))
    usernameResult.data?.forEach((post: any) => { if (!postMap.has(post.id)) postMap.set(post.id, post) })
    therapistResult.data?.forEach((post: any) => { if (!postMap.has(post.id)) postMap.set(post.id, post) })

    // Tag matches: fetch full post data only for IDs not already covered
    const taggedPostIds = [...new Set(tagIdsResult.data?.map((tr: any) => tr.post_id) || [])]
    const newTaggedIds = taggedPostIds.filter(id => !postMap.has(id))
    if (newTaggedIds.length > 0) {
      const { data: taggedPosts, error: taggedPostsError } = await publishedFilter(
        supabase.from('posts').select(baseSelect).in('id', newTaggedIds)
      )
      if (taggedPostsError) {
        console.error('Error fetching tagged posts:', taggedPostsError)
      } else {
        taggedPosts?.forEach((post: any) => postMap.set(post.id, post))
      }
    }

    const matchedPosts = Array.from(postMap.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const postsWithComments = await this.addCommentCounts(matchedPosts)
    return postsWithComments
  }, 'posts.searchPosts')

  // Update an existing post
  async updatePost(id: number, updates: {
    title?: string
    content?: string
    category_id?: number
    canton?: string
    therapist_id?: number | null
    tags?: string[]
    is_draft?: boolean
  }): Promise<PostWithRelations> {
    console.log('🔧 PostsService: Starting updatePost for ID:', id, 'with updates:', updates)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ PostsService: Auth error:', authError)
      throw new Error('Authentication failed: ' + authError.message)
    }

    if (!user) {
      console.error('❌ PostsService: No authenticated user')
      throw new Error('User not authenticated')
    }

    // First, verify the user owns this post and get current state
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id, is_draft, moderation_status')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('❌ PostsService: Error fetching post for authorization:', fetchError)
      throw new Error('Post not found')
    }

    if (existingPost.user_id !== user.id) {
      console.error('❌ PostsService: User not authorized to edit this post')
      throw new Error('Not authorized to edit this post')
    }

    // Prepare update data (exclude tags from post update)
    const { tags, is_draft, ...updatesWithoutTags } = updates
    const updateData: Record<string, unknown> = {
      ...updatesWithoutTags,
      updated_at: new Date().toISOString()
    }

    // Only change moderation status when draft state actually changes.
    // Editing an already-published post should NOT reset it to 'pending'.
    if (is_draft !== undefined) {
      const wasDraft = existingPost.is_draft ?? false
      updateData.is_draft = is_draft
      if (is_draft !== wasDraft) {
        updateData.moderation_status = is_draft ? null : 'pending'
      }
    }

    console.log('📤 PostsService: Updating post with data:', updateData)

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, title, content, created_at, updated_at, user_id, category_id, therapist_id, canton, is_published, is_banned, moderation_status,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        ${PostsService.therapistEmbed(false)}
      `)
      .single()

    if (error) {
      console.error('❌ PostsService: Database error:', error)
      throw new Error('Database error: ' + error.message)
    }

    // Update tags if provided. The post body is already committed at this
    // point, so a tag failure must not look like a generic update failure.
    let tagUpdateError: Error | null = null
    if (tags !== undefined) {
      try {
        const tagsService = new TagsService()
        await tagsService.addTagsToPost(id, tags)
      } catch (err) {
        console.error('❌ PostsService: Tag update failed after post update:', err)
        tagUpdateError = err instanceof Error ? err : new Error(String(err))
      }
    }

    // Enrich with comment count and tags so the return value is a complete
    // PostWithRelations — callers can drop any follow-up refetch.
    const [enrichedData] = await this.addCommentCounts([data])

    if (tagUpdateError) {
      // Surface a specific error so the UI can distinguish "post saved but
      // tags failed" from a full update failure.
      throw new PostSideEffectError(
        'Post wurde gespeichert, aber die Tags konnten nicht aktualisiert werden: ' +
          tagUpdateError.message,
        { updatedPost: enrichedData }
      )
    }

    return enrichedData
  }

  // Helper method to add comment counts efficiently
  private async addCommentCounts(posts: any[]): Promise<PostWithRelations[]> {
    if (!posts || posts.length === 0) return []

    // Get all post IDs
    const postIds = posts.map(post => post.id)

    // One batched query instead of N parallel per-post count queries.
    // Select only post_id, then group client-side.
    const countMap = new Map<number, number>()
    // Pre-seed so posts with zero comments still resolve to 0.
    postIds.forEach(id => countMap.set(id, 0))

    const { data: commentRows, error: countError } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)

    if (countError) {
      console.error('Error batch-counting comments:', countError)
    } else {
      ;(commentRows as Array<{ post_id: number }> | null)?.forEach(row => {
        const pid = row.post_id
        countMap.set(pid, (countMap.get(pid) || 0) + 1)
      })
    }

    // Fetch tags for all posts in parallel
    const tagsMap = await this.fetchTagsForPosts(postIds)

    // Add comment counts and tags to posts and normalize relationship arrays to objects
    return posts.map(post => ({
      ...post,
      users: Array.isArray(post.users) ? post.users[0] : post.users,
      categories: Array.isArray(post.categories) ? post.categories[0] : post.categories,
      therapists: Array.isArray(post.therapists) ? post.therapists[0] : post.therapists,
      comments: [{ count: countMap.get(post.id) || 0 }],
      tags: tagsMap.get(post.id) || []
    })) as PostWithRelations[]
  }

  // Helper method to fetch tags for multiple posts efficiently
  private async fetchTagsForPosts(postIds: number[]): Promise<Map<number, string[]>> {
    const tagsMap = new Map<number, string[]>()

    try {
      // Fetch all post_tags relationships for these posts
      const { data: postTagsData, error } = await supabase
        .from('post_tags')
        .select('post_id, tags(name)')
        .in('post_id', postIds)

      if (error) {
        console.error('Error fetching tags for posts:', error)
        return tagsMap
      }

      // Group tags by post_id
      postTagsData?.forEach((pt: any) => {
        const postId = pt.post_id
        const tagName = pt.tags?.name

        if (tagName) {
          const existingTags = tagsMap.get(postId) || []
          tagsMap.set(postId, [...existingTags, tagName])
        }
      })
    } catch (error) {
      console.error('Error in fetchTagsForPosts:', error)
    }

    return tagsMap
  }
}