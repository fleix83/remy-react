import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import UserContentService from '../../services/user-content.service'
import { useForumStore } from '../../stores/forum.store'
import { useAuthStore } from '../../stores/auth.store'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import PostEditModal from '../forum/PostEditModal'
import { CommentsService } from '../../services/comments.service'
import { supabase } from '../../lib/supabase'
import type { PostWithRelations, CommentWithUser, Post } from '../../types/database.types'
import { formatTherapistPostLine } from '../../utils/therapistHelpers'
import { getCategoryColorById, getCategoryName } from '../../utils/categoryHelpers'
import { useCategories } from '../../hooks/usePosts'
import { confirmDialog } from '../../stores/confirm.store'

interface UserContentProps {
  userId: string
}

type ContentTab = 'drafts' | 'posts' | 'comments'

const UserContent: React.FC<UserContentProps> = ({ userId }) => {
  const { t } = useTranslation('profile')
  const [activeTab, setActiveTab] = useState<ContentTab>('posts')
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [comments, setComments] = useState<(CommentWithUser & { posts?: Post })[]>([])
  const [drafts, setDrafts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingPost, setEditingPost] = useState<PostWithRelations | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  const navigate = useNavigate()
  const { updatePost } = useForumStore()
  const { user } = useAuthStore()
  // Category colors/names are admin-managed (categories table)
  const { data: allCategories } = useCategories()
  const lang = useActiveLanguage()

  useEffect(() => {
    loadContent()
  }, [activeTab, userId])

  const loadContent = async () => {
    setLoading(true)
    setMessage(null)

    try {
      switch (activeTab) {
        case 'posts':
          const userPosts = await UserContentService.getUserPosts(userId)
          setPosts(userPosts)
          break
        case 'comments':
          const userComments = await UserContentService.getUserComments(userId)
          setComments(userComments)
          break
        case 'drafts':
          const userDrafts = await UserContentService.getUserDrafts(userId)
          setDrafts(userDrafts)
          break
      }
    } catch (error) {
      console.error(`Error loading ${activeTab}:`, error)
      setMessage({
        type: 'error',
        text: t('content.loadError')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDraft = async (draftId: number) => {
    if (!(await confirmDialog({ message: t('content.deleteDraftConfirm'), confirmLabel: t('common:actions.delete'), danger: true }))) return

    try {
      await UserContentService.deleteDraft(draftId, userId)
      setMessage({ type: 'success', text: t('content.deleteDraftSuccess') })
      // Reload drafts
      if (activeTab === 'drafts') {
        await loadContent()
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      setMessage({
        type: 'error',
        text: t('content.deleteDraftError')
      })
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!(await confirmDialog({ message: t('content.deleteCommentConfirm'), confirmLabel: t('common:actions.delete'), danger: true }))) return

    // Optimistic removal for instant feedback
    const previous = comments
    setComments((prev) => prev.filter((c) => c.id !== commentId))

    try {
      await new CommentsService().deleteComment(commentId)
    } catch (error) {
      console.error('Error deleting comment:', error)
      setComments(previous)
      setMessage({ type: 'error', text: t('content.deleteCommentError') })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const truncateToLines = (htmlContent: string, maxLines: number = 2) => {
    // Strip HTML tags and get plain text
    const plainText = htmlContent.replace(/<[^>]*>/g, '')
    
    // Split by sentences and periods for natural line breaks
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length <= maxLines) {
      return plainText
    }
    
    // Take first maxLines sentences and rejoin
    const truncated = sentences.slice(0, maxLines).join('. ').trim()
    return truncated + (truncated.endsWith('.') ? '..' : '...')
  }

  // Status label + a very subtle band tint matching the label colour
  const getStatusInfo = (post: PostWithRelations | Post) => {
    const badge = UserContentService.getPostStatusBadge(post as any)
    let textColor = '#666' // default gray
    let bgColor = 'rgba(107,114,128,0.10)'
    if (badge.className.includes('yellow')) { textColor = '#b8860b'; bgColor = 'rgba(184,134,11,0.12)' }
    else if (badge.className.includes('green')) { textColor = '#16a34a'; bgColor = 'rgba(22,163,74,0.08)' }
    else if (badge.className.includes('red')) { textColor = '#dc2626'; bgColor = 'rgba(220,38,38,0.08)' }
    else if (badge.className.includes('gray')) { textColor = '#666'; bgColor = 'rgba(107,114,128,0.10)' }
    return { text: badge.text, textColor, bgColor }
  }

  // Full-width header band: category/canton on the left, status + date tightly
  // grouped on the right. Tint fades out toward the left so it sits behind the
  // status label and dissolves across the category group.
  const renderItemHeader = (
    item: PostWithRelations,
    status: { text: string; textColor: string; bgColor: string }
  ) => (
    <div
      className="-mx-4 -mt-4 mb-3 px-4 py-2 flex items-center justify-between gap-2"
      style={{ background: `linear-gradient(to left, ${status.bgColor} 0%, ${status.bgColor} 35%, transparent 100%)` }}
    >
      {/* Left: category + canton */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {item.categories && (
          <span
            className="px-2 py-1 text-xs text-black font-medium"
            style={{ borderRadius: '3px', backgroundColor: getCategoryColorById(item.categories.id, allCategories) }}
          >
            {getCategoryName(item.categories, lang)}
          </span>
        )}
        {item.canton && (
          <img
            src={`/kantone/${item.canton.toLowerCase()}.png`}
            alt={`${item.canton} flag`}
            className="w-4 h-auto object-cover"
            loading="lazy"
            decoding="async"
            width={16}
            height={11}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        {item.canton && (
          <span className="text-gray-500 text-xs font-medium">{item.canton}</span>
        )}
      </div>

      {/* Right: status label + date, tight and vertically centered */}
      <div className="flex flex-col items-end leading-tight flex-shrink-0">
        <span className="text-xs font-medium" style={{ color: status.textColor }}>{status.text}</span>
        <span className="text-gray-500" style={{ fontSize: '0.65rem' }}>
          {item.created_at ? formatDate(item.created_at) : t('content.unknownDate')}
        </span>
      </div>
    </div>
  )

  const clearMessage = () => setMessage(null)

  const handlePostClick = (postId: number) => {
    navigate(`/post/${postId}`)
  }

  const handleEditPost = (post: PostWithRelations) => {
    setEditingPost(post)
    setShowEditModal(true)
  }

  const handleUpdatePost = async (postData: any) => {
    if (!editingPost) return
    
    try {
      await updatePost(editingPost.id, {
        title: postData.title,
        content: postData.content,
        category_id: postData.category_id,
        canton: postData.canton,
        therapist_id: postData.therapist_id
      })
      
      setMessage({ type: 'success', text: t('content.updatePostSuccess') })
      setShowEditModal(false)
      setEditingPost(null)
      
      // Reload posts to show updated data
      if (activeTab === 'posts') {
        await loadContent()
      }
    } catch (error) {
      console.error('Error updating post:', error)
      setMessage({
        type: 'error',
        text: t('content.updatePostError')
      })
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!(await confirmDialog({ message: t('content.deletePostConfirm'), confirmLabel: t('common:actions.delete'), danger: true }))) {
      return
    }

    try {
      console.log('Attempting to delete post:', postId, 'for user:', userId)

      // Soft delete - mark as inactive instead of actually deleting
      const { data, error } = await supabase
        .from('posts')
        .update({
          is_active: false,
          is_published: false
        })
        .eq('id', postId)
        .eq('user_id', userId) // Security: ensure user can only delete their own posts
        .select()

      console.log('Delete response:', { data, error })

      if (error) {
        console.error('Error deleting post:', error)
        throw new Error('Failed to delete post from database')
      }

      if (!data || data.length === 0) {
        console.warn('No rows updated - post may not exist or user does not own it')
        throw new Error('Could not delete post - you may not have permission')
      }

      setMessage({ type: 'success', text: t('content.deletePostSuccess') })

      // Reload posts to remove deleted post from view
      if (activeTab === 'posts') {
        await loadContent()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      setMessage({
        type: 'error',
        text: t('content.deletePostError')
      })
    }
  }

  return (
    <div className="bg-white shadow-sm" style={{ borderRadius: '28px' }}>
      <div className="border-b border-gray-200">
        <div className="p-6 pb-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-left">{t('content.title')}</h2>

          {/* Tabs — evenly distributed on mobile to avoid overflow, left-aligned on desktop */}
          <div className="flex md:space-x-8">
            {[
              { id: 'posts' as ContentTab, label: t('content.tabs.posts'), count: posts.length },
              { id: 'comments' as ContentTab, label: t('content.tabs.comments'), count: comments.length },
              { id: 'drafts' as ContentTab, label: t('content.tabs.drafts'), count: drafts.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-1 md:gap-1.5 pb-3 md:pb-4 px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                {(activeTab === tab.id || tab.count > 0) && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs leading-none ${
                    activeTab === tab.id
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span>{message.text}</span>
            <button
              onClick={clearMessage}
              className="text-current hover:opacity-75 ml-2"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <div>
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                {posts.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">{t('content.posts.empty')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('content.posts.emptyHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="profile-list-card p-4 hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                        onClick={() => handlePostClick(post.id)}
                      >
                        {/* Header band - category/canton (left) + status + date (right) */}
                        {renderItemHeader(post, getStatusInfo(post))}

                        {/* Title - Hidden for Rant posts */}
                        {post.category_id !== 4 && (
                          <h3 className="text-lg font-medium mb-1 text-left leading-tight" style={{color: 'var(--post-title)'}}>
                            {post.title || t('content.noTitle')}
                          </h3>
                        )}

                        {/* Therapist line below title - blue, matches forum list item */}
                        {post.therapists && (
                          <div
                            className="text-left mb-2 truncate"
                            style={{
                              color: '#4785ff',
                              fontSize: '12px',
                              lineHeight: '1.2',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {t('content.experienceWith', { therapist: formatTherapistPostLine(post.therapists) })}
                          </div>
                        )}

                        {/* Content Preview */}
                        <p className="text-gray-600 text-sm mb-3 text-left leading-relaxed">
                          {truncateToLines(post.content, 2)}
                        </p>

                        {/* Bottom Section - Edit and Delete Buttons */}
                        <div className="flex items-center justify-between">
                          {/* Left: Edit Button */}
                          {user && user.id === post.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditPost(post)
                              }}
                              className="text-[var(--primary)] hover:text-[#2d8544] text-xs font-medium transition-colors duration-200"
                              title={t('content.editPostTitle')}
                            >
                              {t('content.edit')}
                            </button>
                          )}

                          {/* Right: Delete Button */}
                          {user && user.id === post.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePost(post.id)
                              }}
                              className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                              title={t('content.deletePostTitle')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div>
                {comments.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500">{t('content.comments.empty')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('content.comments.emptyHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="profile-list-card p-4">
                        {/* Status band - neutral tint, holds the post reference */}
                        <div className="-mx-4 -mt-4 mb-3 px-4 py-1.5 text-left" style={{ backgroundColor: 'rgba(107,114,128,0.07)' }}>
                          {comment.posts ? (
                            <span className="text-xs font-medium text-gray-600">
                              {t('content.comments.commentOn')}{' '}
                              <Link
                                to={`/post/${comment.posts.id}`}
                                className="text-[var(--primary)] hover:text-[#2d8544] underline transition-colors duration-200"
                              >
                                {comment.posts.title || t('content.noTitle')}
                              </Link>
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-gray-600">{t('content.comments.comment')}</span>
                          )}
                        </div>

                        <div className="text-gray-700 text-sm mb-3 text-left font-medium">
                          {truncateText(comment.content.replace(/<[^>]*>/g, ''), 200)}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="text-left">{t('content.comments.commentedOn', { date: comment.created_at ? formatDate(comment.created_at) : t('content.unknownDate') })}</span>
                            {comment.is_edited && (
                              <span className="text-xs text-gray-400">{t('content.comments.edited')}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                            title={t('content.deleteCommentTitle')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drafts Tab */}
            {activeTab === 'drafts' && (
              <div>
                {drafts.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">{t('content.drafts.empty')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('content.drafts.emptyHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="profile-list-card p-4 hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                        onClick={() => handlePostClick(draft.id)}
                      >
                        {/* Header band - category/canton (left) + status + date (right) */}
                        {renderItemHeader(draft, { text: t('content.draft'), textColor: '#2563eb', bgColor: 'rgba(37,99,235,0.08)' })}

                        {/* Post Title */}
                        <h3 className="text-lg font-semibold mb-1 text-left leading-tight">
                          {draft.title || t('content.noTitle')}
                        </h3>

                        {/* Therapist line below title - blue, matches forum list item */}
                        {draft.therapists && (
                          <div
                            className="text-left mb-2 truncate"
                            style={{
                              color: '#4785ff',
                              fontSize: '12px',
                              lineHeight: '1.2',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {t('content.experienceWith', { therapist: formatTherapistPostLine(draft.therapists) })}
                          </div>
                        )}

                        {/* Content Preview */}
                        <p className="text-gray-600 text-sm mb-3 text-left">
                          {truncateText(draft.content.replace(/<[^>]*>/g, ''), 200)}
                        </p>

                        {/* Bottom Section - Edit and Delete Buttons */}
                        <div className="flex items-center justify-between">
                          {/* Left: Edit Button */}
                          {user && user.id === draft.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditPost(draft)
                              }}
                              className="text-[var(--primary)] hover:text-[#2d8544] text-xs font-medium transition-colors duration-200"
                              title={t('content.editDraftTitle')}
                            >
                              {t('content.edit')}
                            </button>
                          )}

                          {/* Right: Delete Button */}
                          {user && user.id === draft.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDraft(draft.id)
                              }}
                              className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                              title={t('content.deleteDraftTitle')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <PostEditModal
          isOpen={showEditModal}
          post={editingPost}
          onClose={() => {
            setShowEditModal(false)
            setEditingPost(null)
          }}
          onUpdate={handleUpdatePost}
        />
      )}
    </div>
  )
}

export default UserContent