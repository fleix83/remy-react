import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MessagesService } from '../services/messages.service'
import { UserBlocksService } from '../services/user-blocks.service'
import type { Conversation, MessageWithUser, SendMessageData } from '../services/messages.service'
import type { Message } from '../types/database.types'

interface MessagesState {
  // State
  conversations: Conversation[]
  currentConversation: Conversation | null
  currentMessages: MessageWithUser[]
  unreadCount: number
  loading: boolean
  loadingMessages: boolean
  initialized: boolean
  
  // Services
  messagesService: MessagesService
  userBlocksService: UserBlocksService
  
  // Actions
  loadConversations: () => Promise<void>
  loadConversationMessages: (participantId: string) => Promise<void>
  sendMessage: (messageData: SendMessageData) => Promise<void>
  markMessagesAsRead: (participantId: string) => Promise<void>
  setCurrentConversation: (conversation: Conversation | null) => void
  loadUnreadCount: () => Promise<void>
  deleteMessage: (messageId: number) => Promise<void>
  
  // Real-time subscriptions
  subscribeToMessages: () => void
  unsubscribeFromMessages: () => void
  
  // Utility methods
  findOrCreateConversation: (participantId: string, participant: any) => Promise<Conversation>
  updateConversationLastMessage: (message: Message) => void
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  currentMessages: [],
  unreadCount: 0,
  loading: false,
  loadingMessages: false,
  initialized: false,
  
  // Services
  messagesService: new MessagesService(),
  userBlocksService: new UserBlocksService(),

  // Load all conversations
  loadConversations: async () => {
    set({ loading: true })
    try {
      const { messagesService } = get()
      const conversations = await messagesService.getConversations()
      set({ conversations })
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      set({ loading: false })
    }
  },

  // Load messages for a specific conversation
  loadConversationMessages: async (participantId: string) => {
    set({ loadingMessages: true })
    try {
      const { messagesService } = get()
      const messages = await messagesService.getConversationMessages(participantId)
      set({ currentMessages: messages })
      
      // Mark messages as read
      await messagesService.markMessagesAsRead(participantId)
      
      // Update unread count
      get().loadUnreadCount()
      
      // Update conversation unread count
      const { conversations } = get()
      const updatedConversations = conversations.map(conv => 
        conv.id === participantId ? { ...conv, unreadCount: 0 } : conv
      )
      set({ conversations: updatedConversations })
      
    } catch (error) {
      console.error('Error loading conversation messages:', error)
    } finally {
      set({ loadingMessages: false })
    }
  },

