import React, { useState, useEffect } from 'react'
import { useCommentsStore } from '../../stores/comments.store'
import CommentCard from './CommentCard'
import CommentForm from './CommentForm'

interface CommentsSectionProps {
  postId: number
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const {
    comments: allComments,
    loading: commentsLoading,
    loadComments,
    createComment,
    getCommentCount
  } = useCommentsStore()
  
  // Get comments for this specific post
  const comments = allComments[postId.toString()] || []
  const loading = commentsLoading[postId.toString()] || false
  const commentCount = getCommentCount(postId)

  useEffect(() => {
    loadComments(postId)
  }, [postId, loadComments])

  const handleCommentSubmit = async (commentData: any) => {
    try {
      await createComment(commentData)
      setShowCommentForm(false)
    } catch (error) {
      console.error('Error creating comment:', error)
      throw error
    }
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
            className="inline-flex items-center px-4 py-2 text-sm font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 shadow-md"
            style={{ 
              backgroundColor: '#0284c7', 
              fontWeight: 'bold',
              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showCommentForm ? '❌ Abbrechen' : '💬 Kommentar hinzufügen'}
          </button>
        </div>
      </div>

      {/* Main Comment Form */}
      {showCommentForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <CommentForm
            postId={postId}
            quotedText={selectedText}
            onCommentAdded={(comment) => {
              handleCommentSubmit({
                post_id: postId,
                content: comment.content,
                quoted_text: selectedText
              })
            }}
            onCancel={() => {
              setShowCommentForm(false)
              setSelectedText('')
            }}
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
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onReply={(_parentId, quotedText) => {
                  setSelectedText(quotedText || '')
                  setShowCommentForm(true)
                }}
                onUpdate={() => loadComments(postId)}
              />
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