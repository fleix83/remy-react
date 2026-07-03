import React, { useState, useRef, useEffect } from 'react'
import { useMessagesStore } from '../../stores/messages.store'
import UserAvatar from '../user/UserAvatar'
import type { MessageWithUser } from '../../services/messages.service'
import { toast } from '../../stores/toast.store'
import { confirmDialog } from '../../stores/confirm.store'
import { useTranslation } from 'react-i18next'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'

interface MessageBubbleProps {
  message: MessageWithUser
  isOwn: boolean
  showAvatar: boolean
  showTimestamp: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp
}) => {
  const { deleteMessage } = useMessagesStore()
  const [showActions, setShowActions] = useState(false)
  // Long-press reveal for touch devices (no hover there). Auto-hides again.
  const [touchRevealed, setTouchRevealed] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const { t } = useTranslation('messaging')
  const lang = useActiveLanguage()

  useEffect(() => {
    if (!touchRevealed) return
    const timeout = setTimeout(() => setTouchRevealed(false), 4000)
    return () => clearTimeout(timeout)
  }, [touchRevealed])

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOwn) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    cancelLongPress()
    longPressTimer.current = setTimeout(() => setTouchRevealed(true), 500)
  }

  // Scrolling must never count as a long press.
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimer.current || !touchStart.current) return
    const touch = e.touches[0]
    if (
      Math.abs(touch.clientX - touchStart.current.x) > 10 ||
      Math.abs(touch.clientY - touchStart.current.y) > 10
    ) {
      cancelLongPress()
    }
  }

  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString(intlLocale(lang), {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteMessage = async () => {
    if (await confirmDialog({ message: t('bubble.deleteConfirm'), confirmLabel: t('common:actions.delete'), danger: true })) {
      try {
        await deleteMessage(message.id)
      } catch (error) {
        console.error('Error deleting message:', error)
        toast.error(t('bubble.deleteError'))
      }
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && message.sender && (
        <UserAvatar
          user={message.sender}
          size="small"
          className="flex-shrink-0"
          clickable
        />
      )}
      
      {/* Spacer when avatar is not shown */}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Message Content */}
      <div
        className={`max-w-xs lg:max-w-md relative group`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onClick={() => touchRevealed && setTouchRevealed(false)}
        // Suppress iOS text-selection/callout on own bubbles so a long press
        // reveals the delete action instead of the selection magnifier.
        style={isOwn ? { WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties : undefined}
      >
        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isOwn
              ? 'bg-[var(--primary)] text-white rounded-br-md'
              : 'bg-[var(--bg-erfahrung)] text-black rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Message Actions (only for own messages) — revealed by hover on
            desktop, by long-press on touch. Sits on the free (left) side of
            the right-aligned own bubble so it can't clip at the screen edge. */}
        {isOwn && (showActions || touchRevealed) && (
          <div
            className={`absolute top-0 left-0 -ml-8 flex items-center space-x-1 transition-opacity ${
              touchRevealed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteMessage()
              }}
              className={`p-1 transition-colors ${
                touchRevealed ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
              title={t('bubble.deleteTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
            {message.created_at ? formatTimestamp(message.created_at) : t('unknownDate')}
            {isOwn && (
              <span className="ml-1">
                {message.is_read ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble