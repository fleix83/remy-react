import { create } from 'zustand'
import { PostsService } from '../services/posts.service'
import type { PostWithRelations, Category } from '../types/database.types'

interface PostFilters {
  category?: number
  canton?: string
  therapist?: number
  search?: string
}

interface PaginationState {
  page: number
  limit: number
  hasMore: boolean
  total: number
}

interface ForumState {
  // Posts
  posts: PostWithRelations[]
  currentPost: PostWithRelations | null
  loading: boolean
  
  // Filters & Pagination
  filters: PostFilters
  pagination: PaginationState
  
  // Categories
  categories: Category[]
  categoriesLoading: boolean
  
  // Actions
  loadPosts: (filters?: PostFilters) => Promise<void>
  loadMorePosts: () => Promise<void>
  loadPost: (id: number) => Promise<void>
  createPost: (postData: any) => Promise<void>
  updatePost: (id: number, updates: {
    title?: string
    content?: string
    category_id?: number
    canton?: string
    therapist_id?: number | null
  }) => Promise<void>
  deletePost: (id: number) => Promise<void>
  setFilters: (filters: Partial<PostFilters>) => void
  clearFilters: () => void
  loadCategories: () => Promise<void>
  searchPosts: (searchTerm: string) => Promise<void>
}

const initialPagination: PaginationState = {
  page: 1,
  limit: 20,
  hasMore: true,
  total: 0
}

const postsService = new PostsService()

export const useForumStore = create<ForumState>((set, get) => ({
  // Initial state
  posts: [],
  currentPost: null,
  loading: false,
  filters: {},
  pagination: initialPagination,
  categories: [],
  categoriesLoading: false,

  // Load posts with filters
  loadPosts: async (filters?: PostFilters) => {
    try {
      set({ loading: true })
      
      if (filters) {
        set({ filters, pagination: initialPagination })
      }
      
      const currentFilters = filters || get().filters
      const data = await postsService.getPosts(currentFilters.category)
      
      set({ 
        posts: data,
        pagination: {
          ...get().pagination,
          total: data.length,
          hasMore: data.length >= get().pagination.limit
        }
      })
    } catch (error) {
      console.error('Error loading posts:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Load more posts (pagination)
  loadMorePosts: async () => {
    const { pagination, filters, posts } = get()
    if (!pagination.hasMore) return
    
    try {
      set({ loading: true })
      
      const nextPage = pagination.page + 1
      // Note: This would need to be implemented in the PostsService
      // For now, we'll just simulate it
      const newPosts = await postsService.getPosts(filters.category)
      
      set({
        posts: [...posts, ...newPosts],
        pagination: {
          ...pagination,
          page: nextPage,
          hasMore: newPosts.length >= pagination.limit
        }
      })
    } catch (error) {
      console.error('Error loading more posts:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Load single post
  loadPost: async (id: number) => {
    try {
      set({ loading: true })
      const post = await postsService.getPost(id)
      set({ currentPost: post })
    } catch (error) {
      console.error('Error loading post:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Create new post
  createPost: async (postData: any) => {
    try {
      const newPost = await postsService.createPost(postData)
      
      // Add to beginning of posts list
      set(state => ({
        posts: [newPost as PostWithRelations, ...state.posts]
      }))
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  },

  // Update post
  updatePost: async (id: number, updates: {
    title?: string
    content?: string
    category_id?: number
    canton?: string
    therapist_id?: number | null
  }) => {
    try {
      console.log('🔧 ForumStore: Updating post:', id, updates)
      
      const postsService = new PostsService()
      await postsService.updatePost(id, updates)
      
      console.log('✅ ForumStore: Post updated successfully')
      
      // Update posts array by reloading the specific post
      const postsService2 = new PostsService()
      const updatedPost = await postsService2.getPost(id)
      
      if (updatedPost) {
        set(state => ({
          posts: state.posts.map(post => 
            post.id === id ? updatedPost : post
          ),
          currentPost: state.currentPost?.id === id ? updatedPost : state.currentPost
        }))
      }
    } catch (error) {
      console.error('❌ ForumStore: Error updating post:', error)
      throw error
    }
  },

  // Delete post
  deletePost: async (id: number) => {
    try {
      // Note: This would need to be implemented in PostsService
      set(state => ({
        posts: state.posts.filter(post => post.id !== id),
        currentPost: state.currentPost?.id === id ? null : state.currentPost
      }))
    } catch (error) {
      console.error('Error deleting post:', error)
      throw error
    }
  },

  // Set filters
  setFilters: (filters: Partial<PostFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      pagination: initialPagination
    }))
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: {},
      pagination: initialPagination
    })
  },

  // Load categories
  loadCategories: async () => {
    try {
      set({ categoriesLoading: true })
      const categories = await postsService.getCategories()
      set({ categories })
    } catch (error) {
      console.error('Error loading categories:', error)
      throw error
    } finally {
      set({ categoriesLoading: false })
    }
  },

  // Search posts
  searchPosts: async (searchTerm: string) => {
    try {
      set({ loading: true })
      const posts = await postsService.searchPosts(searchTerm)
      set({ 
        posts,
        filters: { ...get().filters, search: searchTerm },
        pagination: {
          ...initialPagination,
          total: posts.length
        }
      })
    } catch (error) {
      console.error('Error searching posts:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  }
}))

// Auto-load categories when store is created
useForumStore.getState().loadCategories()