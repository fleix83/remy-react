import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForumStore } from '../../stores/forum.store'
import { useAuthStore } from '../../stores/auth.store'
import { useCommentsRealtime } from '../../hooks/useCommentsRealtime'
import CommentsSection from './CommentsSection'
import PostEditModal from './PostEditModal'
import { SelectableText } from '../ui/RichTextEditor'
import SendMessageButton from '../messaging/SendMessageButton'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import { getPostDisplayTitle } from '../../utils/text.utils'

const PostView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = id ? parseInt(id) : null
  const [showEditModal, setShowEditModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openCommentForm, setOpenCommentForm] = useState(false)
  const [replyToPostAuthor, setReplyToPostAuthor] = useState(false)
  
  const { currentPost: post, loading, loadPost, updatePost } = useForumStore()
  const { user, userProfile, logout } = useAuthStore()

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

  const getCategoryColor = () => {
    return 'text-black' // Always black text for category badges
  }

  const getCategoryBackground = (categoryId: number) => {
    const backgrounds = {
      1: 'var(--bg-erfahrung)',     // Yellow
      2: 'var(--bg-suche)',         // Light Pink
      3: 'var(--bg-austausch)',     // Light Blue
      4: 'var(--bg-rant)',          // Light Purple
      5: 'var(--bg-ressourcen)',    // Light Green
    }
    return backgrounds[categoryId as keyof typeof backgrounds] || 'var(--bg-erfahrung)'
  }

  const handleEditPost = async (postData: any) => {
    if (!post) return

    try {
      // forum.store.updatePost now updates currentPost in-place using the
      // fully-enriched post returned by PostsService.updatePost, so no
      // follow-up loadPost is needed.
      await updatePost(post.id, {
        title: postData.title,
        content: postData.content,
        category_id: postData.category_id,
        canton: postData.canton,
        therapist_id: postData.therapist_id,
        tags: postData.tags,
        // Forward the draft flag so publishing a draft from the edit modal
        // actually flips is_draft / moderation_status.
        is_draft: postData.is_draft
      })
    } catch (error) {
      console.error('Error updating post:', error)
      // If the post body saved but tags failed, the store still holds the
      // fresh post — show the specific error without rolling back UI.
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      alert('Fehler beim Aktualisieren des Beitrags: ' + msg)
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
      <div className="min-h-screen" style={{ backgroundColor: '#f6fff7' }}>
        <div className="max-w-6xl mx-auto py-6 md:px-0">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2ebe7a]"></div>
          </div>
        </div>
      </div>
    )
  }


  if (!post && !loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f6fff7' }}>
        <div className="max-w-6xl mx-auto py-6 md:px-0">
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
    <div className="min-h-screen relative z-10" style={{ backgroundColor: 'rgb(238 250 240)' }}>
      {/* Header bar */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: '65px',
          background: 'linear-gradient(180deg, hsla(221, 100%, 95%, 1) 0%, hsla(130, 55%, 96%, 1) 100%, hsla(130, 55%, 96%, 1) 100%)'
        }}
      >
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 flex justify-between items-center">
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
              className="md:hidden relative p-1 rounded-full transition-colors mr-2.5"
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
      </div>

      <div className="max-w-6xl mx-auto md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>

        {/* Post Content */}
        <div
          className="p-6 mb-4 relative"
          style={{
            borderRadius: '30px',
            backgroundColor: 'rgb(242, 251, 244)',
            zIndex: 1,
            paddingTop: '66px'
          }}
        >
          {/* Content wrapper - ensures consistent spacing for badge relative to content below */}
          <div className="relative" style={{ minHeight: '0px' }}>
            {/* Category Badge and Canton - Positioned relative to this wrapper */}
            <div className="absolute z-10 flex items-center space-x-2" style={{ top: '-53px' }}>
              <span
                className={`inline-flex items-center px-2 py-0.5 font-medium ${getCategoryColor()}`}
                style={{
                  fontSize: '0.65rem',
                  backgroundColor: getCategoryBackground(post.category_id),
                  borderRadius: '3px'
                }}
              >
                {post.categories?.name_de}
              </span>
              {post.canton && (
                <>
                  <img
                    src={`/kantone/${post.canton.toLowerCase()}.png`}
                    alt={`${post.canton} flag`}
                    className="w-4 h-auto object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <span className="text-gray-500 text-xs font-medium">
                    {post.canton}
                  </span>
                </>
              )}
            </div>

            {/* Therapist Info */}
            {post.therapists && (
              <button
                onClick={() => navigate(`/therapists?therapist=${post.therapists!.id}`)}
                className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 m-0 block w-full"
                style={{color: '#4785ff', fontSize: '13px', lineHeight: '1.2'}}
              >
                Erfahrung mit {post.therapists.form_of_address} {post.therapists.first_name} {post.therapists.last_name}, {post.therapists.short_designation || post.therapists.designation}
              </button>
            )}
          </div>

          {/* Title - Hidden for Rant posts, auto-generated for others */}
          {post.category_id !== 4 && (
            <h1 className="text-left" style={{color: 'var(--post-title)', fontSize: '24px', fontWeight: 800, lineHeight: '1.25', marginBottom: '24px'}}>
              {getPostDisplayTitle(post.title, post.content, post.category_id)}
            </h1>
          )}

          {/* User Info */}
          <div className="flex items-center" style={{ marginBottom: '32px' }}>
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
            <div className="ml-3 flex-1 min-w-0">
              <p className="font-semibold text-[var(--type)] text-left leading-tight" style={{ fontSize: '11px' }}>
                {post.users?.username || 'Unknown User'}
              </p>
              <p className="text-gray-500 text-left leading-tight" style={{ fontSize: '10px' }}>
                {post.created_at ? formatDate(post.created_at) : 'Unbekannt'}
              </p>
            </div>

            {/* Actions on the right side of user info */}
            {isPostAuthor() && (
              <div className="flex items-center ml-auto">
                {/* Edit Button - Only for post author */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Beitrag bearbeiten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm">Bearbeiten</span>
                </button>
              </div>
            )}
          </div>

          {/* Post Content */}
          <SelectableText onTextSelect={() => {}}>
            <div
              className="prose prose-gray max-w-none text-left"
              style={{ fontSize: '15px', fontWeight: 500, lineHeight: '22px', color: 'var(--post-text)' }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </SelectableText>

          {/* Content Tags */}
          {post.tags && typeof post.tags === 'string' && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.split(',').map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-lg text-xs md:text-sm"
                  style={{
                    color: 'grey',
                    background: '#fbfffc',
                    border: '1px solid #e5e5e5'
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Reply and Message Links */}
          <div className="flex items-center space-x-4 mt-6">
            {/* Reply Link */}
            <button
              onClick={() => {
                setOpenCommentForm(true)
                setReplyToPostAuthor(true)
                setTimeout(() => {
                  document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
                }, 100)
              }}
              className="inline-flex items-center space-x-1 text-sm text-[var(--primary)] hover:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>Antworten</span>
            </button>

            {/* Private Message Link */}
            {!isPostAuthor() && user && post.users && (
              <SendMessageButton
                recipientId={post.user_id}
                recipientUsername={post.users.username}
                postTitle={post.title || undefined}
                postId={post.id}
                variant="text-link"
              />
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="-mt-3" id="comments">
          <CommentsSection
            postId={parseInt(id!)}
            shouldOpenForm={openCommentForm}
            replyToUsername={replyToPostAuthor && post?.users?.username ? post.users.username || undefined : undefined}
            onFormStateChange={(isOpen) => {
              if (isOpen) {
                setOpenCommentForm(false)
                setReplyToPostAuthor(false)
              }
            }}
          />
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
          userRole={userProfile?.role || undefined}
          onLogout={handleSignOut}
        />
      </div>
    </div>
  )
}

export default PostView