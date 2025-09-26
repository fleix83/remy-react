import { supabase } from '../lib/supabase'
import { withPerformanceTracking } from '../utils/performance-monitor'
import type { Post, PostWithRelations, Category, Designation } from '../types/database.types'

interface PostFilters {
  category?: number
  canton?: string
  therapist?: string
  designation?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export class PostsService {
  // Get all published posts with user and category information
  getPosts = withPerformanceTracking(
    async (filters?: PostFilters | number, includeUserBanned = false): Promise<PostWithRelations[]> => {
    // Handle legacy API (backward compatibility)
    let postFilters: PostFilters = {}
    if (typeof filters === 'number') {
      postFilters.category = filters
    } else if (filters) {
      postFilters = filters
    }

    // Use optimized query with selective fields and better JOIN strategy
    let query = supabase
      .from('posts')
      .select(`
        id, title, content, created_at, user_id, category_id, therapist_id, canton, designation,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
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

    if (postFilters.canton) {
      query = query.eq('canton', postFilters.canton)
    }

    if (postFilters.therapist) {
      // Search by therapist ID (therapist filter now expects therapist ID)
      query = query.eq('therapist_id', parseInt(postFilters.therapist))
    }

    if (postFilters.designation) {
      query = query.eq('designation', postFilters.designation)
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

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      throw error
    }

    // Fetch comment counts separately for better performance
    const postsWithComments = await this.addCommentCounts(data || [])
    return postsWithComments
  }, 'posts.getPosts')

  // Get a single post with full details
  getPost = withPerformanceTracking(
    async (id: number, includeUserBanned = false): Promise<PostWithRelations | null> => {
    let query = supabase
      .from('posts')
      .select(`
        id, title, content, created_at, updated_at, user_id, category_id, therapist_id, canton, designation, is_published, is_banned, moderation_status,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
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
      return postWithComments
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

    console.log('👤 PostsService: Authenticated user:', user.email, 'ID:', user.id)

    const insertData = {
      ...postData,
      user_id: user.id,
      is_published: false, // Always start as unpublished - requires moderation approval
      moderation_status: 'pending' as const,
      designation: 'Allgemein' // Provide default designation since it's required by DB
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

    console.log('✅ PostsService: Post created successfully:', data)
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
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, title, content, created_at, user_id, category_id, therapist_id, canton, designation,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_banned', false)
      .eq('moderation_status', 'approved')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching posts:', error)
      throw error
    }

    // Add comment counts separately
    const postsWithComments = await this.addCommentCounts(data || [])
    return postsWithComments
  }, 'posts.searchPosts')

  // Update an existing post
  async updatePost(id: number, updates: {
    title?: string
    content?: string
    category_id?: number
    canton?: string
    therapist_id?: number | null
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

    // First, verify the user owns this post
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
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

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    console.log('📤 PostsService: Updating post with data:', updateData)

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        id, title, content, created_at, updated_at, user_id, category_id, therapist_id, canton, designation, is_published, is_banned, moderation_status,
        users!posts_user_id_fkey(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
      .single()

    if (error) {
      console.error('❌ PostsService: Database error:', error)
      throw new Error('Database error: ' + error.message)
    }

    console.log('✅ PostsService: Post updated successfully:', data)
    return data
  }

  // Get all designations
  async getDesignations(): Promise<Designation[]> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .order('name_de', { ascending: true })

    if (error) {
      console.error('Error fetching designations:', error)
      // If designations table doesn't exist, return empty array
      return []
    }

    return data || []
  }

  // Helper method to add comment counts efficiently
  private async addCommentCounts(posts: any[]): Promise<PostWithRelations[]> {
    if (!posts || posts.length === 0) return []

    // Get all post IDs
    const postIds = posts.map(post => post.id)

    // Fetch comment counts in a single query
    const { data: commentCounts, error } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)

    if (error) {
      console.error('Error fetching comment counts:', error)
      // Return posts without comment counts rather than failing
      return posts.map(post => ({ ...post, comments: [] }))
    }

    // Count comments per post
    const countMap = new Map<number, number>()
    commentCounts?.forEach(comment => {
      const currentCount = countMap.get(comment.post_id) || 0
      countMap.set(comment.post_id, currentCount + 1)
    })

    // Add comment counts to posts
    return posts.map(post => ({
      ...post,
      comments: [{ count: countMap.get(post.id) || 0 }]
    }))
  }
}