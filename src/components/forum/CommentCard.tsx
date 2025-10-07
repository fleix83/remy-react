import React, { useState } from 'react'
import type { CommentWithRelations } from '../../types/database.types'
import { CommentsService } from '../../services/comments.service'
import UserAvatar from '../user/UserAvatar'
import SendMessageButton from '../messaging/SendMessageButton'

interface CommentCardProps {
  comment: CommentWithRelations
  onReply: (parentId: number, quotedText?: string) => void
  onUpdate: () => void
  depth?: number
}

const stripHtmlTags = (html: string) => {
  if (!html) return ''
  return html
    .replace(/<p[^>]*>/gi, '') // Remove opening p tags
    .replace(/<\/p>/gi, '\n') // Replace closing p tags with newlines
    .replace(/<br\s*\/?>/gi, '\n') // Replace br tags with newlines
    .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
    .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
    .trim()
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, onReply, onUpdate, depth = 0 }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(stripHtmlTags(comment.content))
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
      <div className="border-l-4 border-[var(--primary)] pl-3 mb-3 bg-[var(--bg-element-hover)] p-2 rounded-r">
        <div className="text-sm text-gray-600 italic">
          "{quotedText}"
        </div>
      </div>
    )
  }

  const marginLeft = Math.min(depth * 2, 8) // Max 4 levels deep

  return (
    <div className={`${depth > 0 ? `ml-${marginLeft}` : ''}`} style={{borderRadius: '16px', background: '#ecffef', padding: '16px'}}>
      {/* User Info */}
      <div className="flex items-start space-x-3 mb-4">
        <UserAvatar 
          user={comment.users || { id: comment.user_id || 'unknown', username: 'Unbekannt', avatar_url: null }} 
          size="small" 
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--type)] text-xs text-left leading-none">
            {comment.users?.username || 'Unbekannt'}
          </p>
          <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>
            {formatDate(comment.created_at)}
            {comment.updated_at && comment.updated_at !== comment.created_at && (
              <span className="text-gray-500 ml-1">(bearbeitet)</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Comment Actions */}
          <button
            onClick={() => {
              setEditContent(stripHtmlTags(comment.content))
              setIsEditing(true)
            }}
            className="text-gray-500 hover:text-[var(--primary)] transition-colors p-1"
            title="Bearbeiten"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-500 transition-colors p-1"
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
              className="w-full px-3 py-2 border border-gray-300 bg-white text-[var(--type)] rounded-md focus:ring-[#aedfb7] focus:border-[#aedfb7] resize-vertical"
              rows={4}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-sm bg-[var(--primary)] text-white rounded hover:bg-[var(--primary)] disabled:opacity-50"
                disabled={saving || !editContent.trim()}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="prose prose-sm max-w-none text-[var(--type)] text-sm leading-relaxed text-left"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
        )}
      </div>

      {/* Reply and Message Links */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Reply Link */}
          <button
            onClick={() => onReply(comment.id)}
            className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Antworten</span>
          </button>

          {/* Private Message Link */}
          {comment.users && comment.user_id && (
            <SendMessageButton
              recipientId={comment.user_id}
              recipientUsername={comment.users.username}
              variant="text-link"
            />
          )}
        </div>

        {/* Show/Hide Replies Toggle */}
        {comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-gray-500 hover:text-[var(--primary)] transition-colors"
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