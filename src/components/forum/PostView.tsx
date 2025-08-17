import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForumStore } from '../../stores/forum.store'
import { useAuthStore } from '../../stores/auth.store'
import { useCommentsRealtime } from '../../hooks/useCommentsRealtime'
import { getPostDisplayTitle } from '../../utils/therapistHelpers'
import CommentsSection from './CommentsSection'
import PostEditModal from './PostEditModal'
import { SelectableText } from '../ui/RichTextEditor'
import SendMessageButton from '../messaging/SendMessageButton'
import UserAvatar from '../user/UserAvatar'

const PostView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = id ? parseInt(id) : null
  const [showEditModal, setShowEditModal] = useState(false)
  
  const { currentPost: post, loading, loadPost, updatePost } = useForumStore()
  const { user } = useAuthStore()
  
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
      1: 'bg-[#37a653] text-white', // Erfahrung
      2: 'bg-[#37a653] text-white', // Suche TherapeutIn
      3: 'bg-[#37a653] text-white', // Gedanken
      4: 'bg-[#37a653] text-white', // Rant
      5: 'bg-[#37a653] text-white', // Ressourcen
    }
    return colors[categoryId as keyof typeof colors] || 'bg-[#37a653] text-white'
  }

  const handleEditPost = async (postData: any) => {
    if (!post) return
    
    try {
      await updatePost(post.id, {
        title: postData.title,
        content: postData.content,
        category_id: postData.category_id,
        canton: postData.canton,
        therapist_id: postData.therapist_id
      })
      
      // Reload the post to get fresh data
      await loadPost(post.id)
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Fehler beim Aktualisieren des Beitrags: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error
    }
  }

  const isPostAuthor = () => {
    return user && post && user.id === post.user_id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a3442]">
        <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37a653]"></div>
          </div>
        </div>
      </div>
    )
  }


  if (!post && !loading) {
    return (
      <div className="min-h-screen bg-[#1a3442]">
        <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">Beitrag nicht gefunden</h3>
            <p className="text-gray-300 mt-1">
              Der angeforderte Beitrag existiert nicht oder wurde entfernt.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-2 rounded-md transition-colors"
            >
              Zurück zum Forum
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="min-h-screen bg-[#1a3442]">
      <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zum Forum
          </button>
        </div>

        {/* Post Content */}
        <div className="bg-[#203f4a] p-6 mb-4" style={{borderRadius: '20px'}}>
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
            </div>
            
            {/* Actions: Edit button and Comments Count */}
            <div className="flex items-center space-x-3">
              {/* Edit Button - Only for post author */}
              {isPostAuthor() && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors"
                  title="Beitrag bearbeiten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-xs">Bearbeiten</span>
                </button>
              )}

              {/* Send Message Button - Only for other users' posts */}
              {!isPostAuthor() && user && post.users && (
                <SendMessageButton
                  recipientId={post.user_id}
                  recipientUsername={post.users.username}
                  postTitle={getPostDisplayTitle(post)}
                  postId={post.id}
                  variant="small"
                />
              )}
              
              {/* Comments Count */}
              <div className="relative flex items-center">
                <div className="relative bg-[#37a653] rounded-full p-1.5">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
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
          </div>

          {/* Title */}
          <h1 className="text-base md:text-xl font-semibold text-[#37a653] mb-4 leading-tight text-left">
            {getPostDisplayTitle(post)}
          </h1>
          
          {/* Post Content */}
          <SelectableText onTextSelect={() => {}}>
            <div 
              className="prose prose-gray max-w-none text-white leading-tight text-left text-sm"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </SelectableText>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentsSection postId={parseInt(id!)} />
        </div>

        {/* Edit Modal */}
        {post && (
          <PostEditModal
            isOpen={showEditModal}
            post={post}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleEditPost}
          />
        )}
      </div>
    </div>
  )
}

export default PostView