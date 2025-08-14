import { useAuthStore } from '../stores/auth.store'
import type { UserRole } from '../types/database.types'

interface UserPermissions {
  role: UserRole | null
  isUser: boolean
  isModerator: boolean
  isAdmin: boolean
  canModerate: boolean
  canAdmin: boolean
  isBanned: boolean
  canEditPost: (postUserId: string) => boolean
  canDeletePost: (postUserId: string) => boolean
  canEditComment: (commentUserId: string) => boolean
  canDeleteComment: (commentUserId: string) => boolean
  canBanUser: boolean
  canChangeUserRole: boolean
  userProfile: any // Add userProfile to the interface
}

export const usePermissions = (): UserPermissions => {
  const { user, userProfile } = useAuthStore()

  if (!user || !userProfile) {
    return {
      role: null,
      isUser: false,
      isModerator: false,
      isAdmin: false,
      canModerate: false,
      canAdmin: false,
      isBanned: false,
      canEditPost: () => false,
      canDeletePost: () => false,
      canEditComment: () => false,
      canDeleteComment: () => false,
      canBanUser: false,
      canChangeUserRole: false,
      userProfile: null
    }
  }

  const role = userProfile.role
  const isBanned = userProfile.is_banned
  const isUser = role === 'user'
  const isModerator = role === 'moderator'
  const isAdmin = role === 'admin'
  const canModerate = isModerator || isAdmin
  const canAdmin = isAdmin

  return {
    role,
    isUser,
    isModerator,
    isAdmin,
    canModerate: canModerate && !isBanned,
    canAdmin: canAdmin && !isBanned,
    isBanned,
    userProfile, // Add userProfile to the return object
    
    // Content moderation permissions
    canEditPost: (postUserId: string) => {
      if (isBanned) return false
      return user.id === postUserId || canModerate
    },
    
    canDeletePost: (postUserId: string) => {
      if (isBanned) return false
      return user.id === postUserId || canModerate
    },
    
    canEditComment: (commentUserId: string) => {
      if (isBanned) return false
      return user.id === commentUserId || canModerate
    },
    
    canDeleteComment: (commentUserId: string) => {
      if (isBanned) return false
      return user.id === commentUserId || canModerate
    },
    
    // User management permissions
    canBanUser: canModerate && !isBanned,
    canChangeUserRole: canAdmin && !isBanned
  }
}