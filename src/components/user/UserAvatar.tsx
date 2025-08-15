import React, { useState, useRef } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import AvatarService from '../../services/avatar.service'
import type { User } from '../../types/database.types'

interface UserAvatarProps {
  user: User
  size?: 'small' | 'medium' | 'large'
  showUpload?: boolean
  className?: string
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'medium', 
  showUpload = false, 
  className = '' 
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { updateProfile } = useAuthStore()

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16', 
    large: 'w-32 h-32'
  }

  const avatarUrl = user.avatar_url || AvatarService.getDefaultAvatar(user.username)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const newAvatarUrl = await AvatarService.uploadAvatar(user.id, file)
      
      // Update the user profile in the store
      await updateProfile({ avatar_url: newAvatarUrl })
      
    } catch (error) {
      console.error('Avatar upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user.avatar_url) return

    setIsUploading(true)
    setUploadError(null)

    try {
      await AvatarService.deleteAvatar(user.id, user.avatar_url)
      await updateProfile({ avatar_url: null })
    } catch (error) {
      console.error('Avatar deletion error:', error)
      setUploadError(error instanceof Error ? error.message : 'Failed to remove avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAvatarClick = () => {
    if (showUpload && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg group
          ${showUpload ? 'cursor-pointer hover:opacity-80 transition-opacity duration-200' : ''}
          ${isUploading ? 'opacity-50' : ''}
        `}
        onClick={handleAvatarClick}
      >
        <img
          src={avatarUrl}
          alt={`${user.username}'s avatar`}
          className="w-full h-full object-cover bg-gray-200"
          onLoad={() => console.log('Avatar loaded successfully:', avatarUrl)}
          onError={(e) => {
            console.error('Avatar failed to load:', avatarUrl)
            // Fallback to default avatar on error
            const target = e.target as HTMLImageElement
            target.src = AvatarService.getDefaultAvatar(user.username)
          }}
        />
        
        {/* Upload overlay - temporarily disabled for debugging */}
        {false && showUpload && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center pointer-events-none">
            <svg 
              className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37a653]"></div>
          </div>
        )}
      </div>

      {/* File input */}
      {showUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Remove avatar button */}
      {showUpload && user.avatar_url && size === 'large' && (
        <button
          onClick={handleRemoveAvatar}
          disabled={isUploading}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Remove avatar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Upload tooltip */}
      {showUpload && size === 'large' && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <p className="text-xs text-gray-500 text-center whitespace-nowrap">
            Click to change avatar
          </p>
        </div>
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