import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UserContentService from '../../services/user-content.service'
import { useForumStore } from '../../stores/forum.store'
import { useAuthStore } from '../../stores/auth.store'
import PostEditModal from '../forum/PostEditModal'
import { supabase } from '../../lib/supabase'
import type { PostWithRelations, PostDraft, CommentWithUser, Post } from '../../types/database.types'

interface UserContentProps {
  userId: string
}

type ContentTab = 'drafts' | 'posts' | 'comments'

const UserContent: React.FC<UserContentProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<ContentTab>('posts')
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [comments, setComments] = useState<(CommentWithUser & { posts?: Post })[]>([])
  const [drafts, setDrafts] = useState<PostDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingPost, setEditingPost] = useState<PostWithRelations | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  const navigate = useNavigate()
  const { deletePost, updatePost } = useForumStore()
  const { user } = useAuthStore()

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
        text: `Failed to load ${activeTab}` 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm('Are you sure you want to delete this draft?')) return

    try {
      await UserContentService.deleteDraft(draftId, userId)
      setMessage({ type: 'success', text: 'Draft deleted successfully' })
      // Reload drafts
      if (activeTab === 'drafts') {
        await loadContent()
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to delete draft'
      })
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

  const getStatusBadge = (post: PostWithRelations | Post) => {
    const badge = UserContentService.getPostStatusBadge(post)
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.text}
      </span>
    )
  }

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
      
      setMessage({ type: 'success', text: 'Post updated successfully!' })
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
        text: error instanceof Error ? error.message : 'Failed to update post' 
      })
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This will hide it from public view but preserve any comments.')) {
      return
    }

    try {
      // Soft delete - mark as inactive instead of actually deleting
      const { error } = await supabase
        .from('posts')
        .update({ 
          is_active: false,
          is_published: false 
        })
        .eq('id', postId)
        .eq('user_id', userId) // Security: ensure user can only delete their own posts

      if (error) {
        console.error('Error deleting post:', error)
        throw new Error('Failed to delete post from database')
      }

      setMessage({ type: 'success', text: 'Post deleted successfully!' })
      
      // Reload posts to remove deleted post from view
      if (activeTab === 'posts') {
        await loadContent()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to delete post' 
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <div className="p-6 pb-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Content</h2>
          
          {/* Tabs */}
          <div className="flex space-x-8">
            {[
              { id: 'posts' as ContentTab, label: 'Posts', count: posts.length },
              { id: 'comments' as ContentTab, label: 'Comments', count: comments.length },
              { id: 'drafts' as ContentTab, label: 'Drafts', count: drafts.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {(activeTab === tab.id || tab.count > 0) && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
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
                    <p className="text-gray-500">No posts yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your published and pending posts will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200 cursor-pointer"
                        onClick={() => handlePostClick(post.id)}
                      >
                        {/* Top Section */}
                        <div className="flex items-start justify-between mb-3">
                          {/* Top Left: Status Badge, Category/Canton Group, Date */}
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(post)}
                              
                              {/* Category */}
                              {post.categories && (
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                  {post.categories.name_de}
                                </span>
                              )}
                              
                              {/* Canton Flag */}
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
                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                  {post.canton}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-1" style={{fontSize: '0.65rem'}}>
                              {formatDate(post.created_at)}
                            </div>
                          </div>
                          
                          {/* Top Right: Edit Button Only */}
                          <div className="flex items-center">
                            {/* Edit Button - Only for own posts */}
                            {user && user.id === post.user_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditPost(post)
                                }}
                                className="text-[var(--primary)] hover:text-[#2d8544] text-xs font-medium transition-colors duration-200"
                                title="Edit post"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-lg font-medium text-gray-900 mb-2 text-left">
                          {post.title || 'Untitled Post'}
                        </h3>
                        
                        {/* Content Preview */}
                        <p className="text-gray-600 text-sm mb-3 text-left leading-relaxed">
                          {truncateToLines(post.content, 2)}
                        </p>
                        
                        {/* Bottom Section */}
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            {post.therapists && (
                              <span className="text-xs text-gray-500">
                                with {post.therapists.first_name} {post.therapists.last_name}
                              </span>
                            )}
                          </div>
                          
                          {/* Delete Button - Only for own posts */}
                          {user && user.id === post.user_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePost(post.id)
                              }}
                              className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                              title="Delete post"
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
                    <p className="text-gray-500">No comments yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your comments on posts will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          {comment.posts && (
                            <Link 
                              to={`/post/${comment.posts.id}`}
                              className="text-sm font-medium text-[var(--primary)] hover:text-[#2d8544] transition-colors duration-200"
                            >
                              Comment on: {comment.posts.title || 'Untitled Post'}
                            </Link>
                          )}
                        </div>
                        
                        <div className="text-gray-700 text-sm mb-3">
                          {truncateText(comment.content.replace(/<[^>]*>/g, ''), 200)}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Posted {formatDate(comment.created_at)}</span>
                          {comment.is_edited && (
                            <span className="text-xs text-gray-400">Edited</span>
                          )}
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
                    <p className="text-gray-500">No drafts saved</p>
                    <p className="text-sm text-gray-400 mt-1">Your unsaved post drafts will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900">
                              {draft.title || 'Untitled Draft'}
                            </h4>
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                              Draft
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200"
                            title="Delete draft"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">
                          {truncateText(draft.content.replace(/<[^>]*>/g, ''), 150)}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Last edited {formatDate(draft.updated_at)}</span>
                          <span>Created {formatDate(draft.created_at)}</span>
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