import { useInfiniteQuery, useMutation, useQueryClient, useQuery, keepPreviousData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PostsService } from '../services/posts.service'

const postsService = new PostsService()

interface PostFilters {
  category?: number
  cantons?: string[]
  therapist?: string
  designations?: number[]
  gender?: 'm' | 'f'
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

// Page-based query for posts (numbered pagination). Keeps the previous page
// on screen while the next one loads and prefetches the following page.
export const POSTS_PER_PAGE = 10

export function usePaginatedPosts(filters: Omit<PostFilters, 'page' | 'limit'>, page: number, includeUserBanned = false) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...postsKeys.list(filters), 'page', page],
    queryFn: () => postsService.getPostsPage({ ...filters, page, limit: POSTS_PER_PAGE }, includeUserBanned),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE))

  // Prefetch the next page so flipping forward feels instant
  useEffect(() => {
    if (query.data && page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: [...postsKeys.list(filters), 'page', page + 1],
        queryFn: () => postsService.getPostsPage({ ...filters, page: page + 1, limit: POSTS_PER_PAGE }, includeUserBanned),
        staleTime: 2 * 60 * 1000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, page, totalPages])

  return { ...query, total, totalPages }
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