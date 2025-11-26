import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { User as UserProfile } from '../types/database.types'

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  authUnsubscribe: (() => void) | null

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<{ requiresConfirmation: boolean; message: string } | void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  loadUserProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  session: null,
  loading: true,
  authUnsubscribe: null,

  initialize: async () => {
    try {
      // Step 1: Restore session from localStorage
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        set({ user: session.user, session })
        await get().loadUserProfile()
      }

      // Step 2: Set up listener for auth state changes
      // This listener will handle login/logout/token refresh
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (session?.user) {
            set({ user: session.user, session })
            await get().loadUserProfile()
          } else {
            set({ user: null, session: null, userProfile: null })
          }
        }
      )

      // Store subscription for cleanup
      if (subscription) {
        set({ authUnsubscribe: () => subscription.unsubscribe() })
      }

    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      // Step 3: Mark loading as complete
      // This only happens after session restoration is attempted
      set({ loading: false })
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    if (data.user) {
      set({ user: data.user, session: data.session })
      await get().loadUserProfile()
    }
  },

  register: async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      // Translate Supabase error messages to German
      let message = error.message
      if (message.includes('at least 6 characters')) {
        message = 'Das Passwort muss mindestens 6 Zeichen lang sein.'
      } else if (message.includes('already registered')) {
        message = 'Diese E-Mail-Adresse ist bereits registriert.'
      }
      const translatedError = new Error(message)
      throw translatedError
    }

    // Check if email confirmation is required
    if (data?.user && !data.session) {
      return {
        requiresConfirmation: true,
        message: 'Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.'
      }
    }

    // Auto-login when confirmations disabled (backward compatibility)
    if (data?.user && data.session) {
      set({ user: data.user, session: data.session })
      await get().loadUserProfile()
    }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Clean up auth subscription
    const { authUnsubscribe } = get()
    if (authUnsubscribe) {
      authUnsubscribe()
      set({ authUnsubscribe: null })
    }

    set({ user: null, session: null, userProfile: null })
  },

  loadUserProfile: async () => {
    const { user } = get()
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Error loading user profile:', error)
        return
      }
      
      set({ userProfile: data })
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user, userProfile } = get()
    if (!user || !userProfile) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw error
    
    set({ userProfile: data })
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
  }
}))

// Initialize auth on store creation
useAuthStore.getState().initialize()