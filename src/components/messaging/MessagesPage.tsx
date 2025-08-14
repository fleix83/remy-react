import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useMessagesStore, initializeMessagingAuth } from '../../stores/messages.store'
import MessagesList from './MessagesList'
import ConversationView from './ConversationView'

const MessagesPage: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    currentConversation, 
    loadConversations
  } = useMessagesStore()
  
  const [searchParams] = useSearchParams()
  
  useEffect(() => {
    // Initialize messaging auth listener
    initializeMessagingAuth()
    
    if (user) {
      loadConversations()
    }
  }, [user, loadConversations])

  // Handle post context from URL params
  useEffect(() => {
    const postTitle = searchParams.get('postTitle')
    const postId = searchParams.get('postId')
    
    if (postTitle && postId) {
      // Store post context for use in conversation
      sessionStorage.setItem('messageContext', JSON.stringify({
        postTitle,
        postId: parseInt(postId)
      }))
    }
  }, [searchParams])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a3442] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Authentication Required</h3>
          <p className="text-gray-300">
            Please log in to access your messages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a3442]">
      <div className="max-w-7xl mx-auto">
        <div className="flex h-screen">
          {/* Conversations Sidebar */}
          <div className="w-full md:w-1/3 lg:w-1/4 border-r border-[#2a4a57] bg-[#203f4a]">
            <MessagesList />
          </div>

          {/* Conversation View */}
          <div className="hidden md:flex md:w-2/3 lg:w-3/4 flex-col">
            {currentConversation ? (
              <ConversationView />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">Welcome to Messages</h3>
                  <p className="text-gray-300">
                    Select a conversation to start messaging, or start a new conversation from user profiles.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Conversation View */}
          {currentConversation && (
            <div className="md:hidden fixed inset-0 z-50 bg-[#1a3442]">
              <ConversationView />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessagesPage