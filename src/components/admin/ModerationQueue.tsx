import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../../hooks/usePermissions'
import { ModerationQueueService } from '../../services/moderation-queue.service'
import { supabase } from '../../lib/supabase'
import ModerationPreviewModal from './ModerationPreviewModal'
import ModerationMessageModal from './ModerationMessageModal'
import UserAvatar from '../user/UserAvatar'
import PostTags from '../ui/PostTags'
import type { ModerationQueueItem, Designation } from '../../types/database.types'
import { getPostDisplayTitle } from '../../utils/text.utils'
import { DesignationsService } from '../../services/designations.service'
import { TherapistsService } from '../../services/therapists.service'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { toast } from '../../stores/toast.store'
import { confirmDialog } from '../../stores/confirm.store'

const ModerationQueue: React.FC = () => {
  const permissions = usePermissions()
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewItem, setPreviewItem] = useState<ModerationQueueItem | null>(null)
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null)
  const longPressTriggered = useRef(false)
  const [postTitles, setPostTitles] = useState<Record<number, string>>({})
  const [categories, setCategories] = useState<Record<number, string>>({})
  const [allCategories, setAllCategories] = useState<{id: number, name_de: string}[]>([])
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageAction, setMessageAction] = useState<'approve' | 'reject' | 'message' | null>(null)
  const [messageItem, setMessageItem] = useState<ModerationQueueItem | null>(null)
  const [contentFilter, setContentFilter] = useState<'alle' | 'beiträge' | 'kommentare' | 'therapeuten'>('alle')
  const [designations, setDesignations] = useState<Designation[]>([])

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

  useEffect(() => {
    if (permissions.canModerate) {
      new DesignationsService().getActiveDesignations().then(setDesignations).catch(console.error)
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
                users!posts_user_id_fkey(id, username, email, role)
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
                users: postWithUser.users as any
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
                users!comments_user_id_fkey(id, username, email, role)
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
                users: commentWithUser.users as any
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
      toast.error('Fehler beim Laden der Moderationsqueue')
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
      toast.success(`${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} genehmigt!`)
    } catch (error) {
      console.error('Error approving content:', error)
      toast.error('Fehler beim Genehmigen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
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
      toast.success(`${item.content_type === 'post' ? 'Beitrag' : 'Kommentar'} abgelehnt!`)
    } catch (error) {
      console.error('Error rejecting content:', error)
      toast.error('Fehler beim Ablehnen: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error // Re-throw so the modal doesn't close
    } finally {
      setProcessingId(null)
    }
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
      toast.success(`${items.length} Elemente genehmigt!`)
    } catch (error) {
      console.error('Error bulk approving:', error)
      toast.error('Fehler bei der Massengenehmigung')
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
      toast.success(`${items.length} Elemente abgelehnt!`)
    } catch (error) {
      console.error('Error bulk rejecting:', error)
      toast.error('Fehler bei der Massenablehnung')
    }
  }

  const handleBulkDelete = async () => {
    if (!permissions.canModerate || selectedItems.size === 0) return

    const confirmMessage = `Sind Sie sicher, dass Sie ${selectedItems.size} Elemente endgültig löschen möchten?`
    if (!(await confirmDialog({ message: confirmMessage, confirmLabel: 'Löschen', danger: true }))) return

    const items = Array.from(selectedItems).map(id => {
      const item = queueItems.find(i => i.id === id)
      return item ? { type: item.content_type, id } : null
    }).filter(Boolean) as { type: 'post' | 'comment' | 'therapist'; id: number }[]

    try {
      await moderationService.bulkDelete(items, 'Bulk moderation deletion')

      // Remove items from queue
      setQueueItems(prev => prev.filter(i => !selectedItems.has(i.id)))
      setSelectedItems(new Set())
      toast.success(`${items.length} Elemente gelöscht!`)
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Fehler bei der Massenlöschung')
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
    // A long-press just toggled selection — swallow the click that follows
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    setPreviewItem(item)
    setShowPreviewModal(true)
  }

  const handleTouchStart = (item: ModerationQueueItem) => {
    longPressTriggered.current = false
    const timer = setTimeout(() => {
      longPressTriggered.current = true
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
    const contentTypeLabel = item.content_type === 'post' ? 'diesen Beitrag' : item.content_type === 'therapist' ? 'diesen Therapeuten' : 'diesen Kommentar'
    const confirmMessage = `Sind Sie sicher, dass Sie ${contentTypeLabel} endgültig löschen möchten?`

    if (!(await confirmDialog({ message: confirmMessage, confirmLabel: 'Löschen', danger: true }))) return

    setProcessingId(item.id)
    try {
      if (item.content_type === 'post') {
        await moderationService.deletePost(item.id, 'Moderator deletion')
      } else if (item.content_type === 'therapist') {
        await moderationService.deleteTherapist(item.id, 'Moderator deletion')
      } else {
        await moderationService.deleteComment(item.id, 'Moderator deletion')
      }

      // Remove item from queue
      setQueueItems(prev => prev.filter(i => i.id !== item.id))
      const deletedLabel = item.content_type === 'post' ? 'Beitrag' : item.content_type === 'therapist' ? 'Therapeut' : 'Kommentar'
      toast.success(`${deletedLabel} gelöscht!`)
    } catch (error) {
      console.error('Error deleting content:', error)
      toast.error('Fehler beim Löschen')
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
        toast.success('Nachricht gesendet!')
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
      
      toast.success('Kategorie erfolgreich geändert!')
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Fehler beim Ändern der Kategorie')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
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

  const getPlainText = (content: string) => {
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
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
        titleMap[post.id] = post.title || ''
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
    
    const allCategoryIds = [...new Set([...postCategoryIds, ...commentCategoryIds])].filter((id): id is number => id !== undefined)

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

  // Card tints per content type — #fff9e2 is the base (posts), comments and
  // therapists shift the hue toward their badge color (salmon / green)
  const cardTint: Record<string, string> = {
    post: 'bg-[#fff9e2] hover:bg-[#fff3cd]',
    comment: 'bg-[#ffeee2] hover:bg-[#ffe4d3]',
    therapist: 'bg-[#edf6e2] hover:bg-[#e3f0d2]'
  }

  const cardTintSelected: Record<string, string> = {
    post: 'ring-2 ring-[var(--primary)] bg-[#ffefc2]',
    comment: 'ring-2 ring-[var(--primary)] bg-[#ffddc7]',
    therapist: 'ring-2 ring-[var(--primary)] bg-[#d9ecc4]'
  }

  const badgeTint: Record<string, string> = {
    post: 'bg-[var(--primary)]',
    comment: 'bg-[#fa8072]',
    therapist: 'bg-[#37a653]'
  }

  // Redirect if no permissions
  if (!permissions.canModerate) {
    return (
      <div className="min-h-screen bg-[#f8f5e6] flex items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-[#ece7dd] bg-white px-8 py-10 text-center shadow-[0_8px_30px_rgba(20,66,32,0.06)]">
          <h1 className="text-2xl font-bold text-[var(--type)] mb-2">Zugriff verweigert</h1>
          <p className="text-slate-500">Sie haben keine Berechtigung für die Moderationsqueue.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5e6] flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
      </div>
    )
  }

  // Filter queue items based on content type
  const filteredQueueItems = queueItems.filter(item => {
    if (contentFilter === 'beiträge') return item.content_type === 'post'
    if (contentFilter === 'kommentare') return item.content_type === 'comment'
    if (contentFilter === 'therapeuten') return item.content_type === 'therapist'
    return true // 'alle'
  })

  return (
    <div className="min-h-screen bg-[#f8f5e6] overflow-x-hidden">
      <div className="max-w-6xl lg:max-w-[78rem] mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-[var(--primary)] mb-2 text-left">Moderation</h1>
            <p className="text-[var(--primary)] text-left flex items-center gap-2">
              <span className="bg-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-sm" style={{fontSize: '22px', color: '#fa8072'}}>
                {filteredQueueItems.length}
              </span>
              Elemente warten auf Moderation
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm self-start md:self-auto">
            {([
              ['alle', 'Alle'],
              ['beiträge', 'Beiträge'],
              ['kommentare', 'Kommentare'],
              ['therapeuten', 'Therapeuten']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setContentFilter(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  contentFilter === value
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--primary)] hover:bg-[#eef3ff]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedItems.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/80 px-5 py-3 shadow-sm">
            <span className="text-sm font-medium text-slate-600">
              {selectedItems.size} ausgewählt
            </span>
            <button
              onClick={handleBulkApprove}
              className="rounded-full bg-[var(--primary)] hover:bg-[#3b71e6] text-white px-4 py-1.5 text-xs font-medium transition-colors"
            >
              Publizieren
            </button>
            <button
              onClick={handleBulkReject}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Ablehnen
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Löschen
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Auswahl aufheben
            </button>
          </div>
        )}

        {/* Queue Items */}
        {filteredQueueItems.length === 0 ? (
          <div className="bg-[#fff9e2] p-8 text-center shadow-[0_2px_12px_rgba(20,66,32,0.05)]" style={{borderRadius: '20px'}}>
            <div className="text-[#1f9d57] mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">
              {contentFilter === 'alle' ? 'Queue ist leer' : `Keine ${contentFilter}`}
            </h3>
            <p className="text-[var(--primary)]">
              {contentFilter === 'alle' ? 'Alle Inhalte wurden moderiert!' : 'Keine Inhalte in diesem Filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQueueItems.map((item) => (
              <div
                key={`${item.content_type}-${item.id}`}
                className={`p-6 mb-4 transition-colors cursor-pointer relative shadow-[0_2px_12px_rgba(20,66,32,0.05)] ${
                  selectedItems.has(item.id) ? cardTintSelected[item.content_type] : cardTint[item.content_type]
                }`}
                style={{borderRadius: '20px'}}
                onClick={() => handleItemClick(item)}
                onTouchStart={() => handleTouchStart(item)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {/* Content Type Badge - Overlapping */}
                <span
                  className={`absolute -top-2 left-4 z-10 inline-flex items-center px-2 py-0.5 rounded-lg font-medium shadow-md text-white ${badgeTint[item.content_type]}`}
                  style={{fontSize: '0.65rem'}}
                >
                  {item.content_type === 'post' ? 'Beitrag' : item.content_type === 'therapist' ? 'Therapeut' : 'Kommentar'}
                </span>
                {/* Header with Canton */}
                <div className="flex items-start justify-end mb-4">
                  <div className="flex items-center space-x-2">
                    {/* Canton Flag and Abbreviation */}
                    {item.canton && (
                      <>
                        <img
                          src={`/kantone/${item.canton.toLowerCase()}.png`}
                          alt={`${item.canton} flag`}
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
                          {item.canton}
                        </span>
                      </>
                    )}
                    
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleSelection(item.id)
                      }}
                      className="w-4 h-4 accent-[var(--primary)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--primary)] focus:ring-2 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Category Dropdown - Above User Block (Direct Selection for Moderators) - Only for Posts */}
                {item.content_type === 'post' && (
                  <div className="mb-2 flex justify-start">
                    {permissions.canModerate ? (
                      <div className="inline-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <select
                          value={item.category_id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleCategoryChange(item.id, parseInt(e.target.value))
                            }
                          }}
                          className="px-2 py-0.5 font-medium bg-[var(--primary)] text-white border-none outline-none cursor-pointer hover:bg-[var(--primary)] transition-colors"
                          style={{
                            fontSize: '0.65rem',
                            gridColumn: '1',
                            gridRow: '1',
                            width: 'auto',
                            minWidth: '0',
                            borderRadius: '3px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="" disabled>Kategorie wählen</option>
                          {allCategories.map(cat => (
                            <option key={cat.id} value={cat.id} style={{backgroundColor: '#1a3442', color: 'white'}}>
                              {cat.name_de}
                            </option>
                          ))}
                        </select>
                        {/* Hidden span to size the select based on current selection */}
                        <span
                          className="px-2 py-0.5 font-medium invisible whitespace-pre"
                          style={{
                            fontSize: '0.65rem',
                            gridColumn: '1',
                            gridRow: '1',
                            pointerEvents: 'none'
                          }}
                        >
                          {item.category_id && categories[item.category_id]
                            ? categories[item.category_id]
                            : 'Kategorie wählen'}
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 font-medium bg-[var(--primary)] text-white inline-block" style={{fontSize: '0.65rem', borderRadius: '3px'}}>
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
                    <p className="font-medium text-[var(--type)] text-xs text-left leading-none">{item.users?.username}</p>
                    <p className="text-xs text-gray-500 text-left leading-none mt-0.5" style={{fontSize: '0.65rem'}}>{formatDate(item.created_at)}</p>
                  </div>
                </div>

                {/* Content Display */}
                <div className="mb-3">
                  {item.content_type === 'post' ? (
                    // For Posts: Show title (auto-generated for Rant posts) + content excerpt
                    <div>
                      <h3 className="text-base md:text-xl font-semibold text-[var(--post-title)] leading-tight text-left mb-2">
                        {getPostDisplayTitle(item.title, item.content || '', item.category_id || 1)}
                      </h3>
                      {item.content && (
                        <p className="text-sm md:text-[15px] text-[var(--type)] leading-relaxed text-left line-clamp-3">
                          {getPlainText(item.content)}
                        </p>
                      )}
                    </div>
                  ) : item.content_type === 'therapist' ? (
                    // For Therapists: Show name as link + designation
                    <div>
                      <Link
                        to={`/therapeuten/${item.id}`}
                        className="text-base md:text-xl font-semibold leading-tight text-left block mb-1 text-[var(--primary)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.first_name} {item.last_name}
                      </Link>
                      {item.designation && (
                        <div className="text-sm text-gray-600 text-left">
                          {item.designation}
                        </div>
                      )}
                      <select
                        value={item.designation_id ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                          e.stopPropagation()
                          const newId = e.target.value ? parseInt(e.target.value) : null
                          try {
                            await new TherapistsService().updateTherapist(item.id, { designation_id: newId })
                            setQueueItems(prev => prev.map(q =>
                              q.content_type === 'therapist' && q.id === item.id ? { ...q, designation_id: newId } : q
                            ))
                          } catch (error) {
                            console.error('Error assigning designation:', error)
                            toast.error('Fehler beim Zuweisen der Bezeichnung')
                          }
                        }}
                        className="mt-2 text-sm border rounded px-2 py-1 bg-white text-gray-700"
                        style={{ borderColor: '#ebebeb' }}
                      >
                        <option value="">Bezeichnung zuweisen…</option>
                        {designations.map(d => (
                          <option key={d.id} value={d.id}>{getDesignationLabel(d)}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    // For Comments: Show comment text + post reference
                    <div>
                      <div className="text-sm md:text-[15px] text-[var(--type)] leading-relaxed text-left line-clamp-3 mb-2 border-l-2 border-[#fa8072] pl-3 italic">
                        "{getPlainText(item.content || '')}"
                      </div>
                      {item.post_id && (
                        <div className="text-xs text-gray-500 text-left">
                          Kommentar zu: <Link
                            to={`/post/${item.post_id}`}
                            className="text-[var(--primary)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {postTitles[item.post_id] ?
                              truncateText(postTitles[item.post_id], 40) :
                              `Post #${item.post_id}`
                            }
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Content Tags - thin row above the action buttons (posts only) */}
                {item.content_type === 'post' && (
                  <PostTags tags={item.tags} className="mb-1" />
                )}

                {/* Action Buttons - profile-post style text/icon buttons */}
                <div className="flex items-center justify-end gap-4 mt-2">
                  {item.content_type === 'therapist' ? (
                    // Therapist actions - only Delete and Freigeben
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                        disabled={processingId === item.id}
                        className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200 disabled:opacity-50"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          // Handle therapist dismissal directly (no modal needed)
                          if (!permissions.userProfile) return
                          setProcessingId(item.id)
                          try {
                            await moderationService.dismissTherapist(item.id, permissions.userProfile.id)
                            setQueueItems(prev => prev.filter(i => i.id !== item.id))
                            toast.success('Therapeut freigegeben!')
                          } catch (error) {
                            console.error('Error dismissing therapist:', error)
                            toast.error('Fehler beim Freigeben')
                          } finally {
                            setProcessingId(null)
                          }
                        }}
                        disabled={processingId === item.id}
                        className="text-xs font-medium text-[#37a653] hover:text-[#2c8743] transition-colors duration-200 disabled:opacity-50"
                        title="Freigeben"
                      >
                        Freigeben
                      </button>
                    </>
                  ) : (
                    // Post/Comment actions
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMessage(item)
                        }}
                        disabled={processingId === item.id}
                        className="text-gray-400 hover:text-[var(--primary)] p-1 transition-colors duration-200 disabled:opacity-50"
                        title="Nachricht senden"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item)
                        }}
                        disabled={processingId === item.id}
                        className="text-red-500 hover:text-red-700 p-1 transition-colors duration-200 disabled:opacity-50"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMessageItem(item)
                          setMessageAction('reject')
                          setShowMessageModal(true)
                        }}
                        disabled={processingId === item.id}
                        className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                        title="Ablehnen"
                      >
                        Ablehnen
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMessageItem(item)
                          setMessageAction('approve')
                          setShowMessageModal(true)
                        }}
                        disabled={processingId === item.id}
                        className="text-xs font-medium text-[var(--primary)] hover:text-[#3b71e6] transition-colors duration-200 disabled:opacity-50"
                        title="Publizieren"
                      >
                        Publizieren
                      </button>
                    </>
                  )}
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