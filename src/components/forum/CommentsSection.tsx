import React, { useState, useEffect } from 'react'
import { CommentsService } from '../../services/comments.service'
import CommentCard from './CommentCard'
import CommentForm from './CommentForm'
import type { CommentWithRelations } from '../../types/database.types'

interface CommentsSectionProps {
  postId: number
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
  const [comments, setComments] = useState<CommentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [quotedText, setQuotedText] = useState<string | undefined>()
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  const commentsService = new CommentsService()

  useEffect(() => {
    loadComments()
    loadCommentCount()
  }, [postId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const data = await commentsService.getComments(postId)
      setComments(data)
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCommentCount = async () => {
    try {
      const count = await commentsService.getCommentCount(postId)
      setCommentCount(count)
    } catch (error) {
      console.error('Error loading comment count:', error)
    }
  }

  const handleCommentSubmit = () => {
    setShowCommentForm(false)
    setReplyingTo(null)
    setQuotedText(undefined)
    loadComments()
    loadCommentCount()
  }

  const handleReply = (parentId: number, quotedText?: string) => {
    setReplyingTo(parentId)
    setQuotedText(quotedText)
    setShowCommentForm(false) // Hide main form when replying
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
    setQuotedText(undefined)
  }

  const getSortedCommentsWithReplies = () => {
    // The main comments already include their replies from the service
    return comments
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Comments Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-headline font-semibold text-gray-900">
            Kommentare ({commentCount})
          </h3>
          
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="inline-flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Kommentar hinzufügen
          </button>
        </div>
      </div>

      {/* Main Comment Form */}
      {showCommentForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <CommentForm
            postId={postId}
            onSubmit={handleCommentSubmit}
            onCancel={() => setShowCommentForm(false)}
            placeholder="Teile deine Gedanken zu diesem Beitrag..."
          />
        </div>
      )}

      {/* Comments List */}
      <div className="divide-y divide-gray-200">
        {comments.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Noch keine Kommentare</h4>
            <p className="text-gray-500 mb-4">
              Sei die erste Person, die einen Kommentar zu diesem Beitrag hinterlässt!
            </p>
            <button
              onClick={() => setShowCommentForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Ersten Kommentar schreiben
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {getSortedCommentsWithReplies().map((comment) => (
              <div key={comment.id}>
                <CommentCard
                  comment={comment}
                  onReply={handleReply}
                  onUpdate={loadComments}
                />
                
                {/* Inline Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-4 ml-8">
                    <CommentForm
                      postId={postId}
                      parentCommentId={comment.id}
                      quotedText={quotedText}
                      onSubmit={handleCommentSubmit}
                      onCancel={handleCancelReply}
                      placeholder={`Antwort auf ${comment.users?.username}...`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More Comments (placeholder for pagination) */}
      {comments.length > 0 && comments.length >= 10 && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <button className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
            Weitere Kommentare laden...
          </button>
        </div>
      )}
    </div>
  )
}

export default CommentsSection