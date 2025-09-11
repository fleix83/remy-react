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
  const [replyingToUsername, setReplyingToUsername] = useState('')

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
    console.log('CommentsSection: Loading comments for postId:', postId)
    loadComments(postId).catch(error => {
      console.error('CommentsSection: Error loading comments:', error)
    })
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
      <div className="p-6" style={{borderRadius: '20px', background: '#ecffef'}}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden" style={{borderRadius: '20px', background: '#ecffef'}}>
      {/* Comments Header */}
      <div className="px-6 py-4" style={{background: '#d9f2de'}}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--type)]">
            Antworten ({commentCount})
          </h3>
          
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)] transition-colors"
          >
            {showCommentForm ? 'Abbrechen' : 'Antworten'}
          </button>
        </div>
      </div>

      {/* Main Comment Form */}
      {showCommentForm && (
        <div className="-mx-4 md:mx-0">
          <CommentForm
            postId={postId}
            quotedText={selectedText}
            replyingToUsername={replyingToUsername}
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
              setReplyingToUsername('')
            }}
            placeholder="Teile deine Gedanken zu diesem Beitrag..."
            fullWidth={true}
          />
        </div>
      )}

      {/* Comments List */}
      <div>
        {comments.length === 0 ? (
          <div className="px-6 py-8">
            <p className="text-center text-gray-500">
              Noch keine Antworten vorhanden. Sei der erste der antwortet!
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
            Weitere Kommentare laden...
          </button>
        </div>
      )}
    </div>
  )
}

export default CommentsSection