import React from 'react'
import UserAvatar from '../user/UserAvatar'
import type { ModerationQueueItem } from '../../types/database.types'

interface ModerationPreviewModalProps {
  isOpen: boolean
  item: ModerationQueueItem | null
  onClose: () => void
  onApprove: (item: ModerationQueueItem) => void
  onReject: (item: ModerationQueueItem) => void
  onDelete: (item: ModerationQueueItem) => void
  onMessage: (item: ModerationQueueItem) => void
  isProcessing: boolean
  postTitles: Record<number, string>
  categories: Record<number, string>
}

const ModerationPreviewModal: React.FC<ModerationPreviewModalProps> = ({
  isOpen,
  item,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onMessage,
  isProcessing,
  postTitles,
  categories
}) => {
  if (!isOpen || !item) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFirstLineOfComment = (content: string) => {
    // Remove HTML tags and get first line
    const plainText = content.replace(/<[^>]*>/g, '')
    const firstLine = plainText.split('\n')[0] || plainText
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine
  }

  const truncateTitle = (title: string, maxLength: number = 50) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a3442] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#1a3442] border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">Moderation Vorschau</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-lg font-medium bg-yellow-600 text-white text-sm">
              🔍 PREVIEW MODE
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Post Card Style Content */}
          <div className="bg-[#203f4a] p-6 relative" style={{borderRadius: '20px'}}>
            {/* Content Type Badge - Overlapping */}
            <span className={`absolute -top-2 left-4 z-10 inline-flex items-center px-2 py-0.5 rounded-lg font-medium shadow-lg ${
              item.content_type === 'post' 
                ? 'bg-gray-600 text-white' 
                : 'bg-blue-600 text-white'
            }`} style={{fontSize: '0.65rem'}}>
              {item.content_type === 'post' ? 'Beitrag' : 'Kommentar'}
            </span>
            {/* Header with Canton */}
            <div className="flex items-start justify-end mb-4">
              {/* Canton Badge - Top Right */}
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-600 text-white text-xs">
                BS
              </span>
            </div>

            {/* Category Badge - Above User Block */}
            {(item as any).category_id && (
              <div className="mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-medium bg-[#37a653] text-white" style={{fontSize: '0.65rem'}}>
                  {categories[(item as any).category_id] || 'Kategorie'}
                </span>
              </div>
            )}

            {/* User Info */}
            <div className="flex items-start space-x-3 mb-4">
              {item.users && (
                <UserAvatar 
                  user={item.users} 
                  size="small" 
                  className="flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-xs text-left leading-none">{item.users?.username}</p>
                <p className="text-xs text-gray-300 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(item.created_at)}</p>
              </div>
            </div>

            {/* Content Display */}
            <div className="mb-4">
              {item.content_type === 'post' ? (
                // For Posts: Show title and full content
                <div>
                  {item.title && (
                    <h1 className="text-base md:text-xl font-semibold text-[#37a653] mb-4 leading-tight text-left">
                      {item.title}
                    </h1>
                  )}
                  <div className="prose prose-gray max-w-none text-white leading-tight text-left text-sm">
                    <div dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                  </div>
                </div>
              ) : (
                // For Comments: Show quoted content + post reference + full content
                <div>
                  <div className="text-gray-300 text-sm mb-2 italic">
                    "{getFirstLineOfComment(item.content || '')}"
                  </div>
                  {item.post_id && (
                    <div className="text-xs text-gray-400 mb-4">
                      Kommentar zu: <span className="text-white">
                        {postTitles[item.post_id] ? truncateTitle(postTitles[item.post_id]) : `Post #${item.post_id}`}
                      </span>
                    </div>
                  )}
                  <div className="prose prose-gray max-w-none text-white leading-tight text-left text-sm border-l-2 border-gray-600 pl-4">
                    <div dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-center space-x-3">
            <button
              onClick={() => onMessage(item)}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Message
            </button>
            
            <button
              onClick={() => onDelete(item)}
              disabled={isProcessing}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Löschen
            </button>
            
            <button
              onClick={() => onReject(item)}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Ablehnen
            </button>
            
            <button
              onClick={() => onApprove(item)}
              disabled={isProcessing}
              className="bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {isProcessing ? 'Verarbeitung...' : 'Publizieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModerationPreviewModal