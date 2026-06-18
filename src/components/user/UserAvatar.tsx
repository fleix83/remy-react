import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'
import AvatarService from '../../services/avatar.service'
import type { User } from '../../types/database.types'

// Minimal user data needed for avatar display
interface MinimalUser {
  id: string
  username: string
  avatar_url?: string | null
}

interface UserAvatarProps {
  user: User | MinimalUser
  size?: 'small' | 'medium' | 'large' | 'message'
  showUpload?: boolean
  className?: string
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'medium',
  showUpload = false,
  className = ''
}) => {
  const { t } = useTranslation('profile')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { updateProfile } = useAuthStore()

  const sizeStyles = {
    small: { width: '1.6rem', height: '1.6rem' },
    medium: { width: '4rem', height: '4rem' },
    large: { width: '8rem', height: '8rem' },
    message: { width: '2.6rem', height: '2.6rem' }
  }

  const avatarUrl = user.avatar_url || AvatarService.getDefaultAvatar(user?.username || 'User')

  // Check if user has full User properties (needed for upload functionality)
  const isFullUser = (user: User | MinimalUser): user is User => {
    return 'email' in user && 'role' in user
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !isFullUser(user)) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const newAvatarUrl = await AvatarService.uploadAvatar(user.id, file)
      
      // Update the user profile in the store
      await updateProfile({ avatar_url: newAvatarUrl })
      
    } catch (error) {
      console.error('Avatar upload error:', error)
      setUploadError(error instanceof Error ? error.message : t('avatar.uploadError'))
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user.avatar_url || !isFullUser(user)) return

    setIsUploading(true)
    setUploadError(null)

    try {
      await AvatarService.deleteAvatar(user.id, user.avatar_url)
      await updateProfile({ avatar_url: null })
    } catch (error) {
      console.error('Avatar deletion error:', error)
      setUploadError(error instanceof Error ? error.message : t('avatar.removeError'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleShowControls = () => {
    setShowControls(true)
    // Clear existing timeout
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    // Auto-fade after 3 seconds
    fadeTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }

  const handleHideControls = () => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
    setShowControls(false)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await handleRemoveAvatar()
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          rounded-full overflow-hidden shadow-lg group
          ${isUploading ? 'opacity-50' : ''}
        `}
        style={sizeStyles[size]}
        onMouseEnter={showUpload && isFullUser(user) && size === 'large' ? handleShowControls : undefined}
        onMouseLeave={showUpload && isFullUser(user) && size === 'large' ? handleHideControls : undefined}
        onTouchStart={showUpload && isFullUser(user) && size === 'large' ? handleShowControls : undefined}
      >
        <img
          src={avatarUrl}
          alt={`${user.username}'s avatar`}
          className="w-full h-full object-cover bg-gray-200"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            console.error('Avatar failed to load:', avatarUrl)
            // Fallback to default avatar on error
            const target = e.target as HTMLImageElement
            target.src = AvatarService.getDefaultAvatar(user?.username || 'User')
          }}
        />

        {/* Controls overlay - only for large avatars */}
        {showUpload && isFullUser(user) && size === 'large' && (
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300"
            style={{
              backgroundColor: showControls ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
              opacity: showControls ? 1 : 0,
              pointerEvents: showControls ? 'auto' : 'none'
            }}
          >
            {/* Delete button - upper half center */}
            <button
              onClick={handleDeleteClick}
              disabled={isUploading}
              className="absolute bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                top: '25%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              title={t('avatar.removeTitle')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Edit button - lower half center */}
            <button
              onClick={handleEditClick}
              disabled={isUploading}
              className="absolute hover:opacity-90 text-white rounded-full w-10 h-10 shadow-lg transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                top: '75%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--primary)'
              }}
              title={t('avatar.changeTitle')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2ebe7a]"></div>
          </div>
        )}
      </div>

      {/* File input - accepts all image formats including iOS HEIC */}
      {showUpload && isFullUser(user) && (
        <input
          ref={fileInputRef}
          type="file"
          accept={AvatarService.FILE_INPUT_ACCEPT}
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Error message */}
      {uploadError && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm whitespace-nowrap">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default UserAvatar