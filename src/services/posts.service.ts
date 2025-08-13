import { supabase } from '../lib/supabase'
import type { Post, PostWithRelations, Category } from '../types/database.types'

export class PostsService {
  // Get all published posts with user and category information
  async getPosts(categoryId?: number): Promise<PostWithRelations[]> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_banned', false)
      .order('created_at', { ascending: false })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      throw error
    }

    return data || []
  }

  // Get a single post with full details
  async getPost(id: number): Promise<PostWithRelations | null> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_banned', false)
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      throw error
    }

    return data
  }

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
      is_published: postData.is_published ?? true,
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
  async getCategories(): Promise<Category[]> {
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
  }

  // Search posts
  async searchPosts(searchTerm: string): Promise<PostWithRelations[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, username, avatar_url, role),
        categories!inner(id, name_de, name_fr, name_it),
        therapists(id, form_of_address, first_name, last_name, designation, institution, canton)
      `)
      .eq('is_published', true)
      .eq('is_active', true)
      .eq('is_banned', false)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching posts:', error)
      throw error
    }

    return data || []
  }

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
        *,
        users!inner(id, username, avatar_url, role),
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
}