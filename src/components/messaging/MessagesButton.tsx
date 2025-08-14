import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessagesStore } from '../../stores/messages.store'

interface MessagesButtonProps {
  className?: string
  showLabel?: boolean
}

const MessagesButton: React.FC<MessagesButtonProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  const navigate = useNavigate()
  const { unreadCount } = useMessagesStore()

  const handleClick = () => {
    navigate('/messages')
  }

  return (
    <button
      onClick={handleClick}
      className={`relative inline-flex items-center text-gray-300 hover:text-white transition-colors ${className}`}
      title="Messages"
    >
      {/* Message Icon */}
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
        />
      </svg>
      
      {/* Show label if requested */}
      {showLabel && (
        <span className="ml-2 text-sm">Messages</span>
      )}
      
      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  )
}

export default MessagesButton