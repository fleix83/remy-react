import React from 'react'
import { useMessagesStore } from '../../stores/messages.store'
import UserAvatar from '../user/UserAvatar'

const MessagesList: React.FC = () => {
  const { 
    conversations, 
    currentConversation, 
    loading,
    setCurrentConversation 
  } = useMessagesStore()

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Gestern'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    }
  }

  const truncateMessage = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-24 mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 mb-2">
              <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#2a4a57]">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        {conversations.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-2">No conversations yet</h3>
            <p className="text-xs text-gray-400">
              Start a conversation by messaging someone from their profile or a post.
            </p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setCurrentConversation(conversation)}
              className={`w-full p-4 text-left hover:bg-[#2a4a57] transition-colors border-b border-[#2a4a57]/50 ${
                currentConversation?.id === conversation.id 
                  ? 'bg-[#2a4a57] border-l-2 border-l-[#37a653]' 
                  : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <UserAvatar 
                  user={conversation.participant} 
                  size="small"
                  className="flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-white truncate">
                      {conversation.participant.username}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {/* Timestamp */}
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(conversation.lastActivity)}
                      </span>
                      {/* Unread count */}
                      {conversation.unreadCount > 0 && (
                        <div className="bg-[#37a653] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Last message preview */}
                  <p className="text-xs text-gray-300 truncate">
                    {truncateMessage(conversation.lastMessage.content)}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default MessagesList