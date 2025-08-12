import { create } from 'zustand'
import { CommentsService } from '../services/comments.service'
import type { Comment, CommentWithRelations } from '../types/database.types'

interface CommentsState {
  // Comments by post ID
  comments: Record<string, CommentWithRelations[]>
  loading: Record<string, boolean>
  
  // Actions
  loadComments: (postId: number) => Promise<void>
  addComment: (postId: number, comment: CommentWithRelations) => void
  addCommentOptimistic: (postId: number, tempComment: CommentWithRelations) => void
  updateComment: (postId: number, commentId: number, updates: Partial<Comment>) => void
  deleteComment: (postId: number, commentId: number) => void
  createComment: (postData: {
    post_id: number
    content: string
    parent_comment_id?: number
    quoted_text?: string
  }) => Promise<Comment>
  editComment: (commentId: number, content: string) => Promise<void>
  removeComment: (commentId: number) => Promise<void>
  getCommentCount: (postId: number) => number
}

const commentsService = new CommentsService()

// Helper function to add comment to the right place in tree
const addCommentToTree = (
  comments: CommentWithRelations[], 
  newComment: CommentWithRelations
): CommentWithRelations[] => {
  if (!newComment.parent_comment_id) {
    // Top-level comment
    return [newComment, ...comments]
  }
  
  // Reply to existing comment
  return comments.map(comment => {
    if (comment.id === newComment.parent_comment_id) {
      return {
        ...comment,
        replies: comment.replies 
          ? [newComment, ...comment.replies]
          : [newComment]
      }
    }
    
    // Check if it's a reply to a reply
    if (comment.replies) {
      return {
        ...comment,
        replies: addCommentToTree(comment.replies, newComment)
      }
    }
    
    return comment
  })
}

// Helper function to update comment in tree
const updateCommentInTree = (
  comments: CommentWithRelations[],
  commentId: number,
  updates: Partial<Comment>
): CommentWithRelations[] => {
  return comments.map(comment => {
    if (comment.id === commentId) {
      return { ...comment, ...updates }
    }
    
    if (comment.replies) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updates)
      }
    }
    
    return comment
  })
}

// Helper function to remove comment from tree
const removeCommentFromTree = (
  comments: CommentWithRelations[],
  commentId: number
): CommentWithRelations[] => {
  return comments
    .filter(comment => comment.id !== commentId)
    .map(comment => {
      if (comment.replies) {
        return {
          ...comment,
          replies: removeCommentFromTree(comment.replies, commentId)
        }
      }
      return comment
    })
}

// Helper function to count comments recursively
const countCommentsInTree = (comments: CommentWithRelations[]): number => {
  return comments.reduce((count, comment) => {
    let total = 1 // Count the comment itself
    if (comment.replies) {
      total += countCommentsInTree(comment.replies)
    }
    return count + total
  }, 0)
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: {},
  loading: {},

  loadComments: async (postId: number) => {
    const postKey = postId.toString()
    
    try {
      set(state => ({
        loading: { ...state.loading, [postKey]: true }
      }))
      
      const comments = await commentsService.getComments(postId)
      
      set(state => ({
        comments: { ...state.comments, [postKey]: comments }
      }))
    } catch (error) {
      console.error('Error loading comments:', error)
      throw error
    } finally {
      set(state => ({
        loading: { ...state.loading, [postKey]: false }
      }))
    }
  },

  addComment: (postId: number, comment: CommentWithRelations) => {
    const postKey = postId.toString()
    
    set(state => {
      const existingComments = state.comments[postKey] || []
      const updatedComments = addCommentToTree(existingComments, comment)
      
      return {
        comments: { ...state.comments, [postKey]: updatedComments }
      }
    })
  },

  addCommentOptimistic: (postId: number, tempComment: CommentWithRelations) => {
    get().addComment(postId, tempComment)
  },

  updateComment: (postId: number, commentId: number, updates: Partial<Comment>) => {
    const postKey = postId.toString()
    
    set(state => {
      const existingComments = state.comments[postKey] || []
      const updatedComments = updateCommentInTree(existingComments, commentId, updates)
      
      return {
        comments: { ...state.comments, [postKey]: updatedComments }
      }
    })
  },

  deleteComment: (postId: number, commentId: number) => {
    const postKey = postId.toString()
    
    set(state => {
      const existingComments = state.comments[postKey] || []
      const updatedComments = removeCommentFromTree(existingComments, commentId)
      
      return {
        comments: { ...state.comments, [postKey]: updatedComments }
      }
    })
  },

  createComment: async (commentData: {
    post_id: number
    content: string
    parent_comment_id?: number
    quoted_text?: string
  }) => {
    try {
      const comment = await commentsService.createComment(commentData)
      
      // Add to store immediately
      get().addComment(commentData.post_id, comment as CommentWithRelations)
      
      return comment
    } catch (error) {
      console.error('Error creating comment:', error)
      throw error
    }
  },

  editComment: async (commentId: number, content: string) => {
    try {
      await commentsService.updateComment(commentId, content)
      
      // Find which post this comment belongs to and update it
      const { comments } = get()
      for (const [postKey, _postComments] of Object.entries(comments)) {
        const postId = parseInt(postKey)
        get().updateComment(postId, commentId, {
          content,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error editing comment:', error)
      throw error
    }
  },

  removeComment: async (commentId: number) => {
    try {
      await commentsService.deleteComment(commentId)
      
      // Find which post this comment belongs to and remove it
      const { comments } = get()
      for (const [postKey, _postComments] of Object.entries(comments)) {
        const postId = parseInt(postKey)
        get().deleteComment(postId, commentId)
      }
    } catch (error) {
      console.error('Error removing comment:', error)
      throw error
    }
  },

  getCommentCount: (postId: number) => {
    const postKey = postId.toString()
    const comments = get().comments[postKey] || []
    return countCommentsInTree(comments)
  }
}))