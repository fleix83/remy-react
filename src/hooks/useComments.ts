import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { CommentsService } from '../services/comments.service'
import { useAuthStore } from '../stores/auth.store'

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

// Create comment mutation — optimistic so the new comment renders instantly,
// rolling back if the server rejects.
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentData: {
      post_id: number
      content: string
    }) => commentsService.createComment(commentData),
    onMutate: async ({ post_id, content }) => {
      const listKey = commentsKeys.list(post_id)
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<any[]>(listKey)

      const { user, userProfile } = useAuthStore.getState()
      const optimistic = {
        id: -Date.now(), // negative temp id; replaced on settle
        post_id,
        content,
        created_at: new Date().toISOString(),
        user_id: user?.id ?? null,
        users: userProfile
          ? {
              id: userProfile.id,
              username: userProfile.username,
              avatar_url: userProfile.avatar_url,
              role: userProfile.role,
            }
          : null,
        __optimistic: true,
      }

      queryClient.setQueryData<any[]>(listKey, (old = []) => [...old, optimistic])
      return { previous, postId: post_id }
    },
    onError: (error, _vars, context) => {
      console.error('Error creating comment:', error)
      if (context?.previous !== undefined) {
        queryClient.setQueryData(commentsKeys.list(context.postId), context.previous)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.list(variables.post_id) })
      queryClient.invalidateQueries({ queryKey: commentsKeys.count(variables.post_id) })
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })
}

// Update comment mutation — optimistic so the edited content shows immediately.
// We don't get the postId in the variables, so we scan list caches for the comment.
export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, content }: {
      commentId: number
      content: string
    }) => commentsService.updateComment(commentId, content),
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: commentsKeys.lists() })
      const lists = queryClient.getQueriesData<any[]>({ queryKey: commentsKeys.lists() })
      const snapshots: Array<{ key: QueryKey; data: any[] }> = []

      for (const [key, comments] of lists) {
        if (!comments) continue
        const idx = comments.findIndex((c) => c.id === commentId)
        if (idx >= 0) {
          snapshots.push({ key, data: comments })
          const next = comments.slice()
          next[idx] = { ...next[idx], content, updated_at: new Date().toISOString() }
          queryClient.setQueryData(key, next)
        }
      }

      return { snapshots }
    },
    onSuccess: (updatedComment) => {
      // Reconcile cache with the server's authoritative copy.
      const postId = updatedComment.post_id
      queryClient.setQueryData<any[]>(
        commentsKeys.list(postId),
        (oldComments = []) =>
          oldComments.map((comment) =>
            comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
          )
      )
    },
    onError: (error, _vars, context) => {
      console.error('Error updating comment:', error)
      context?.snapshots?.forEach(({ key, data }) => queryClient.setQueryData(key, data))
    },
  })
}

// Delete comment mutation — optimistic so the item disappears immediately.
export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, postId }: {
      commentId: number
      postId: number
    }) => {
      return commentsService.deleteComment(commentId).then(() => ({ commentId, postId }))
    },
    onMutate: async ({ commentId, postId }) => {
      const listKey = commentsKeys.list(postId)
      await queryClient.cancelQueries({ queryKey: listKey })
      const previous = queryClient.getQueryData<any[]>(listKey)
      queryClient.setQueryData<any[]>(listKey, (old = []) => old.filter((c) => c.id !== commentId))
      return { previous, postId }
    },
    onError: (error, _vars, context) => {
      console.error('Error deleting comment:', error)
      if (context?.previous !== undefined) {
        queryClient.setQueryData(commentsKeys.list(context.postId), context.previous)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: commentsKeys.list(variables.postId) })
      queryClient.invalidateQueries({ queryKey: commentsKeys.count(variables.postId) })
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    },
  })
}
