import React, { useState } from 'react'
import { UserBlocksService } from '../../services/user-blocks.service'
import UserAvatar from '../user/UserAvatar'
import type { Conversation } from '../../services/messages.service'

interface ConversationHeaderProps {
  conversation: Conversation
  onClose: () => void
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onClose
}) => {
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const userBlocksService = new UserBlocksService()

  React.useEffect(() => {
    checkBlockStatus()
  }, [conversation.id])

  const checkBlockStatus = async () => {
    try {
      const blocked = await userBlocksService.isUserBlocked(conversation.id)
      setIsBlocked(blocked)
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }

  const handleToggleBlock = async () => {
    if (loading) return

    setLoading(true)
    try {
      const result = await userBlocksService.toggleBlockUser(conversation.id)
      setIsBlocked(result.action === 'blocked')
      
      const actionText = result.action === 'blocked' ? 'blocked' : 'unblocked'
      alert(`User has been ${actionText}`)
      
    } catch (error) {
      console.error('Error toggling block:', error)
      alert('Error updating block status: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#203f4a] border-b border-[#2a4a57] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back button (mobile only) */}
          <button 
            onClick={onClose}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* User Avatar */}
          <UserAvatar 
            user={conversation.participant} 
            size="small"
          />

          {/* User Info */}
          <div>
            <h2 className="font-semibold text-white">
              {conversation.participant.username}
            </h2>
            {isBlocked && (
              <span className="text-xs text-red-400">Blocked</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Block/Unblock Button */}
          <button
            onClick={handleToggleBlock}
            disabled={loading}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              isBlocked
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              isBlocked ? 'Unblock' : 'Block'
            )}
          </button>

          {/* More Options */}
          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationHeader