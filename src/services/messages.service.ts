import { supabase } from '../lib/supabase'
import type { Message } from '../types/database.types'

export interface Conversation {
  id: string // participant ID (other user)
  participant: {
    id: string
    username: string
    avatar_url?: string | null
  }
  lastMessage: Message
  unreadCount: number
  lastActivity: string
}

export interface MessageWithUser extends Message {
  sender?: {
    id: string
    username: string
    avatar_url?: string | null
  }
  receiver?: {
    id: string
    username: string
    avatar_url?: string | null
  }
}

export interface SendMessageData {
  receiver_id: string
  content: string
  post_messages_id?: number // For post-related messages
}

export class MessagesService {

  // Get all conversations for current user
  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get all messages involving the current user
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }

    if (!messages) return []

    // Group messages by conversation (other participant)
    const conversationMap = new Map<string, {
      participant: { id: string; username: string; avatar_url?: string | null }
      messages: MessageWithUser[]
      unreadCount: number
    }>()

    for (const message of messages) {
      const otherParticipantId = message.sender_id === user.id ? message.receiver_id : message.sender_id
      const otherParticipant = message.sender_id === user.id ? message.receiver : message.sender

      if (!conversationMap.has(otherParticipantId)) {
        conversationMap.set(otherParticipantId, {
          participant: otherParticipant!,
          messages: [],
          unreadCount: 0
        })
      }

      const conversation = conversationMap.get(otherParticipantId)!
      conversation.messages.push(message as MessageWithUser)
      
      // Count unread messages (received by current user and not read)
      if (message.receiver_id === user.id && !message.is_read) {
        conversation.unreadCount++
      }
    }

    // Convert to Conversation array
    const conversations: Conversation[] = []
    conversationMap.forEach((conv, participantId) => {
      const lastMessage = conv.messages[0] // Already sorted by created_at desc
      if (lastMessage) {
        conversations.push({
          id: participantId,
          participant: conv.participant,
          lastMessage: lastMessage,
          unreadCount: conv.unreadCount,
          lastActivity: lastMessage.created_at
        })
      }
    })

    // Sort by last activity
    conversations.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())

    return conversations
  }

  // Get messages in a specific conversation
  async getConversationMessages(participantId: string): Promise<MessageWithUser[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if the other user has blocked the current user
    const isBlocked = await this.isUserBlocked(participantId, user.id)
    if (isBlocked) {
      throw new Error('Cannot view conversation - user has blocked you')
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching conversation messages:', error)
      throw error
    }

    return messages as MessageWithUser[] || []
  }

  // Send a new message
  async sendMessage(messageData: SendMessageData): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if recipient has messaging enabled
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('messages_active')
      .eq('id', messageData.receiver_id)
      .single()

    if (recipientError) {
      console.error('Error checking recipient:', recipientError)
      throw new Error('Unable to send message - recipient not found')
    }

    if (!recipient.messages_active) {
      throw new Error('User has disabled private messages')
    }

    // Check if either user has blocked the other
    const [senderBlocked, receiverBlocked] = await Promise.all([
      this.isUserBlocked(messageData.receiver_id, user.id), // receiver blocked sender
      this.isUserBlocked(user.id, messageData.receiver_id) // sender blocked receiver
    ])

    if (senderBlocked || receiverBlocked) {
      throw new Error('Cannot send message - blocked user')
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: user.id,
        receiver_id: messageData.receiver_id,
        content: messageData.content,
        post_messages_id: messageData.post_messages_id || null,
        is_read: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }

    // Create notification for recipient
    await this.createMessageNotification(message, messageData.receiver_id)

    return message
  }

  // Mark messages as read
  async markMessagesAsRead(participantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', participantId)
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  }

  // Get total unread message count
  async getUnreadMessageCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  }

  // Check if user A has blocked user B
  private async isUserBlocked(blockerUserId: string, blockedUserId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocker_id', blockerUserId)
      .eq('blocked_id', blockedUserId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user block status:', error)
      return false
    }

    return !!data
  }

  // Create a notification for new message
  private async createMessageNotification(message: Message, receiverId: string): Promise<void> {
    try {
      // Get sender info for notification
      const { data: sender } = await supabase
        .from('users')
        .select('username')
        .eq('id', message.sender_id)
        .single()

      if (sender) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: receiverId,
            type: 'private_message',
            title: 'New Message',
            message: `${sender.username} sent you a message`,
            is_read: false
          }])
      }
    } catch (error) {
      console.error('Error creating message notification:', error)
      // Don't throw - notification failure shouldn't prevent message sending
    }
  }

  // Delete a message (only sender can delete)
  async deleteMessage(messageId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id) // Only sender can delete

    if (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  // Check if current user can message another user
  async canMessageUser(userId: string): Promise<{ canMessage: boolean; reason?: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { canMessage: false, reason: 'Not authenticated' }

    if (user.id === userId) {
      return { canMessage: false, reason: 'Cannot message yourself' }
    }

    // Check if target user has messaging enabled
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('messages_active')
      .eq('id', userId)
      .single()

    if (error) {
      return { canMessage: false, reason: 'User not found' }
    }

    if (!targetUser.messages_active) {
      return { canMessage: false, reason: 'User has disabled private messages' }
    }

    // Check blocking status
    const [currentUserBlocked, targetUserBlocked] = await Promise.all([
      this.isUserBlocked(userId, user.id), // target blocked current user
      this.isUserBlocked(user.id, userId)  // current user blocked target
    ])

    if (currentUserBlocked) {
      return { canMessage: false, reason: 'User has blocked you' }
    }

    if (targetUserBlocked) {
      return { canMessage: false, reason: 'You have blocked this user' }
    }

    return { canMessage: true }
  }
}