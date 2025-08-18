import React, { useEffect, useRef } from 'react'
import { useMessagesStore } from '../../stores/messages.store'
import { useAuthStore } from '../../stores/auth.store'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import ConversationHeader from './ConversationHeader'

const ConversationView: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    currentConversation, 
    currentMessages, 
    loadingMessages,
    setCurrentConversation 
  } = useMessagesStore()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && currentMessages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentMessages])

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Select a conversation</h3>
          <p className="text-gray-300">Choose a conversation from the sidebar to start messaging.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Header */}
      <ConversationHeader 
        conversation={currentConversation}
        onClose={() => setCurrentConversation(null)}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#1a3442]">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ebe7a]"></div>
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                Start a conversation with {currentConversation.participant.username}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentMessages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                showAvatar={
                  index === 0 || 
                  currentMessages[index - 1].sender_id !== message.sender_id
                }
                showTimestamp={
                  index === currentMessages.length - 1 || 
                  currentMessages[index + 1].sender_id !== message.sender_id ||
                  (new Date(currentMessages[index + 1].created_at).getTime() - new Date(message.created_at).getTime()) > 5 * 60 * 1000 // 5 minutes
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Composer */}
      <div className="border-t border-[#2a4a57] bg-[#203f4a]">
        <MessageComposer 
          recipientId={currentConversation.id}
          recipientUsername={currentConversation.participant.username}
        />
      </div>
    </div>
  )
}

export default ConversationView