  // Send a new message
  sendMessage: async (messageData: SendMessageData) => {
    try {
      const { messagesService } = get()
      const newMessage = await messagesService.sendMessage(messageData)
      
      // Add message to current conversation if it matches
      if (get().currentConversation?.id === messageData.receiver_id) {
        const { currentMessages } = get()
        const messageWithUser: MessageWithUser = {
          ...newMessage,
          sender: { 
            id: newMessage.sender_id, 
            username: 'You', // Will be updated by real-time subscription
            avatar_url: null 
          }
        }
        set({ currentMessages: [...currentMessages, messageWithUser] })
      }
      
      // Update conversations list
      get().loadConversations()
      
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (participantId: string) => {
    try {
      const { messagesService } = get()
      await messagesService.markMessagesAsRead(participantId)
      
      // Update unread count
      get().loadUnreadCount()
      
      // Update conversation unread count
      const { conversations } = get()
      const updatedConversations = conversations.map(conv => 
        conv.id === participantId ? { ...conv, unreadCount: 0 } : conv
      )
      set({ conversations: updatedConversations })
      
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  },

  // Set current conversation
  setCurrentConversation: (conversation: Conversation | null) => {
    set({ 
      currentConversation: conversation,
      currentMessages: [] // Clear messages when switching conversations
    })
    
    if (conversation) {
      get().loadConversationMessages(conversation.id)
    }
  },

  // Load unread message count
  loadUnreadCount: async () => {
    try {
      const { messagesService } = get()
      const count = await messagesService.getUnreadMessageCount()
      set({ unreadCount: count })
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  },

  // Delete a message
  deleteMessage: async (messageId: number) => {
    try {
      const { messagesService } = get()
      await messagesService.deleteMessage(messageId)
      
      // Remove message from current messages
      const { currentMessages } = get()
      const updatedMessages = currentMessages.filter(msg => msg.id !== messageId)
      set({ currentMessages: updatedMessages })
      
      // Reload conversations to update last message
      get().loadConversations()
      
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  },

  // Find or create conversation with a user
  findOrCreateConversation: async (participantId: string, participant: any) => {
    const { conversations } = get()
    
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => conv.id === participantId)
    if (existingConversation) {
      return existingConversation
    }
    
    // Create new conversation object
    const newConversation: Conversation = {
      id: participantId,
      participant: {
        id: participant.id || participantId,
        username: participant.username || 'Unknown User',
        avatar_url: participant.avatar_url || null
      },
      lastMessage: {
        id: 0,
        sender_id: '',
        receiver_id: '',
        content: '',
        created_at: new Date().toISOString(),
        is_read: false,
        post_messages_id: null
      },
      unreadCount: 0,
      lastActivity: new Date().toISOString()
    }
    
    // Add to conversations
    set({ conversations: [newConversation, ...conversations] })
    
    return newConversation
  },

  // Update conversation when new message arrives
  updateConversationLastMessage: async (message: Message) => {
    const { conversations } = get()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return
    
    const otherParticipantId = message.sender_id === user.id ? message.receiver_id : message.sender_id
    
    const updatedConversations = conversations.map(conv => {
      if (conv.id === otherParticipantId) {
        return {
          ...conv,
          lastMessage: message,
          lastActivity: message.created_at,
          unreadCount: message.receiver_id === user.id && !message.is_read ? 
            conv.unreadCount + 1 : conv.unreadCount
        }
      }
      return conv
    })
    
    // Sort by last activity
    updatedConversations.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )
    
    set({ conversations: updatedConversations })
  },

  // Subscribe to real-time message updates
  subscribeToMessages: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const userId = user.id

    // Subscribe to new messages where user is receiver
    supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          console.log('New message received:', payload)
          const message = payload.new as Message
          
          // Update conversations
          get().updateConversationLastMessage(message)
          
          // Update unread count
          get().loadUnreadCount()
          
          // If this message is for current conversation, add it to current messages
          const { currentConversation } = get()
          if (currentConversation?.id === message.sender_id) {
            // Fetch complete message with user data
            get().loadConversationMessages(currentConversation.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          console.log('Message updated:', payload)
          // Handle message updates (like read status)
          const updatedMessage = payload.new as Message
          
          const { currentMessages } = get()
          const updatedMessages = currentMessages.map(msg =>
            msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
          )
          set({ currentMessages: updatedMessages })
        }
      )
      .subscribe()
  },

  // Unsubscribe from real-time updates
  unsubscribeFromMessages: () => {
    supabase.removeAllChannels()
  }
}))

// Initialize auth listener only after store is created
let authListenerInitialized = false

export const initializeMessagingAuth = () => {
  if (authListenerInitialized) return
  authListenerInitialized = true
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const store = useMessagesStore.getState()
      if (!store.initialized) {
        store.loadConversations()
        store.loadUnreadCount()
        await store.subscribeToMessages()
        useMessagesStore.setState({ initialized: true })
      }
    } else if (event === 'SIGNED_OUT') {
      const store = useMessagesStore.getState()
      store.unsubscribeFromMessages()
      // Reset state
      useMessagesStore.setState({
        conversations: [],
        currentConversation: null,
        currentMessages: [],
        unreadCount: 0,
        initialized: false
      })
    }
  })
}