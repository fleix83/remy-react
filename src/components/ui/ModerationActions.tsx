import React, { useState } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { ModerationService } from '../../services/moderation.service'

interface ModerationActionsProps {
  contentType: 'post' | 'comment'
  contentId: number
  contentUserId: string
  onContentDeleted?: () => void
  className?: string
}

const ModerationActions: React.FC<ModerationActionsProps> = ({
  contentType,
  contentId,
  contentUserId,
  onContentDeleted,
  className = ""
}) => {
  const permissions = usePermissions()
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const moderationService = new ModerationService()

  // Don't show anything if user has no permissions
  if (!permissions.canEditPost(contentUserId) && !permissions.canDeletePost(contentUserId)) {
    return null
  }

  const handleDelete = async () => {
    const confirmMessage = `Sind Sie sicher, dass Sie ${contentType === 'post' ? 'diesen Beitrag' : 'diesen Kommentar'} löschen möchten?`
    
    if (!confirm(confirmMessage)) return

    setIsDeleting(true)
    try {
      if (contentType === 'post') {
        await moderationService.deletePost(contentId, 'Moderator deletion')
      } else {
        await moderationService.deleteComment(contentId, 'Moderator deletion')
      }
      
      onContentDeleted?.()
      setShowMenu(false)
    } catch (error) {
      console.error(`Error deleting ${contentType}:`, error)
      alert(`Fehler beim Löschen ${contentType === 'post' ? 'des Beitrags' : 'des Kommentars'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded transition-colors"
        title="Moderation"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-20 min-w-32">
            {/* Edit functionality would be implemented here in the future */}
            
            {permissions.canDeletePost(contentUserId) && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? 'Löschen...' : 'Löschen'}
              </button>
            )}
            
            {/* Moderation info for moderators */}
            {permissions.canModerate && permissions.role !== 'user' && (
              <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Moderation: {permissions.role === 'admin' ? 'Admin' : 'Moderator'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ModerationActions