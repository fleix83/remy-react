import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPostDisplayTitle } from '../../utils/therapistHelpers'
import type { PostWithRelations } from '../../types/database.types'
import { useAuthStore } from '../../stores/auth.store'
import { useCommentsStore } from '../../stores/comments.store'
import ModerationActions from '../ui/ModerationActions'
import SendMessageButton from '../messaging/SendMessageButton'
import UserAvatar from '../user/UserAvatar'

interface PostCardProps {
  post: PostWithRelations
  onClick?: () => void
  className?: string
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, className = '' }) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getCommentCount, loadComments } = useCommentsStore()

  const commentCount = getCommentCount(post.id)

  useEffect(() => {
    // Load comments for this post to ensure accurate count
    loadComments(post.id)
  }, [post.id, loadComments])

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/post/${post.id}`)
    }
  }
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryColor = () => {
    return 'text-black' // Always black text for category badges
  }

  const getCategoryBackground = (categoryId: number) => {
    const backgrounds = {
      1: 'var(--bg-erfahrung)',     // Yellow
      2: 'var(--bg-suche)',         // Light Pink
      3: 'var(--bg-gedanken)',      // Light Blue
      4: 'var(--bg-rant)',          // Light Purple
      5: 'var(--bg-ressourcen)',    // Light Green
    }
    return backgrounds[categoryId as keyof typeof backgrounds] || 'var(--bg-erfahrung)'
  }


  return (
    <div 
      className={`p-6 mb-4 hover:opacity-80 transition-opacity cursor-pointer relative ${className}`}
      style={{
        borderRadius: '20px',
        background: '#ecffef',
        outline: '1px solid #95c7ff',
        outlineOffset: '-11px'
      }}
      onClick={handleClick}
    >
      {/* Header with Category Badge and Comments */}
      <div className="flex items-start justify-between mb-4">
        {/* Meta Group - positioned with negative margin and backdrop blur */}
        <div 
          className="flex items-center space-x-2 relative"
          style={{
            marginTop: '-25px',
            zIndex: 60,
            padding: '2px 6px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Category Badge */}
          <span 
            className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium transition-opacity ${getCategoryColor()}`} 
            style={{
              fontSize: '0.65rem',
              backgroundColor: getCategoryBackground(post.category_id)
            }}
          >
            {post.categories?.name_de}
          </span>
          {/* Canton Flag (pure, no background) */}
          {post.canton && (
            <img 
              src={`/remyreact/kantone/${post.canton.toLowerCase()}.png`}
              alt={`${post.canton} flag`}
              className="w-4 h-auto object-cover"
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
              ABGELEHNT
            </span>
          )}
        </div>
        
        {/* Comments Count */}
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
          <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(post.created_at)}</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Send Message Button */}
          {user && post.users && user.id !== post.user_id && (
            <SendMessageButton
              recipientId={post.user_id}
              recipientUsername={post.users.username}
              postTitle={getPostDisplayTitle(post)}
              postId={post.id}
              variant="icon-only"
              className="hover:bg-[var(--bg-element-hover)] rounded p-1"
            />
          )}
          {/* Moderation Actions */}
          <ModerationActions
            contentType="post"
            contentId={post.id}
            contentUserId={post.user_id}
            onContentDeleted={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base md:text-xl font-semibold mb-4 leading-tight text-left" style={{color: '#626262'}}>
        {getPostDisplayTitle(post)}
      </h3>

      {/* Rejection Reason (for banned posts) */}
      {(post as any).is_banned && (post as any).rejection_reason && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="text-red-800 text-sm">
            <strong>Grund der Ablehnung:</strong> {(post as any).rejection_reason}
          </div>
        </div>
      )}

      {/* Content Tags */}
      {post.content && (
        <div className="flex flex-wrap gap-2">
          <span 
            className="inline-flex items-center px-3 py-1 rounded-lg text-xs md:text-sm"
            style={{
              color: 'grey',
              background: '#fbfffc'
            }}
          >
            Minimalismus
          </span>
        </div>
      )}
    </div>
  )
}

export default PostCard