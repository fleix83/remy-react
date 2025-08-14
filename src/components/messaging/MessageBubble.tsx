import React, { useState } from 'react'
import { useMessagesStore } from '../../stores/messages.store'
import type { MessageWithUser } from '../../services/messages.service'

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

  const formatTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteMessage = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(message.id)
      } catch (error) {
        console.error('Error deleting message:', error)
        alert('Error deleting message')
      }
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
      {/* Avatar for received messages */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 bg-[#37a653] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold text-xs">
            {message.sender?.username?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
      )}
      
      {/* Spacer when avatar is not shown */}
      {!isOwn && !showAvatar && <div className="w-8" />}

      {/* Message Content */}
      <div 
        className={`max-w-xs lg:max-w-md relative group`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isOwn
              ? 'bg-[#37a653] text-white rounded-br-md'
              : 'bg-[#2a4a57] text-white rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Message Actions (only for own messages) */}
        {isOwn && showActions && (
          <div className="absolute top-0 right-0 -mr-8 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDeleteMessage}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete message"
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
            {formatTimestamp(message.created_at)}
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