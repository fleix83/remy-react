import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommentsService } from '../../services/comments.service'
import { getPostDisplayTitle } from '../../utils/therapistHelpers'
import type { PostWithRelations } from '../../types/database.types'
import { useAuthStore } from '../../stores/auth.store'
import ModerationActions from '../ui/ModerationActions'
import SendMessageButton from '../messaging/SendMessageButton'
import UserAvatar from '../user/UserAvatar'

interface PostCardProps {
  post: PostWithRelations
  onClick?: () => void
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [commentCount, setCommentCount] = useState(0)

  const commentsService = new CommentsService()

  useEffect(() => {
    loadCommentCount()
  }, [post.id])

  const loadCommentCount = async () => {
    try {
      const count = await commentsService.getCommentCount(post.id)
      setCommentCount(count)
    } catch (error) {
      console.error('Error loading comment count:', error)
    }
  }

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

  const getCategoryColor = (categoryId: number) => {
    const colors = {
      1: 'bg-[#37a653] text-white', // Erfahrung
      2: 'bg-[#37a653] text-white', // Suche TherapeutIn
      3: 'bg-[#37a653] text-white', // Gedanken
      4: 'bg-[#37a653] text-white', // Rant
      5: 'bg-[#37a653] text-white', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-[#37a653] text-white'
  }


  return (
    <div 
      className="bg-[#203f4a] p-6 mb-4 hover:bg-[#234652] transition-colors cursor-pointer"
      style={{borderRadius: '20px'}}
      onClick={handleClick}
    >
      {/* Header with Category Badge and Comments */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          {/* Category Badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium ${getCategoryColor(post.category_id)}`} style={{fontSize: '0.65rem'}}>
            {post.categories?.name_de}
          </span>
          {/* Canton Flag (pure, no background) */}
          {post.canton && (
            <img 
              src={`/kantone/${post.canton.toLowerCase()}.png`}
              alt={`${post.canton} flag`}
              className="w-4 h-auto object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          {/* Canton Abbreviation */}
          {post.canton && (
            <span className="text-gray-300 text-xs font-medium">
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
          <div className="relative bg-[#37a653] rounded-full p-1.5">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
          <p className="font-medium text-white text-xs text-left leading-none">{post.users?.username}</p>
          <p className="text-xs text-gray-300 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(post.created_at)}</p>
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
              className="hover:bg-[#2a4a57] rounded p-1"
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
      <h3 className="text-base md:text-xl font-semibold text-[#37a653] mb-4 leading-tight text-left">
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
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#2a4a57] text-white text-xs md:text-sm">
            Minimalismus
          </span>
        </div>
      )}
    </div>
  )
}

export default PostCard