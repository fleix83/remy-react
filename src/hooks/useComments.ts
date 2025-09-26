import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CommentsService } from '../services/comments.service'

const commentsService = new CommentsService()

// Query keys
export const commentsKeys = {
  all: ['comments'] as const,
  lists: () => [...commentsKeys.all, 'list'] as const,
  list: (postId: number) => [...commentsKeys.lists(), postId] as const,
  count: (postId: number) => [...commentsKeys.all, 'count', postId] as const,
}

// Get comments for a post
export function useComments(postId: number) {
  return useQuery({
    queryKey: commentsKeys.list(postId),
    queryFn: () => commentsService.getComments(postId),
    enabled: !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes - comments change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Enable real-time updates via background refetch
    refetchInterval: 30 * 1000, // 30 seconds for comments (real-time feel)
    refetchIntervalInBackground: false,
  })
}

// Get comment count for a post (separate from full comments for performance)
export function useCommentCount(postId: number) {
  return useQuery({
    queryKey: commentsKeys.count(postId),
    queryFn: () => commentsService.getCommentCount(postId),
    enabled: !!postId,
    staleTime: 1 * 60 * 1000, // 1 minute - counts change often
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create comment mutation
export function useCreateComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (commentData: {
      post_id: number
      content: string
    }) => commentsService.createComment(commentData),
    onSuccess: (newComment, variables) => {
      // Invalidate comments list for this post
      queryClient.invalidateQueries({ 
        queryKey: commentsKeys.list(variables.post_id) 
      })
      
      // Invalidate comment count
      queryClient.invalidateQueries({ 
        queryKey: commentsKeys.count(variables.post_id) 
      })
      
      // Invalidate posts list to update comment counts
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
    onError: (error) => {
      console.error('Error creating comment:', error)
    }
  })
}

// Update comment mutation
export function useUpdateComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ commentId, content }: { 
      commentId: number
      content: string 
    }) => commentsService.updateComment(commentId, content),
    onSuccess: (updatedComment) => {
      // Update the comments list cache with the updated comment
      const postId = updatedComment.post_id
      queryClient.setQueryData(
        commentsKeys.list(postId), 
        (oldComments: any[] = []) => 
          oldComments.map(comment => 
            comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
          )
      )
    },
    onError: (error) => {
      console.error('Error updating comment:', error)
    }
  })
}

// Delete comment mutation
export function useDeleteComment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ commentId, postId }: { 
      commentId: number
      postId: number 
    }) => {
      // Store postId for later use in onSuccess
      return commentsService.deleteComment(commentId).then(() => ({ commentId, postId }))
    },
    onSuccess: ({ commentId, postId }) => {
      // Remove comment from cache
      queryClient.setQueryData(
        commentsKeys.list(postId),
        (oldComments: any[] = []) => 
          oldComments.filter(comment => comment.id !== commentId)
      )
      
      // Invalidate comment count
      queryClient.invalidateQueries({ 
        queryKey: commentsKeys.count(postId) 
      })
      
      // Invalidate posts list to update comment counts
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
    onError: (error) => {
      console.error('Error deleting comment:', error)
    }
  })
}