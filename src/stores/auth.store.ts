import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { User as UserProfile } from '../types/database.types'

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  
  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  loadUserProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        set({ user: session.user, session })
        await get().loadUserProfile()
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user, session })
          await get().loadUserProfile()
        } else {
          set({ user: null, session: null, userProfile: null })
        }
      })
      
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    })
    
    if (error) throw error
    
    // Note: User won't be set until email is confirmed
    // Return void as expected by interface
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
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
  }
}))

// Initialize auth on store creation
useAuthStore.getState().initialize()