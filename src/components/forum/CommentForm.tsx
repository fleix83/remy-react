import React, { useState, useEffect } from 'react'
import { CommentsService } from '../../services/comments.service'

interface CommentFormProps {
  postId: number
  parentCommentId?: number
  quotedText?: string
  onSubmit: () => void
  onCancel?: () => void
  placeholder?: string
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentCommentId,
  quotedText,
  onSubmit,
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
    
    if (!content.trim()) {
      alert('Bitte gib einen Kommentar ein')
      return
    }

    setSubmitting(true)
    
    try {
      await commentsService.createComment({
        post_id: postId,
        content: content.trim(),
        parent_comment_id: parentCommentId,
        quoted_text: selectedText || undefined
      })

      // Reset form
      setContent('')
      setSelectedText('')
      onSubmit()
    } catch (error) {
      console.error('Error creating comment:', error)
      alert('Fehler beim Erstellen des Kommentars')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuoteSelection = () => {
    const selection = window.getSelection()?.toString()
    if (selection) {
      setSelectedText(selection.trim())
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
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onMouseUp={handleQuoteSelection}
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 resize-vertical"
            rows={4}
            placeholder={placeholder}
            disabled={submitting}
          />
          
          {/* Quote Button */}
          <button
            type="button"
            onClick={handleQuoteSelection}
            className="absolute top-2 right-2 text-gray-400 hover:text-primary-600 transition-colors p-1"
            title="Text zitieren"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        {/* Character Count */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {content.length} Zeichen
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
              disabled={submitting || !content.trim()}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Wird gesendet...' : (parentCommentId ? 'Antworten' : 'Kommentieren')}
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