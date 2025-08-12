import React, { useState, useEffect } from 'react'
import { CommentsService } from '../../services/comments.service'
import RichTextEditor from '../ui/RichTextEditor'

interface CommentFormProps {
  postId: number
  parentCommentId?: number
  quotedText?: string
  onSubmit?: () => void
  onCommentAdded?: (comment: any) => void
  onCancel?: () => void
  placeholder?: string
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentCommentId,
  quotedText,
  onSubmit,
  onCommentAdded,
  onCancel,
  placeholder = "Schreibe einen Kommentar..."
}) => {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const commentsService = new CommentsService()

  useEffect(() => {
    if (quotedText) {
      setSelectedText(quotedText)
    }
  }, [quotedText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check text content without HTML tags
    const textContent = content.replace(/<[^>]*>/g, '').trim()
    if (!textContent) {
      alert('Bitte gib einen Kommentar ein')
      return
    }

    setSubmitting(true)
    
    try {
      const newComment = await commentsService.createComment({
        post_id: postId,
        content: content.trim()
      })

      // Reset form
      setContent('')
      setSelectedText('')
      
      if (onCommentAdded) {
        onCommentAdded(newComment)
      }
      if (onSubmit) {
        onSubmit()
      }
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('Fehler beim Erstellen des Kommentars')
    } finally {
      setSubmitting(false)
    }
  }


  const removeQuote = () => {
    setSelectedText('')
  }

  const renderQuotedText = () => {
    if (!selectedText) return null

    return (
      <div className="border-l-4 border-primary-300 pl-3 mb-3 bg-primary-50 p-2 rounded-r">
        <div className="flex items-start justify-between">
          <div className="text-sm text-gray-600 italic">
            "{selectedText}"
          </div>
          <button
            onClick={removeQuote}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Zitat entfernen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <form onSubmit={handleSubmit}>
        {/* Quote Display */}
        {renderQuotedText()}

        {/* Comment Input */}
        <div className="relative">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder={placeholder}
            minHeight="120px"
          />
        </div>

        {/* Character Count */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {content.replace(/<[^>]*>/g, '').length} Zeichen (ohne HTML)
          </span>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={submitting}
              >
                Abbrechen
              </button>
            )}
            
            <button
              type="submit"
              disabled={submitting || !content.replace(/<[^>]*>/g, '').trim()}
              className="px-6 py-2 text-sm font-bold bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md"
              style={{ 
                backgroundColor: '#0284c7', 
                fontWeight: 'bold',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {submitting ? '📤 Wird gesendet...' : '💬 Kommentieren'}
            </button>
          </div>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
        <div className="flex items-center space-x-4">
          <span>💡 Tipp: Markiere Text um ihn zu zitieren</span>
          <span>• Behandle andere respektvoll</span>
          <span>• Teile keine persönlichen Daten</span>
        </div>
      </div>
    </div>
  )
}

export default CommentForm