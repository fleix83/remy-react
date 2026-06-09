import React from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../user/UserAvatar'
import type { ModerationQueueItem } from '../../types/database.types'
import { getPostDisplayTitle } from '../../utils/text.utils'

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

// Same tint scale as the queue cards: #fff9e2 base, hue-shifted per type
const cardTint: Record<string, string> = {
  post: 'bg-[#fff9e2]',
  comment: 'bg-[#ffeee2]',
  therapist: 'bg-[#edf6e2]'
}

const badgeTint: Record<string, string> = {
  post: 'bg-[var(--primary)]',
  comment: 'bg-[#fa8072]',
  therapist: 'bg-[#37a653]'
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateTitle = (title: string, maxLength: number = 50) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title
  }

  return (
    <div className="fixed inset-0 bg-[#f8f5e6] flex items-center justify-center z-50 overflow-x-hidden">
      <div className="w-full h-full overflow-y-auto overflow-x-hidden hide-scrollbar-desktop">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#f8f5e6] px-4 md:px-6 pb-2" style={{ paddingTop: '35px' }}>
          <button
            onClick={onClose}
            className="absolute text-gray-500 hover:text-gray-700 md:text-[var(--primary)] md:hover:text-[#3b71e6] transition-colors p-1 top-[35px] right-[25px] md:top-[50px] md:right-[50px]"
          >
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="py-6 px-4 max-w-6xl lg:max-w-[78rem] mx-auto">
          {/* Post Card Style Content */}
          <div className={`${cardTint[item.content_type]} p-6 relative shadow-[0_2px_12px_rgba(20,66,32,0.05)]`} style={{borderRadius: '20px'}}>
            {/* Content Type Badge - Overlapping */}
            <span
              className={`absolute -top-2 left-4 z-10 inline-flex items-center px-2 py-0.5 rounded-lg font-medium shadow-md text-white ${badgeTint[item.content_type]}`}
              style={{fontSize: '0.65rem'}}
            >
              {item.content_type === 'post' ? 'Beitrag' : item.content_type === 'therapist' ? 'Therapeut' : 'Kommentar'}
            </span>
            {/* Header with Canton */}
            <div className="flex items-start justify-end mb-4">
              {/* Canton Flag and Abbreviation */}
              {item.canton && (
                <div className="flex items-center space-x-2">
                  <img
                    src={`/kantone/${item.canton.toLowerCase()}.png`}
                    alt={`${item.canton} flag`}
                    className="w-4 h-auto object-cover"
                    loading="lazy"
                    decoding="async"
                    width={16}
                    height={11}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <span className="text-gray-500 text-xs font-medium">
                    {item.canton}
                  </span>
                </div>
              )}
            </div>

            {/* Category Badge - Above User Block */}
            {(item as any).category_id && (
              <div className="mb-2 flex justify-start">
                <span className="inline-flex items-center px-2 py-0.5 font-medium bg-[var(--primary)] text-white" style={{fontSize: '0.65rem', borderRadius: '3px'}}>
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
                <p className="font-medium text-[var(--type)] text-xs text-left leading-none">{item.users?.username}</p>
                <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(item.created_at)}</p>
              </div>
            </div>

            {/* Content Display */}
            <div className="mb-4">
              {item.content_type === 'post' ? (
                // For Posts: Show title (auto-generated for Rant posts) and full content
                <div>
                  <h1 className="text-base md:text-xl font-semibold text-[var(--post-title)] mb-4 leading-tight text-left">
                    {getPostDisplayTitle(item.title, item.content || '', item.category_id || 1)}
                  </h1>
                  <div className="prose prose-gray max-w-none text-[var(--type)] leading-relaxed text-left text-sm md:text-[15px]">
                    <div dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                  </div>
                </div>
              ) : item.content_type === 'therapist' ? (
                // For Therapists: name + designation
                <div>
                  <Link
                    to={`/therapeuten/${item.id}`}
                    className="text-base md:text-xl font-semibold leading-tight text-left block mb-1 text-[var(--primary)] hover:underline"
                  >
                    {item.first_name} {item.last_name}
                  </Link>
                  {item.designation && (
                    <div className="text-sm text-gray-600 text-left">
                      {item.designation}
                    </div>
                  )}
                </div>
              ) : (
                // For Comments: post reference + full content
                <div>
                  {item.post_id && (
                    <div className="text-xs text-gray-500 mb-4 text-left">
                      Kommentar zu: <Link
                        to={`/post/${item.post_id}`}
                        className="text-[var(--primary)] hover:underline"
                      >
                        {postTitles[item.post_id] ? truncateTitle(postTitles[item.post_id]) : `Post #${item.post_id}`}
                      </Link>
                    </div>
                  )}
                  <div className="prose prose-gray max-w-none text-[var(--type)] leading-relaxed text-left text-sm md:text-[15px] border-l-2 border-[#fa8072] pl-4">
                    <div dangerouslySetInnerHTML={{ __html: item.content || '' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - profile-post style */}
          <div className="mt-6 flex items-center justify-center gap-6">
            {item.content_type === 'therapist' ? (
              // Therapists are approved/dismissed from the queue card; only delete here
              <button
                onClick={() => onDelete(item)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                title="Löschen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Löschen
              </button>
            ) : (
              <>
                <button
                  onClick={() => onMessage(item)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[var(--primary)] transition-colors duration-200 disabled:opacity-50"
                  title="Nachricht senden"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>

                <button
                  onClick={() => onDelete(item)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                  title="Löschen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Löschen
                </button>

                <button
                  onClick={() => onReject(item)}
                  disabled={isProcessing}
                  className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                  title="Ablehnen"
                >
                  Ablehnen
                </button>

                <button
                  onClick={() => onApprove(item)}
                  disabled={isProcessing}
                  className="rounded-full bg-[var(--primary)] hover:bg-[#3b71e6] text-white px-5 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                  title="Publizieren"
                >
                  {isProcessing ? 'Verarbeitung...' : 'Publizieren'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModerationPreviewModal
