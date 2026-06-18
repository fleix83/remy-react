import React, { useState, useEffect } from 'react'
import { useCommentsStore } from '../../stores/comments.store'
import RichTextEditor from '../ui/RichTextEditor'
import { toast } from '../../stores/toast.store'
import { useTranslation } from 'react-i18next'

interface CommentFormProps {
  postId: number
  parentCommentId?: number
  quotedText?: string
  replyingToUsername?: string
  onSubmit?: () => void
  onCommentAdded?: (comment: any) => void
  onCancel?: () => void
  placeholder?: string
  fullWidth?: boolean
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentCommentId: _parentCommentId, // Unused in current implementation
  quotedText,
  replyingToUsername,
  onSubmit,
  onCommentAdded,
  onCancel,
  placeholder,
  fullWidth = false
}) => {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const { createComment } = useCommentsStore()
  const { t } = useTranslation('forum')

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
      toast.info(t('comments.emptyError'))
      return
    }

    setSubmitting(true)

    try {
      // Add @username reference if replying to someone
      let finalContent = content.trim()
      if (replyingToUsername) {
        finalContent = `<p><strong>@${replyingToUsername}</strong></p>${finalContent}`
      }

      const newComment = await createComment({
        post_id: postId,
        content: finalContent
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
      toast.error(t('comments.createError'))
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
      <div className={`border-l-4 border-[var(--primary)] pl-3 mb-3 bg-[var(--bg-element-hover)] p-2 ${fullWidth ? 'mx-0' : 'rounded-r'}`}>
        <div className="flex items-start justify-between">
          <div className="text-sm text-gray-600 italic">
            "{selectedText}"
          </div>
          <button
            onClick={removeQuote}
            className="ml-2 text-gray-500 hover:text-gray-600 transition-colors"
            title={t('comments.removeQuote')}
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
    <div className={`${fullWidth ? 'bg-[var(--bg-element)] border-0 rounded-none px-6 py-8' : 'bg-[var(--bg-element)] rounded-lg p-4'}`}>
      <form onSubmit={handleSubmit}>
        {/* Replying To Display */}
        {replyingToUsername && (
          <div className="mb-3 flex items-center space-x-2">
            <span className="text-sm text-gray-600">{t('comments.replyingTo')}</span>
            <span className="text-sm font-semibold text-[var(--primary)]">@{replyingToUsername}</span>
          </div>
        )}

        {/* Quote Display */}
        {renderQuotedText()}

        {/* Comment Input */}
        <div className="relative">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder={placeholder ?? t('comments.placeholder')}
            minHeight={fullWidth ? "200px" : "120px"}
            autoFocus={!!replyingToUsername}
          />
        </div>

        {/* Character Count */}
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-gray-500">
            {t('comments.charCount', { count: content.replace(/<[^>]*>/g, '').length })}
          </span>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                disabled={submitting}
              >
                {t('common:actions.cancel')}
              </button>
            )}
            
            <button
              type="submit"
              disabled={submitting || !content.replace(/<[^>]*>/g, '').trim()}
              className="px-4 py-1.5 text-xs font-bold bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('comments.sending') : t('comments.submit')}
            </button>
          </div>
        </div>
      </form>

      {/* Help Text */}
      {!fullWidth && (
        <div className="mt-3 text-xs text-gray-500 border-t border-gray-300 pt-3">
          <div className="flex items-center space-x-4">
            <span>{t('comments.tipQuote')}</span>
            <span>• {t('comments.tipRespect')}</span>
            <span>• {t('comments.tipPrivacy')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentForm