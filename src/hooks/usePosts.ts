import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { PostsService } from '../services/posts.service'

const postsService = new PostsService()

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

// Query keys
export const postsKeys = {
  all: ['posts'] as const,
  lists: () => [...postsKeys.all, 'list'] as const,
  list: (filters?: PostFilters) => [...postsKeys.lists(), filters] as const,
  details: () => [...postsKeys.all, 'detail'] as const,
  detail: (id: number) => [...postsKeys.details(), id] as const,
  categories: ['categories'] as const,
  search: (term: string) => [...postsKeys.all, 'search', term] as const,
}

// Get posts with filters
export function usePosts(filters?: PostFilters, includeUserBanned = false) {
  return useQuery({
    queryKey: postsKeys.list(filters),
    queryFn: () => postsService.getPosts(filters, includeUserBanned),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Infinite query for posts with pagination
export function useInfinitePosts(filters?: Omit<PostFilters, 'page'>, includeUserBanned = false) {
  return useInfiniteQuery({
    queryKey: [...postsKeys.list(filters), 'infinite'],
    queryFn: ({ pageParam = 1 }) => 
      postsService.getPosts({ ...filters, page: pageParam, limit: 10 }, includeUserBanned),
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer than 10 items, we've reached the end
      if (lastPage.length < 10) return undefined
      return allPages.length + 1
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    initialPageParam: 1
  })
}

// Get single post
export function usePost(id: number, includeUserBanned = false) {
  return useQuery({
    queryKey: postsKeys.detail(id),
    queryFn: () => postsService.getPost(id, includeUserBanned),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get categories
export function useCategories() {
  return useQuery({
    queryKey: postsKeys.categories,
    queryFn: () => postsService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes - categories change rarely
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

// Search posts
export function useSearchPosts(searchTerm: string) {
  return useQuery({
    queryKey: postsKeys.search(searchTerm),
    queryFn: () => postsService.searchPosts(searchTerm),
    enabled: !!searchTerm.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute for search results
  })
}

// Create post mutation
export function useCreatePost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (postData: {
      title: string
      content: string
      category_id: number
      canton: string
      therapist_id?: number
      is_published?: boolean
    }) => postsService.createPost(postData),
    onSuccess: (_, variables) => {
      // Invalidate posts lists to refetch with new post
      queryClient.invalidateQueries({ queryKey: postsKeys.lists() })
      
      // Optimistically add to the category-specific list if we know the category
      if (variables.category_id) {
        queryClient.invalidateQueries({ 
          queryKey: postsKeys.list({ category: variables.category_id }) 
        })
      }
    },
    onError: (error) => {
      console.error('Error creating post:', error)
    }
  })
}

// Update post mutation
export function useUpdatePost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: number
      updates: {
        title?: string
        content?: string
        category_id?: number
        canton?: string
        therapist_id?: number | null
      }
    }) => postsService.updatePost(id, updates),
    onSuccess: (updatedPost, { id }) => {
      // Update the specific post in cache
      queryClient.setQueryData(postsKeys.detail(id), updatedPost)
      
      // Invalidate posts lists to reflect changes
      queryClient.invalidateQueries({ queryKey: postsKeys.lists() })
    },
    onError: (error) => {
      console.error('Error updating post:', error)
    }
  })
}