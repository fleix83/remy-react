import React, { useState } from 'react'
import type { CommentWithRelations } from '../../types/database.types'
import { CommentsService } from '../../services/comments.service'

interface CommentCardProps {
  comment: CommentWithRelations
  onReply: (parentId: number, quotedText?: string) => void
  onUpdate: () => void
  depth?: number
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onReply, onUpdate, depth = 0 }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showReplies, setShowReplies] = useState(true)
  const [saving, setSaving] = useState(false)

  const commentsService = new CommentsService()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return

    setSaving(true)
    try {
      await commentsService.updateComment(comment.id, editContent.trim())
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Fehler beim Speichern des Kommentars')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Kommentar wirklich löschen?')) return

    try {
      await commentsService.deleteComment(comment.id)
      onUpdate()
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Fehler beim Löschen des Kommentars')
    }
  }

  const handleQuoteText = () => {
    const selectedText = window.getSelection()?.toString()
    if (selectedText) {
      onReply(comment.id, selectedText.trim())
    } else {
      onReply(comment.id)
    }
  }

  const renderQuotedText = (quotedText: string) => {
    return (
      <div className="border-l-4 border-gray-300 pl-3 mb-3 bg-gray-50 p-2 rounded-r">
        <div className="text-sm text-gray-600 italic">
          "{quotedText}"
        </div>
      </div>
    )
  }

  const marginLeft = Math.min(depth * 2, 8) // Max 4 levels deep

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${depth > 0 ? `ml-${marginLeft}` : ''}`}>
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-xs">
              {comment.users?.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <span className="font-medium text-sm text-gray-900">{comment.users?.username}</span>
            <span className="text-xs text-gray-500 ml-2">{formatDate(comment.created_at)}</span>
            {comment.updated_at && comment.updated_at !== comment.created_at && (
              <span className="text-xs text-gray-400 ml-1">(bearbeitet)</span>
            )}
          </div>
        </div>

        {/* Comment Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleQuoteText}
            className="text-gray-400 hover:text-primary-600 transition-colors p-1"
            title="Zitieren"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-primary-600 transition-colors p-1"
            title="Bearbeiten"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 transition-colors p-1"
            title="Löschen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quoted Text */}
      {comment.quoted_text && renderQuotedText(comment.quoted_text)}

      {/* Comment Content */}
      <div className="mb-3">
        {isEditing ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 resize-vertical"
              rows={4}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                disabled={saving || !editContent.trim()}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
            {comment.content}
          </div>
        )}
      </div>

      {/* Reply Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onReply(comment.id)}
          className="text-xs text-gray-500 hover:text-primary-600 transition-colors"
        >
          Antworten
        </button>

        {comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-gray-500 hover:text-primary-600 transition-colors"
          >
            {showReplies ? 'Antworten ausblenden' : `${comment.replies.length} Antworten anzeigen`}
          </button>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && showReplies && (
        <div className="mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onUpdate={onUpdate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CommentCard