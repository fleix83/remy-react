import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommentsService } from '../../services/comments.service'
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
      1: 'bg-blue-100 text-blue-800', // Erfahrung
      2: 'bg-green-100 text-green-800', // Suche TherapeutIn
      3: 'bg-purple-100 text-purple-800', // Gedanken
      4: 'bg-red-100 text-red-800', // Rant
      5: 'bg-yellow-100 text-yellow-800', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {post.users?.username?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{post.users?.username}</p>
            <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
          </div>
        </div>
        
        {/* Category Badge */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(post.category_id)}`}>
          {post.categories?.name_de}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-headline font-semibold text-gray-900 mb-2">
        {post.title}
      </h3>

      {/* Content Preview */}
      <div className="text-gray-600 mb-4">
        {getContentPreview(post.content)}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {post.canton && (
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {post.canton}
            </span>
          )}
          {post.designation && (
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {post.designation}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{commentCount} Kommentare</span>
        </div>
      </div>
    </div>
  )
}

export default PostCard