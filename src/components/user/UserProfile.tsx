import React, { useState, useRef } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from './UserAvatar'
import ProfileSettings from './ProfileSettings'
import BlockedUsers from './BlockedUsers'
import UserContent from './UserContent'
import AvatarService from '../../services/avatar.service'

const UserProfile: React.FC = () => {
  const { user, userProfile, loadUserProfile } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundHover, setBackgroundHover] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleBackgroundClick = () => {
    backgroundInputRef.current?.click()
  }

  const handleBackgroundChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploadingBackground(true)
    try {
      await AvatarService.uploadBackground(user.id, file)
      await loadUserProfile()
    } catch (error) {
      console.error('Error uploading background:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload background image')
    } finally {
      setUploadingBackground(false)
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Container with Overlapping Avatar */}
        <div className="relative">
          {/* Background Header */}
          <div
            className="bg-gradient-to-r from-[var(--primary)] to-[#2d8544] rounded-lg h-48 relative overflow-hidden cursor-pointer group"
            onClick={handleBackgroundClick}
            onMouseEnter={() => setBackgroundHover(true)}
            onMouseLeave={() => setBackgroundHover(false)}
            style={
              userProfile.background_image_url
                ? {
                    backgroundImage: `url(${userProfile.background_image_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            {/* Edit Banner button - top right */}
            <div className="absolute top-4 right-4">
              <div className={`bg-white/90 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-opacity duration-200 ${backgroundHover || uploadingBackground ? 'opacity-100' : 'opacity-0'}`}>
                {uploadingBackground ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[var(--primary)]"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Edit Banner
                  </>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleBackgroundChange}
              className="hidden"
              disabled={uploadingBackground}
            />
          </div>
          
          {/* Overlapping Avatar */}
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
            <UserAvatar
              user={userProfile}
              size="large"
              showUpload={true}
            />
          </div>
        </div>

        {/* Edit Profile Button - below banner, aligned left */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="mt-[14px] mb-[30px] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/15 text-[var(--primary)] px-[7px] py-[3px] rounded-md font-medium text-sm transition-colors duration-200 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </button>

        {/* Public Profile Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {userProfile.username}
            </h1>
            <p className="text-gray-400 text-sm mb-2">
              Registriert am {formatDate(userProfile.created_at)}
            </p>
            
            {userProfile.bio && (
              <div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {userProfile.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Section */}
        {showSettings && (
          <div className="mt-6 space-y-6">
            <ProfileSettings isEditing={true} onEditingChange={() => setShowSettings(false)} />
            <BlockedUsers />
          </div>
        )}

        {/* User Content */}
        <div className="mt-6">
          <UserContent userId={userProfile.id} />
        </div>
      </div>
    </div>
  )
}

export default UserProfile