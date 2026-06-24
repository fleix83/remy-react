import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PostWithRelations } from '../../types/database.types'
import UserAvatar from '../user/UserAvatar'
import PostTags from '../ui/PostTags'
import { getPostDisplayTitle } from '../../utils/text.utils'
import { formatTherapistPostLine } from '../../utils/therapistHelpers'
import { getCategoryColorById, getCategoryName } from '../../utils/categoryHelpers'
import { useCategories } from '../../hooks/usePosts'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import { useTranslation } from 'react-i18next'

interface PostCardProps {
  post: PostWithRelations
  onClick?: () => void
  className?: string
}

const stripHtmlToPlain = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const PostCard: React.FC<PostCardProps> = React.memo(({ post, onClick, className = '' }) => {
  const navigate = useNavigate()

  // Get comment count from post data (from batched query) or fallback to 0
  const contentPreview = useMemo(() => stripHtmlToPlain(post.content || ''), [post.content])

  const commentCount = useMemo(() => {
    if (post.comments && Array.isArray(post.comments) && post.comments.length > 0) {
      // If comments is an array with count objects
      const countObj = post.comments[0] as { count?: number }
      return countObj.count || 0
    }
    return post.comment_count || 0
  }, [post.comments, post.comment_count])

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/post/${post.id}`)
    }
  }
  // Category colors/names are admin-managed (categories table)
  const { data: allCategories } = useCategories()
  const lang = useActiveLanguage()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale(lang), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const { t } = useTranslation('forum')


  return (
    <div 
      className={`p-6 mb-4 hover:opacity-80 transition-opacity cursor-pointer relative post-card-outline ${className}`}
      style={{
        borderRadius: '20px',
        background: 'transparent'
      }}
      onClick={handleClick}
    >
      {/* Header with Category Badge */}
      <div className="flex items-start justify-between mb-4">
        {/* Meta Group - positioned with negative margin and backdrop blur */}
        <div
          className="flex items-center space-x-2 relative"
          style={{
            marginTop: '-25px',
            zIndex: 30,
            padding: '2px 6px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Category Badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 font-medium transition-opacity text-black"
            style={{
              fontSize: '0.65rem',
              backgroundColor: getCategoryColorById(post.category_id, allCategories),
              borderRadius: '3px'
            }}
          >
            {getCategoryName(post.categories, lang)}
          </span>
          {/* Canton Flag (pure, no background) */}
          {post.canton && (
            <img
              src={`/kantone/${post.canton.toLowerCase()}.png`}
              alt={`${post.canton} flag`}
              className="w-4 h-auto object-cover"
              loading="lazy"
              decoding="async"
              width={16}
              height={11}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          {/* Canton Abbreviation */}
          {post.canton && (
            <span className="text-gray-500 text-xs font-medium">
              {post.canton}
            </span>
          )}
          {/* Banned Status Badge */}
          {(post as any).is_banned && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-medium bg-red-600 text-white text-xs">
              {t('card.rejected')}
            </span>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-start space-x-3 mb-4">
        {post.users && (
          <UserAvatar 
            user={post.users} 
            size="small" 
            className="flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--type)] text-xs text-left leading-none">{post.users?.username}</p>
          <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{post.created_at ? formatDate(post.created_at) : t('card.unknownDate')}</p>
        </div>
      </div>

      {/* Title / Therapist / Content — wrapped for desktop reorder */}
      <div className="post-card-body">
        {/* Therapist Info - Only for posts with therapists */}
        {post.therapists && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/therapists?therapist=${post.therapists!.id}`)
            }}
            className="post-card-therapist text-left hover:underline active:opacity-60 cursor-pointer bg-transparent border-none p-0 m-0 block w-full transition-opacity duration-100"
            style={{color: '#4785ff', fontSize: '12px', lineHeight: '1.2'}}
          >
            {t('card.experienceWith', { therapist: formatTherapistPostLine(post.therapists, lang) })}
          </button>
        )}

        {/* Title - Auto-generated for Rant posts without title */}
        {getPostDisplayTitle(post.title, post.content, post.category_id) && (
          <h3 className="post-card-title text-base md:text-xl font-semibold mb-1 leading-tight text-left" style={{color: 'var(--post-title)'}}>
            {getPostDisplayTitle(post.title, post.content, post.category_id)}
          </h3>
        )}

        {/* Content preview - 3 lines with truncation */}
        {contentPreview && (
          <p
            className="text-sm text-gray-600 text-left mb-4"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.4',
            }}
          >
            {contentPreview}
          </p>
        )}
      </div>

      {/* Rejection Reason (for banned posts) */}
      {(post as any).is_banned && (post as any).rejection_reason && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="text-red-800 text-sm">
            <strong>{t('card.rejectionReason')}</strong> {(post as any).rejection_reason}
          </div>
        </div>
      )}

      {/* Content Tags - thin row above the Antworten/comments footer */}
      <PostTags tags={post.tags} className="mb-1" />

      {/* Footer: right-aligned Antworten link + comment indicator */}
      <div className="flex items-center justify-end space-x-3 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/post/${post.id}`, { state: { openReply: true } })
          }}
          className="inline-flex items-center space-x-1 text-[var(--primary)] hover:opacity-80 active:opacity-50 active:scale-95 transition-[opacity,transform] duration-100"
          style={{ fontSize: '12px' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>{t('card.reply')}</span>
        </button>
        <div className="relative flex items-center">
          <div className="relative bg-white rounded-full p-1.5">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          {commentCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-400 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center min-w-[1rem]" style={{fontSize: '0.6rem'}}>
              {commentCount > 99 ? '99+' : commentCount}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PostCard.displayName = 'PostCard'

export default PostCard