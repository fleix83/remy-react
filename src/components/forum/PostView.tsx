import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForumStore } from '../../stores/forum.store'
import { useCommentsRealtime } from '../../hooks/useCommentsRealtime'
import CommentsSection from './CommentsSection'
import { SelectableText } from '../ui/RichTextEditor'

const PostView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = id ? parseInt(id) : null
  
  const { currentPost: post, loading, loadPost } = useForumStore()
  
  // Set up real-time comments for this post
  useCommentsRealtime(postId!)

  useEffect(() => {
    if (postId) {
      loadPost(postId)
    }
  }, [postId, loadPost])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryColor = (categoryId: number) => {
    const colors = {
      1: 'bg-blue-100 text-blue-800 border-blue-200', // Erfahrung
      2: 'bg-green-100 text-green-800 border-green-200', // Suche TherapeutIn
      3: 'bg-purple-100 text-purple-800 border-purple-200', // Gedanken
      4: 'bg-red-100 text-red-800 border-red-200', // Rant
      5: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }


  if (!post && !loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Beitrag nicht gefunden</h3>
          <p className="text-gray-500 mt-1">
            Der angeforderte Beitrag existiert nicht oder wurde entfernt.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Zurück zum Forum
          </button>
        </div>
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Forum
        </button>
      </div>

      {/* Post Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Post Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {post.users?.username?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{post.users?.username}</h3>
                <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
              </div>
            </div>
            
            {/* Category Badge */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(post.category_id)}`}>
              {post.categories?.name_de}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
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
        </div>

        {/* Post Title and Content */}
        <div className="px-6 py-6">
          <h1 className="text-2xl font-headline font-bold text-gray-900 mb-6">
            {post.title}
          </h1>
          
          <SelectableText onTextSelect={() => {}}>
            <div 
              className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </SelectableText>
        </div>

        {/* Post Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm">Hilfreich</span>
              </button>
              
              <button className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm">Teilen</span>
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {/* Comment count will be handled by CommentsSection */}
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-8">
        <CommentsSection postId={parseInt(id!)} />
      </div>
    </div>
  )
}

export default PostView