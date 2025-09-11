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
import MobileSlideMenu from '../layout/MobileSlideMenu'

const PostView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = id ? parseInt(id) : null
  const [showEditModal, setShowEditModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { currentPost: post, loading, loadPost, updatePost } = useForumStore()
  const { user, userProfile, logout } = useAuthStore()
  
  // Set up real-time comments for this post
  useCommentsRealtime(postId!)

  useEffect(() => {
    if (postId) {
      loadPost(postId).then(() => {
        // Debug: Log the post data after loading
        console.log('PostView: Post loaded:', post)
        console.log('Build timestamp:', new Date().toISOString())
        if (post?.users) {
          console.log('PostView: User data:', post.users)
        } else {
          console.log('PostView: No user data in post')
        }
      }).catch(error => {
        console.error('PostView: Error loading post:', error)
      })
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

  const handleSignOut = async () => {
    await logout()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)]">
        <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2ebe7a]"></div>
          </div>
        </div>
      </div>
    )
  }


  if (!post && !loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-body)]">
        <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">Beitrag nicht gefunden</h3>
            <p className="text-gray-500 mt-1">
              Der angeforderte Beitrag existiert nicht oder wurde entfernt.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-[var(--primary)] hover:bg-[var(--primary)] text-white px-4 py-2 rounded-md transition-colors"
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
    <div className="min-h-screen bg-[var(--bg-body)] relative z-10">
      <div className="max-w-6xl mx-auto py-6 px-4 md:px-0 relative z-20">
        {/* Simplified Navigation - Centered Back + Avatar on Right */}
        <div className="flex justify-between items-center mb-16 relative z-30">
          {/* Invisible spacer to balance the avatar and center the back button */}
          <div className="w-6 h-6"></div>
          
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" style={{ stroke: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zum Forum
          </button>
          
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-1 rounded-full transition-colors"
            >
              {userProfile && (
                <UserAvatar 
                  user={userProfile} 
                  size="small" 
                />
              )}
            </button>
          )}
        </div>

        {/* Post Content */}
        <div 
          className="p-6 mb-4 relative z-30"
          style={{
            borderRadius: '20px',
            background: '#ecffef',
            outline: '1px solid #95c7ff',
            outlineOffset: '-11px'
          }}
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
            </div>
            
            {/* Actions: Edit button and Comments Count */}
            <div className="flex items-center space-x-3">
              {/* Edit Button - Only for post author */}
              {isPostAuthor() && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-white transition-colors"
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
                <div className="relative bg-white rounded-full p-1.5">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-start space-x-3 mb-4">
            {post.users ? (
              <UserAvatar 
                user={post.users} 
                size="small" 
                className="flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-gray-600">?</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--type)] text-xs text-left leading-none">
                {post.users?.username || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>
                {formatDate(post.created_at)}
              </p>
              {/* Debug info - remove later */}
              {!post.users && (
                <p className="text-xs text-red-500 mt-1">
                  Debug: No user data loaded for post {post.id}
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-base md:text-xl mb-4 leading-tight text-left" style={{color: '#626262', fontWeight: 700}}>
            {getPostDisplayTitle(post)}
          </h1>
          
          {/* Post Content */}
          <SelectableText onTextSelect={() => {}}>
            <div 
              className="prose prose-gray max-w-none text-[var(--type)] leading-tight text-left text-sm"
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

        {/* Mobile Slide-in Menu */}
        <MobileSlideMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          userRole={userProfile?.role}
          onLogout={handleSignOut}
        />
      </div>
    </div>
  )
}

export default PostView