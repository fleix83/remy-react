import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommentsService } from '../../services/comments.service'
import { getPostDisplayTitle } from '../../utils/therapistHelpers'
import type { PostWithRelations } from '../../types/database.types'

interface PostCardProps {
  post: PostWithRelations
  onClick?: () => void
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const navigate = useNavigate()
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
      1: 'bg-[#5a9f51] text-white', // Erfahrung
      2: 'bg-[#5a9f51] text-white', // Suche TherapeutIn
      3: 'bg-[#5a9f51] text-white', // Gedanken
      4: 'bg-[#5a9f51] text-white', // Rant
      5: 'bg-[#5a9f51] text-white', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-[#5a9f51] text-white'
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
          {/* Canton Badge with Flag */}
          {post.canton && (
            <div className="inline-flex items-center px-2 py-1 rounded bg-gray-600 text-white text-xs space-x-1">
              <img 
                src={`/blueprint/assets/kantone/${post.canton.toLowerCase()}.png`}
                alt={`${post.canton} flag`}
                className="w-3 h-2 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span className="text-xs">{post.canton}</span>
            </div>
          )}
        </div>
        
        {/* Comments Count */}
        <div className="relative flex items-center">
          <div className="relative bg-[#5a9f51] rounded-full p-1.5">
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
        <div className="w-6 h-6 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0" style={{width: '1.6rem', height: '1.6rem'}}>
          <span className="text-white font-semibold text-xs md:text-sm">
            {post.users?.username?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-xs text-left leading-none">{post.users?.username}</p>
          <p className="text-xs text-gray-300 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(post.created_at)}</p>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base md:text-xl font-semibold text-[#5a9f51] mb-4 leading-tight text-left">
        {getPostDisplayTitle(post)}
      </h3>

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