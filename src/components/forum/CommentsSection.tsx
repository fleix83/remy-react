import React, { useState, useEffect } from 'react'
import { useCommentsStore } from '../../stores/comments.store'
import CommentCard from './CommentCard'
import CommentForm from './CommentForm'
import { useTranslation } from 'react-i18next'

interface CommentsSectionProps {
  postId: number
  shouldOpenForm?: boolean
  replyToUsername?: string
  onFormStateChange?: (isOpen: boolean) => void
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, shouldOpenForm = false, replyToUsername, onFormStateChange }) => {
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [replyingToUsername, setReplyingToUsername] = useState('')
  const { t } = useTranslation('forum')

  // Open form when parent requests it
  useEffect(() => {
    if (shouldOpenForm && !showCommentForm) {
      setShowCommentForm(true)
      if (replyToUsername) {
        setReplyingToUsername(replyToUsername)
      }
      onFormStateChange?.(true)
    }
  }, [shouldOpenForm, showCommentForm, replyToUsername, onFormStateChange])

  const {
    comments: allComments,
    loading: commentsLoading,
    loadComments
  } = useCommentsStore()

  // Get comments for this specific post
  const comments = allComments[postId.toString()] || []
  const loading = commentsLoading[postId.toString()] || false

  useEffect(() => {
    console.log('CommentsSection: Loading comments for postId:', postId)
    loadComments(postId).catch(error => {
      console.error('CommentsSection: Error loading comments:', error)
    })
  }, [postId, loadComments])

  const handleCommentSubmit = async () => {
    try {
      // Just reset the form - the real-time subscription will handle adding the comment
      setShowCommentForm(false)
    } catch (error) {
      console.error('Error creating comment:', error)
      throw error
    }
  }


  if (loading) {
    return (
      <div className="p-6" style={{borderRadius: '20px', background: '#f6f9ff'}}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden" style={{borderRadius: '20px', background: '#f6f9ff'}}>
      {/* Main Comment Form */}
      {showCommentForm && (
        <div className="-mx-4 md:mx-0" id="comment-form">
          <CommentForm
            postId={postId}
            quotedText={selectedText}
            replyingToUsername={replyingToUsername}
            onCommentAdded={async () => {
              await handleCommentSubmit()
            }}
            onCancel={() => {
              setShowCommentForm(false)
              setSelectedText('')
              setReplyingToUsername('')
            }}
            placeholder={t('comments.placeholderPost')}
            fullWidth={true}
          />
        </div>
      )}

      {/* Comments List */}
      <div>
        {comments.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-center text-gray-500">
              {t('comments.empty')}
            </p>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-6">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onReply={(_parentId, quotedText) => {
                  setSelectedText(quotedText || '')
                  setReplyingToUsername(comment.users?.username || '')
                  setShowCommentForm(true)
                  // Scroll to comment form
                  setTimeout(() => {
                    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                }}
                onUpdate={() => loadComments(postId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More Comments (placeholder for pagination) */}
      {comments.length > 0 && comments.length >= 10 && (
        <div className="px-6 py-4 text-center">
          <button className="text-sm text-gray-500 hover:text-[var(--primary)] transition-colors">
            {t('comments.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

export default CommentsSection