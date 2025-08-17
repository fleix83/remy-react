import React, { useState, useEffect } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { ModerationQueueService } from '../../services/moderation-queue.service'
import { supabase } from '../../lib/supabase'
import ModerationPreviewModal from './ModerationPreviewModal'
import ModerationMessageModal from './ModerationMessageModal'
import UserAvatar from '../user/UserAvatar'
import type { ModerationQueueItem } from '../../types/database.types'

const ModerationQueue: React.FC = () => {
  const permissions = usePermissions()
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [itemToReject, setItemToReject] = useState<ModerationQueueItem | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewItem, setPreviewItem] = useState<ModerationQueueItem | null>(null)
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null)
  const [postTitles, setPostTitles] = useState<Record<number, string>>({})
  const [categories, setCategories] = useState<Record<number, string>>({})
  const [allCategories, setAllCategories] = useState<{id: number, name_de: string}[]>([])
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageAction, setMessageAction] = useState<'approve' | 'reject' | 'message' | null>(null)
  const [messageItem, setMessageItem] = useState<ModerationQueueItem | null>(null)
  
  const moderationService = new ModerationQueueService()

  useEffect(() => {
    if (permissions.canModerate) {
      loadQueue()
      setupRealTimeSubscriptions()
    }

    return () => {
      // Clean up subscriptions when component unmounts
      supabase.removeAllChannels()
    }
  }, [permissions.canModerate])

  const setupRealTimeSubscriptions = () => {
    // Subscribe to new posts with pending moderation
    const postsChannel = supabase
      .channel('posts-moderation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: 'moderation_status=eq.pending'
        },
        async (payload) => {
          console.log('Real-time posts update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New post needs moderation - add to queue
            const newPost = payload.new as any
            const { data: postWithUser } = await supabase
              .from('posts')
              .select(`
                *,
                users(id, username, email, role)
              `)
              .eq('id', newPost.id)
              .single()

            if (postWithUser) {
              const queueItem: ModerationQueueItem = {
                content_type: 'post',
                id: postWithUser.id,
                content_id: postWithUser.id,
                user_id: postWithUser.user_id,
                title: postWithUser.title,
                content: postWithUser.content,
                created_at: postWithUser.created_at,
                moderation_status: postWithUser.moderation_status,
                moderated_by: postWithUser.moderated_by,
                moderated_at: postWithUser.moderated_at,
                rejection_reason: postWithUser.rejection_reason,
                users: postWithUser.users
              }
              
              setQueueItems(prev => [queueItem, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            // Post moderation status changed - remove from queue if no longer pending
            const updatedPost = payload.new as any
            if (updatedPost.moderation_status !== 'pending') {
              setQueueItems(prev => prev.filter(item => 
                !(item.content_type === 'post' && item.id === updatedPost.id)
              ))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to new comments with pending moderation
    const commentsChannel = supabase
      .channel('comments-moderation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: 'moderation_status=eq.pending'
        },
        async (payload) => {
          console.log('Real-time comments update:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New comment needs moderation - add to queue
            const newComment = payload.new as any
            const { data: commentWithUser } = await supabase
              .from('comments')
              .select(`
                *,
                users(id, username, email, role)
              `)
              .eq('id', newComment.id)
              .single()

            if (commentWithUser) {
              const queueItem: ModerationQueueItem = {
                content_type: 'comment',
                id: commentWithUser.id,
                content_id: commentWithUser.id,
                user_id: commentWithUser.user_id,
                content: commentWithUser.content,
                created_at: commentWithUser.created_at,
                moderation_status: commentWithUser.moderation_status,
                moderated_by: commentWithUser.moderated_by,
                moderated_at: commentWithUser.moderated_at,
                rejection_reason: commentWithUser.rejection_reason,
                post_id: commentWithUser.post_id,
                users: commentWithUser.users
              }
              
              setQueueItems(prev => [queueItem, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            // Comment moderation status changed - remove from queue if no longer pending
            const updatedComment = payload.new as any
            if (updatedComment.moderation_status !== 'pending') {
              setQueueItems(prev => prev.filter(item => 
                !(item.content_type === 'comment' && item.id === updatedComment.id)
              ))
            }
          }
        }
      )
      .subscribe()

    return () => {
      postsChannel.unsubscribe()
      commentsChannel.unsubscribe()
    }
  }

  const loadQueue = async () => {
    try {
      setLoading(true)
      const items = await moderationService.getPendingContent()
      setQueueItems(items)
      await Promise.all([
        loadPostTitles(items),
        loadCategories(items)
      ])
    } catch (error) {
      console.error('Error loading moderation queue:', error)
      alert('Fehler beim Laden der Moderationsqueue')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (item: ModerationQueueItem, message?: string) => {
    if (!permissions.canModerate || !permissions.userProfile?.id) {
      console.error('No permissions to moderate')
      return
    }

    setProcessingId(item.id)
    try {
      if (item.content_type === 'post') {
        await moderationService.approvePost(item.id, permissions.userProfile.id)
      } else {
        await moderationService.approveComment(item.id, permissions.userProfile.id)
      }
      
      // TODO: Send message to user if provided
      if (message) {
        console.log(`Message to user: ${message}`)
        // Will implement messaging service integration here
      }
      
      // Remove item from queue
      setQueueItems(prev => prev.filter(i => i.id !== item.id))
      alert(`${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} genehmigt!`)
    } catch (error) {
      console.error('Error approving content:', error)
      alert('Fehler beim Genehmigen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error // Re-throw so the modal doesn't close
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (item: ModerationQueueItem, message?: string) => {
    if (!permissions.canModerate || !permissions.userProfile?.id) {
      console.error('No permissions to moderate')
      return
    }

    setProcessingId(item.id)
    try {
      if (item.content_type === 'post') {
        await moderationService.rejectPost(item.id, permissions.userProfile.id, message)
      } else {
        await moderationService.rejectComment(item.id, permissions.userProfile.id, message)
      }
      
      // TODO: Send message to user if provided
      if (message) {
        console.log(`Rejection message to user: ${message}`)
        // Will implement messaging service integration here
      }
      
      // Remove item from queue
      setQueueItems(prev => prev.filter(i => i.id !== item.id))
      alert(`${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} abgelehnt!`)
    } catch (error) {
      console.error('Error rejecting content:', error)
      alert('Fehler beim Ablehnen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error // Re-throw so the modal doesn't close
    } finally {
      setProcessingId(null)
    }
  }

  // Legacy reject handler for the old modal (can be removed later)
  const handleRejectLegacy = async (reason: string) => {
    if (!permissions.canModerate || !permissions.userProfile?.id || !itemToReject) return
    await handleReject(itemToReject, reason)
    setShowRejectModal(false)
    setItemToReject(null)
    setRejectReason('')
  }

  const handleBulkApprove = async () => {
    if (!permissions.canModerate || !permissions.userProfile?.id || selectedItems.size === 0) return

    const items = Array.from(selectedItems).map(id => {
      const item = queueItems.find(i => i.id === id)
      return item ? { type: item.content_type, id } : null
    }).filter(Boolean) as { type: 'post' | 'comment'; id: number }[]

    try {
      await moderationService.bulkApprove(items, permissions.userProfile.id)
      
      // Remove items from queue
      setQueueItems(prev => prev.filter(i => !selectedItems.has(i.id)))
      setSelectedItems(new Set())
      alert(`${items.length} Elemente genehmigt!`)
    } catch (error) {
      console.error('Error bulk approving:', error)
      alert('Fehler bei der Massengenehmigung')
    }
  }

  const handleBulkReject = async () => {
    if (!permissions.canModerate || !permissions.userProfile?.id || selectedItems.size === 0) return

    const reason = prompt('Grund für die Ablehnung (optional):')
    if (reason === null) return // User cancelled

    const items = Array.from(selectedItems).map(id => {
      const item = queueItems.find(i => i.id === id)
      return item
    }).filter(Boolean) as ModerationQueueItem[]

    try {
      await Promise.all(items.map(item => {
        if (item.content_type === 'post') {
          return moderationService.rejectPost(item.id, permissions.userProfile!.id, reason)
        } else {
          return moderationService.rejectComment(item.id, permissions.userProfile!.id, reason)
        }
      }))
      
      // Remove items from queue
      setQueueItems(prev => prev.filter(i => !selectedItems.has(i.id)))
      setSelectedItems(new Set())
      alert(`${items.length} Elemente abgelehnt!`)
    } catch (error) {
      console.error('Error bulk rejecting:', error)
      alert('Fehler bei der Massenablehnung')
    }
  }

  const handleBulkDelete = async () => {
    if (!permissions.canModerate || selectedItems.size === 0) return

    const confirmMessage = `Sind Sie sicher, dass Sie ${selectedItems.size} Elemente endgültig löschen möchten?`
    if (!confirm(confirmMessage)) return

    const items = Array.from(selectedItems).map(id => {
      const item = queueItems.find(i => i.id === id)
      return item ? { type: item.content_type, id } : null
    }).filter(Boolean) as { type: 'post' | 'comment'; id: number }[]

    try {
      await moderationService.bulkDelete(items, 'Bulk moderation deletion')
      
      // Remove items from queue
      setQueueItems(prev => prev.filter(i => !selectedItems.has(i.id)))
      setSelectedItems(new Set())
      alert(`${items.length} Elemente gelöscht!`)
    } catch (error) {
      console.error('Error bulk deleting:', error)
      alert('Fehler bei der Massenlöschung')
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleItemClick = (item: ModerationQueueItem) => {
    setPreviewItem(item)
    setShowPreviewModal(true)
  }

  const handleTouchStart = (item: ModerationQueueItem) => {
    const timer = setTimeout(() => {
      toggleSelection(item.id)
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500) // 500ms touch hold
    setTouchTimer(timer)
  }

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer)
      setTouchTimer(null)
    }
  }

  const handleDelete = async (item: ModerationQueueItem) => {
    const confirmMessage = `Sind Sie sicher, dass Sie ${item.content_type === 'post' ? 'diesen Beitrag' : 'diesen Kommentar'} endgültig löschen möchten?`
    
    if (!confirm(confirmMessage)) return

    setProcessingId(item.id)
    try {
      if (item.content_type === 'post') {
        await moderationService.deletePost(item.id, 'Moderator deletion')
      } else {
        await moderationService.deleteComment(item.id, 'Moderator deletion')
      }
      
      // Remove item from queue
      setQueueItems(prev => prev.filter(i => i.id !== item.id))
      alert(`${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} gelöscht!`)
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Fehler beim Löschen')
    } finally {
      setProcessingId(null)
    }
  }

  const handleMessage = (item: ModerationQueueItem) => {
    setMessageItem(item)
    setMessageAction('message')
    setShowMessageModal(true)
  }

  const handleMessageModalConfirm = async (message?: string) => {
    if (!messageItem || !messageAction) return

    try {
      if (messageAction === 'approve') {
        await handleApprove(messageItem, message)
      } else if (messageAction === 'reject') {
        await handleReject(messageItem, message)
      } else if (messageAction === 'message') {
        // TODO: Implement direct messaging
        console.log(`Direct message to user: ${message}`)
        alert('Nachricht gesendet!')
      }
      
      // Only close modal if operations succeeded
      setShowMessageModal(false)
      setMessageAction(null)
      setMessageItem(null)
    } catch (error) {
      console.error('Error in message modal confirm:', error)
      // Modal stays open on error so user can see the issue
    }
  }

  const handleMessageModalClose = () => {
    setShowMessageModal(false)
    setMessageAction(null)
    setMessageItem(null)
  }

  const handleCategoryChange = async (itemId: number, newCategoryId: number) => {
    if (!permissions.canModerate) return
    
    try {
      // Update the post's category in the database
      const { error } = await supabase
        .from('posts')
        .update({ category_id: newCategoryId })
        .eq('id', itemId)
      
      if (error) throw error
      
      // Update local state
      setQueueItems(prev => prev.map(item => 
        item.id === itemId && item.content_type === 'post' 
          ? { ...item, category_id: newCategoryId }
          : item
      ))
      
      alert('Kategorie erfolgreich geändert!')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Fehler beim Ändern der Kategorie')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getFirstLineOfComment = (content: string) => {
    // Remove HTML tags and get first line
    const plainText = content.replace(/<[^>]*>/g, '')
    const firstLine = plainText.split('\n')[0] || plainText
    return truncateText(firstLine, 80)
  }

  const loadPostTitles = async (items: ModerationQueueItem[]) => {
    const commentItems = items.filter(item => item.content_type === 'comment' && item.post_id)
    const postIds = [...new Set(commentItems.map(item => item.post_id!))]
    
    if (postIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title')
        .in('id', postIds)
      
      if (error) throw error
      
      const titleMap: Record<number, string> = {}
      data?.forEach(post => {
        titleMap[post.id] = post.title
      })
      
      setPostTitles(prev => ({ ...prev, ...titleMap }))
    } catch (error) {
      console.error('Error fetching post titles:', error)
    }
  }

  const loadCategories = async (items: ModerationQueueItem[]) => {
    // Load all categories first for the dropdown
    try {
      const { data: allCats, error: allCatsError } = await supabase
        .from('categories')
        .select('id, name_de')
        .eq('is_active', true)
        .order('id', { ascending: true })
      
      if (allCatsError) throw allCatsError
      setAllCategories(allCats || [])
    } catch (error) {
      console.error('Error fetching all categories:', error)
    }

    // Get category IDs from posts and comments (need to get post categories for comments too)
    const postItems = items.filter(item => item.content_type === 'post')
    const commentItems = items.filter(item => item.content_type === 'comment' && item.post_id)
    
    const postCategoryIds = postItems.map(item => item.category_id).filter(Boolean)
    
    // For comments, we need to get the category from the related post
    let commentCategoryIds: number[] = []
    if (commentItems.length > 0) {
      const postIds = commentItems.map(item => item.post_id!)
      const { data: posts } = await supabase
        .from('posts')
        .select('id, category_id')
        .in('id', postIds)
      
      if (posts) {
        commentCategoryIds = posts.map(post => post.category_id).filter(Boolean)
        // Map comment items to their post's category
        posts.forEach(post => {
          const comment = commentItems.find(c => c.post_id === post.id)
          if (comment) {
            comment.category_id = post.category_id
          }
        })
      }
    }
    
    const allCategoryIds = [...new Set([...postCategoryIds, ...commentCategoryIds])]
    
    if (allCategoryIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name_de')
        .in('id', allCategoryIds)
      
      if (error) throw error
      
      const categoryMap: Record<number, string> = {}
      data?.forEach(category => {
        categoryMap[category.id] = category.name_de
      })
      
      setCategories(prev => ({ ...prev, ...categoryMap }))
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Redirect if no permissions
  if (!permissions.canModerate) {
    return (
      <div className="min-h-screen bg-[#1a3442] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Zugriff verweigert</h1>
          <p className="text-gray-300">Sie haben keine Berechtigung für die Moderationsqueue.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a3442] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37a653]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a3442]">
      <div className="max-w-6xl mx-auto py-6 px-4 md:px-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Moderationsqueue</h1>
            <p className="text-gray-300">
              {queueItems.length} Elemente warten auf Moderation
            </p>
          </div>
          
          {selectedItems.size > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-gray-300 text-sm">
                {selectedItems.size} ausgewählt
              </span>
              <button
                onClick={handleBulkApprove}
                className="bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Publizieren
              </button>
              <button
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Ablehnen
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Löschen
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Auswahl aufheben
              </button>
            </div>
          )}
        </div>

        {/* Queue Items */}
        {queueItems.length === 0 ? (
          <div className="bg-[#203f4a] p-8 text-center" style={{borderRadius: '20px'}}>
            <div className="text-[#37a653] mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Queue ist leer</h3>
            <p className="text-gray-300">Alle Inhalte wurden moderiert!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queueItems.map((item) => (
              <div 
                key={`${item.content_type}-${item.id}`} 
                className={`p-6 mb-4 hover:bg-[#234652] transition-colors cursor-pointer relative ${
                  selectedItems.has(item.id) ? 'ring-2 ring-[#37a653] bg-[#234652]' : 'bg-[#203f4a]'
                }`}
                style={{borderRadius: '20px'}}
                onClick={() => handleItemClick(item)}
                onTouchStart={() => handleTouchStart(item)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {/* Content Type Badge - Overlapping */}
                <span className={`absolute -top-2 left-4 z-10 inline-flex items-center px-2 py-0.5 rounded-lg font-medium shadow-lg ${
                  item.content_type === 'post' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`} style={{fontSize: '0.65rem'}}>
                  {item.content_type === 'post' ? 'Beitrag' : 'Kommentar'}
                </span>
                {/* Header with Canton */}
                <div className="flex items-start justify-end mb-4">
                  <div className="flex items-center space-x-2">
                    {/* Canton Badge - Top Right */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-600 text-white text-xs">
                      BS
                    </span>
                    
                    {/* Selection Checkbox */}
                    <div className="hidden md:block">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleSelection(item.id)
                        }}
                        className="w-4 h-4 text-[#37a653] bg-gray-100 border-gray-300 rounded focus:ring-[#37a653] focus:ring-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Dropdown - Above User Block (Direct Selection for Moderators) */}
                {item.content_type === 'post' && (
                  <div className="mb-2 flex justify-start">
                    {permissions.canModerate ? (
                      <select
                        value={item.category_id || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCategoryChange(item.id, parseInt(e.target.value))
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg font-medium bg-[#37a653] text-white border-none outline-none cursor-pointer hover:bg-[#2e8844] transition-colors w-auto"
                        style={{fontSize: '0.65rem', minWidth: 'fit-content'}}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="" disabled>Kategorie wählen</option>
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id} style={{backgroundColor: '#1a3442', color: 'white'}}>
                            {cat.name_de}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg font-medium bg-[#37a653] text-white w-auto" style={{fontSize: '0.65rem'}}>
                        {item.category_id && categories[item.category_id] ? categories[item.category_id] : 'Keine Kategorie'}
                      </span>
                    )}
                  </div>
                )}

                {/* User Info */}
                <div className="flex items-start space-x-3 mb-4">
                  {item.users && (
                    <UserAvatar 
                      user={item.users} 
                      size="small" 
                      className="flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs text-left leading-none">{item.users?.username}</p>
                    <p className="text-xs text-gray-300 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(item.created_at)}</p>
                  </div>
                </div>

                {/* Content Display */}
                <div className="mb-4">
                  {item.content_type === 'post' ? (
                    // For Posts: Show only title
                    item.title && (
                      <h3 className="text-base md:text-xl font-semibold text-[#37a653] leading-tight text-left">
                        {item.title}
                      </h3>
                    )
                  ) : (
                    // For Comments: Show first line in quotes + post reference
                    <div>
                      <div className="text-gray-300 text-sm mb-2 italic text-left">
                        "{getFirstLineOfComment(item.content || '')}"
                      </div>
                      {item.post_id && (
                        <div className="text-xs text-gray-400 text-left">
                          Kommentar zu: <span className="text-white">
                            {postTitles[item.post_id] ? 
                              truncateText(postTitles[item.post_id], 40) : 
                              `Post #${item.post_id}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Small Action Buttons - Bottom Right */}
                <div className="absolute bottom-3 right-3 flex items-center space-x-1">
                  {/* Mobile: Icons, Desktop: Text */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMessage(item)
                    }}
                    disabled={processingId === item.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                    title="Message"
                  >
                    <span className="md:hidden">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </span>
                    <span className="hidden md:inline text-xs">Message</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item)
                    }}
                    disabled={processingId === item.id}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                    title="Löschen"
                  >
                    <span className="md:hidden">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </span>
                    <span className="hidden md:inline text-xs">Löschen</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMessageItem(item)
                      setMessageAction('reject')
                      setShowMessageModal(true)
                    }}
                    disabled={processingId === item.id}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                    title="Ablehnen"
                  >
                    <span className="md:hidden">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    <span className="hidden md:inline text-xs">Ablehnen</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMessageItem(item)
                      setMessageAction('approve')
                      setShowMessageModal(true)
                    }}
                    disabled={processingId === item.id}
                    className="bg-[#37a653] hover:bg-[#2e8844] text-white px-2 py-1 rounded transition-colors disabled:opacity-50 text-xs"
                    title="Publizieren"
                  >
                    Publizieren
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        <ModerationPreviewModal
          isOpen={showPreviewModal}
          item={previewItem}
          postTitles={postTitles}
          categories={categories}
          onClose={() => {
            setShowPreviewModal(false)
            setPreviewItem(null)
          }}
          onApprove={(item) => {
            setShowPreviewModal(false)
            setPreviewItem(null)
            setMessageItem(item)
            setMessageAction('approve')
            setShowMessageModal(true)
          }}
          onReject={(item) => {
            setShowPreviewModal(false)
            setPreviewItem(null)
            setMessageItem(item)
            setMessageAction('reject')
            setShowMessageModal(true)
          }}
          onDelete={(item) => {
            setShowPreviewModal(false)
            setPreviewItem(null)
            handleDelete(item)
          }}
          onMessage={(item) => {
            setShowPreviewModal(false)
            setPreviewItem(null)
            handleMessage(item)
          }}
          isProcessing={processingId !== null}
        />

        {/* Reject Modal */}
        {showRejectModal && itemToReject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {itemToReject.content_type === 'post' ? 'Beitrag' : 'Kommentar'} ablehnen
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grund für Ablehnung (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Erklären Sie, warum dieser Inhalt nicht geeignet ist..."
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setItemToReject(null)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Abbrechen
                </button>
                
                <button
                  onClick={() => handleRejectLegacy(rejectReason)}
                  disabled={processingId === itemToReject.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {processingId === itemToReject.id ? 'Verarbeitung...' : 'Ablehnen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        <ModerationMessageModal
          isOpen={showMessageModal}
          item={messageItem}
          actionType={messageAction}
          onClose={handleMessageModalClose}
          onConfirm={handleMessageModalConfirm}
          isProcessing={processingId !== null}
        />
      </div>
    </div>
  )
}

export default ModerationQueue