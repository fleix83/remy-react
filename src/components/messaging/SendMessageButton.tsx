import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useMessagesStore } from '../../stores/messages.store'
import { MessagesService } from '../../services/messages.service'

interface SendMessageButtonProps {
  recipientId: string
  recipientUsername: string
  postTitle?: string
  postId?: number
  className?: string
  variant?: 'default' | 'small' | 'icon-only'
}

const SendMessageButton: React.FC<SendMessageButtonProps> = ({
  recipientId,
  recipientUsername,
  postTitle,
  postId,
  className = '',
  variant = 'default'
}) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { findOrCreateConversation, setCurrentConversation } = useMessagesStore()
  const [canMessage, setCanMessage] = useState<{ canMessage: boolean; reason?: string }>({ canMessage: false })
  const [loading, setLoading] = useState(true)

  const messagesService = new MessagesService()

  useEffect(() => {
    checkMessagingPermission()
  }, [recipientId, user])

  const checkMessagingPermission = async () => {
    if (!user || !recipientId) {
      setLoading(false)
      return
    }

    try {
      const result = await messagesService.canMessageUser(recipientId)
      setCanMessage(result)
    } catch (error) {
      console.error('Error checking messaging permission:', error)
      setCanMessage({ canMessage: false, reason: 'Error checking permissions' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !canMessage.canMessage) return

    try {
      // Create or find conversation
      const conversation = await findOrCreateConversation(recipientId, {
        id: recipientId,
        username: recipientUsername
      })

      // Set as current conversation
      setCurrentConversation(conversation)

      // Navigate to messages with optional post context
      const searchParams = new URLSearchParams()
      if (postTitle && postId) {
        searchParams.set('postTitle', postTitle)
        searchParams.set('postId', postId.toString())
      }
      
      const queryString = searchParams.toString()
      navigate(`/messages?${queryString}`)
      
    } catch (error) {
      console.error('Error starting conversation:', error)
      alert('Fehler beim Öffnen der Unterhaltung')
    }
  }

  // Don't render if loading or user can't message
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-20 bg-gray-600 rounded"></div>
      </div>
    )
  }

  if (!canMessage.canMessage) {
    // For debugging - you may want to remove this or make it conditional
    if (canMessage.reason && process.env.NODE_ENV === 'development') {
      console.log(`Cannot message ${recipientUsername}: ${canMessage.reason}`)
    }
    return null
  }

  // Render button based on variant
  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleSendMessage}
        className={`inline-flex items-center justify-center p-2 text-gray-300 hover:text-white transition-colors ${className}`}
        title={`Send message to ${recipientUsername}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    )
  }

  if (variant === 'small') {
    return (
      <button
        onClick={handleSendMessage}
        className={`inline-flex items-center space-x-1 px-2 py-1 text-xs text-gray-300 hover:text-white transition-colors border border-gray-600 hover:border-gray-500 rounded ${className}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Message</span>
      </button>
    )
  }

  // Default variant
  return (
    <button
      onClick={handleSendMessage}
      className={`inline-flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors border border-gray-600 hover:border-gray-500 rounded-md ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span>Send Message</span>
    </button>
  )
}

export default SendMessageButton