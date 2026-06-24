import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForumStore } from '../../stores/forum.store'
import { useAuthStore } from '../../stores/auth.store'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import { useTranslation } from 'react-i18next'
import { useNotificationsStore } from '../../stores/notifications.store'
import { toast } from '../../stores/toast.store'
import { useCommentsRealtime } from '../../hooks/useCommentsRealtime'
import CommentsSection from './CommentsSection'
import PostEditModal from './PostEditModal'
import { SelectableText } from '../ui/RichTextEditor'
import SendMessageButton from '../messaging/SendMessageButton'
import UserAvatar from '../user/UserAvatar'
import PostTags from '../ui/PostTags'
import Navigation from '../layout/Navigation'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import { getPostDisplayTitle } from '../../utils/text.utils'
import { formatTherapistPostLine } from '../../utils/therapistHelpers'
import { getCategoryColorById, getCategoryName } from '../../utils/categoryHelpers'
import { useCategories } from '../../hooks/usePosts'

const PostView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const postId = id ? parseInt(id) : null
  const [showEditModal, setShowEditModal] = useState(false)
  const [openCommentForm, setOpenCommentForm] = useState(false)
  const [replyToPostAuthor, setReplyToPostAuthor] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { currentPost: post, loading, loadPost, updatePost } = useForumStore()
  const { user, userProfile, logout } = useAuthStore()

  const handleSignOut = async () => {
    await logout()
  }

  // Set up real-time comments for this post
  useCommentsRealtime(postId!)

  useEffect(() => {
    if (postId) {
      loadPost(postId)
    }
  }, [postId, loadPost])

  // Viewing a post clears its "post answered" notifications (RLS limits the
  // update to the current user's own notification rows)
  const markPostNotificationsAsRead = useNotificationsStore(state => state.markPostNotificationsAsRead)
  useEffect(() => {
    if (postId && user) {
      markPostNotificationsAsRead(postId)
    }
  }, [postId, user, markPostNotificationsAsRead])

  // Honor navigation state from PostCard's "Antworten" link: once the post
  // is loaded, open the reply form and scroll to the comments section, then
  // clear the state so a later reload/refresh doesn't re-trigger it.
  useEffect(() => {
    const state = location.state as { openReply?: boolean } | null
    if (!state?.openReply || !post) return

    setOpenCommentForm(true)
    setReplyToPostAuthor(true)
    const timer = setTimeout(() => {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Clear the state so the effect doesn't re-fire on re-render.
    navigate(location.pathname, { replace: true, state: null })
    return () => clearTimeout(timer)
  }, [location.state, location.pathname, post, navigate])

  // Category colors/names are admin-managed (categories table)
  const { data: allCategories } = useCategories()
  const lang = useActiveLanguage()
  const { t } = useTranslation('forum')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale(lang), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      const msg = error instanceof Error ? error.message : t('unknownError')
      toast.error(t('updateError', { message: msg }))
      throw error
    }
  }

  const isPostAuthor = () => {
    return user && post && user.id === post.user_id
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
            <h3 className="text-lg font-medium text-white">{t('postNotFound.title')}</h3>
            <p className="text-gray-500 mt-1">
              {t('postNotFound.body')}
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 bg-[var(--primary)] hover:bg-[var(--primary)] text-white px-4 py-2 rounded-md transition-colors"
            >
              {t('backToForumNav')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!post) return null

  // Header gradient tints to the post's category colour (at 75% HWB whiteness,
  // applied in CSS via the --postview-cat custom property).
  const headerCatColor = getCategoryColorById(post.category_id, allCategories)

  return (
    <div
      className="page-postview min-h-screen relative z-10"
      style={{ backgroundColor: '#fff', '--postview-cat': headerCatColor } as React.CSSProperties}
    >
      {/* Desktop: shared forum top header — gradient, REMY logo, lebenskurve
          curve and the avatar/region/language group. */}
      <div className="hidden md:block">
        <Navigation onCreatePost={() => {}} />
      </div>

      {/* Mobile: category-tinted gradient header — back link aligned with the
          avatar, no logo. The gradient mirrors the desktop nav (CSS uses the
          --postview-cat colour set on .page-postview). */}
      <div className="md:hidden postview-mobile-header w-full flex items-start justify-center relative">
        <div className="max-w-6xl w-full mx-auto px-4 flex justify-between items-center" style={{ marginTop: '24px' }}>
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
            {t('backToForumNav')}
          </button>

          {user && userProfile ? (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative p-1 rounded-full transition-colors"
            >
              <UserAvatar user={userProfile} size="small" />
            </button>
          ) : (
            <div className="w-6 h-6"></div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>
        {/* Back to forum (desktop only — mobile shows it in the header bar) */}
        <button
          onClick={() => navigate('/')}
          className="hidden md:inline-flex items-center font-medium hover:opacity-80 transition-opacity mb-4 md:px-0"
          style={{ color: 'var(--primary)' }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" style={{ stroke: 'var(--primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToForumNav')}
        </button>


        {/* Post Content */}
        <div
          className="p-6 mb-4 relative"
          style={{
            borderRadius: '30px',
            zIndex: 1,
            paddingTop: '66px'
          }}
        >
          {/* Content wrapper - ensures consistent spacing for badge relative to content below */}
          <div className="relative" style={{ minHeight: '0px' }}>
            {/* Category Badge and Canton - Positioned relative to this wrapper */}
            <div className="absolute z-10 flex items-center space-x-2" style={{ top: '-53px' }}>
              <span
                className="inline-flex items-center px-2 py-0.5 font-medium text-black"
                style={{
                  fontSize: '0.65rem',
                  backgroundColor: getCategoryColorById(post.category_id, allCategories),
                  borderRadius: '3px'
                }}
              >
                {getCategoryName(post.categories, lang)}
              </span>
              {post.canton && (
                <>
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
                  <span className="text-gray-500 text-xs font-medium">
                    {post.canton}
                  </span>
                </>
              )}
            </div>

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
                {post.users?.username || t('unknownUser')}
              </p>
              <p className="text-gray-500 text-left leading-tight" style={{ fontSize: '10px' }}>
                {post.created_at ? formatDate(post.created_at) : t('card.unknownDate')}
              </p>
            </div>

            {/* Actions on the right side of user info */}
            {isPostAuthor() && (
              <div className="flex items-center ml-auto">
                {/* Edit Button - Only for post author */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
                  title={t('editPost')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm">{t('edit')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Therapist Info - above post content */}
          {post.therapists && (
            <button
              onClick={() => navigate(`/therapists?therapist=${post.therapists!.id}`)}
              className="post-view-therapist text-left hover:underline cursor-pointer bg-transparent border-none p-0 m-0 block w-full"
              style={{color: '#4785ff', fontSize: '13px', lineHeight: '1.2'}}
            >
              {t('card.experienceWith', { therapist: formatTherapistPostLine(post.therapists, lang) })}
            </button>
          )}

          {/* Post Content */}
          <SelectableText onTextSelect={() => {}}>
            <div
              className="prose prose-gray max-w-none text-left post-view-body"
              style={{ fontSize: '15px', fontWeight: 500, lineHeight: '22px', color: '#000', '--tw-prose-body': '#000' } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </SelectableText>

          {/* Tags left-aligned, one row above the right-aligned Antworten row */}
          <div className="mt-6">
            <PostTags tags={post.tags} className="mb-2" />

            {/* Reply and Message Links - right-aligned */}
            <div className="flex items-center justify-end space-x-4">
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
              <span>{t('card.reply')}</span>
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
      </div>

      {/* Mobile slide-in menu (opened from the header avatar) */}
      <MobileSlideMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userRole={userProfile?.role || undefined}
        onLogout={handleSignOut}
      />
    </div>
  )
}

export default PostView