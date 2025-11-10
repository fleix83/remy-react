/**
 * Comment Deduplication Manager
 * Prevents duplicate comments when they are created locally and then received via real-time
 */

// Track recently created comments per post to avoid duplicates
// Key: postId, Value: Set of recently created comment IDs
const recentlyCreatedComments = new Map<number, Set<number>>()

// Clear old entries after a timeout
const DEDUP_TIMEOUT = 5000 // 5 seconds - enough time for real-time event to arrive

export const markCommentAsCreated = (postId: number, commentId: number) => {
  if (!recentlyCreatedComments.has(postId)) {
    recentlyCreatedComments.set(postId, new Set())
  }

  const postComments = recentlyCreatedComments.get(postId)!
  postComments.add(commentId)

  // Auto-cleanup after timeout
  setTimeout(() => {
    postComments.delete(commentId)
  }, DEDUP_TIMEOUT)
}

export const isCommentRecentlyCreated = (postId: number, commentId: number): boolean => {
  const postComments = recentlyCreatedComments.get(postId)
  return postComments ? postComments.has(commentId) : false
}

export const clearCommentFromCreated = (postId: number, commentId: number) => {
  const postComments = recentlyCreatedComments.get(postId)
  if (postComments) {
    postComments.delete(commentId)
  }
}
