import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from './UserAvatar'
import ProfileHeader from './ProfileHeader'
import ProfileSettings from './ProfileSettings'
import BlockedUsers from './BlockedUsers'
import UserContent from './UserContent'
import AvatarService from '../../services/avatar.service'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import { toast } from '../../stores/toast.store'

const UserProfile: React.FC = () => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { user, userProfile, loadUserProfile, logout } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('header.loading')}</p>
        </div>
      </div>
    )
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
      toast.error(error instanceof Error ? error.message : t('header.backgroundUploadError'))
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: '#ffffff' }}>
      {/* Header bar — compact 65px on desktop; tall gradient on mobile (CSS).
          The back link + avatar live in a fixed 65px row pinned to the top so
          they keep their position no matter how tall the header grows. */}
      <div className="profile-top-header w-full flex items-start justify-center relative">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 h-[65px] flex justify-between items-center">
          {/* Invisible spacer to balance the avatar and center the back button */}
          <div className="w-6 h-6"></div>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" style={{ stroke: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('header.backToForum')}
          </button>

          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-1 rounded-full transition-colors mr-2.5"
            >
              {userProfile && (
                <UserAvatar
                  user={userProfile}
                  size="small"
                />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="profile-content max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>
        <ProfileHeader
          user={userProfile}
          editable
          uploadingBackground={uploadingBackground}
          onBackgroundChange={handleBackgroundChange}
          onEditClick={() => setShowSettings(!showSettings)}
        />

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

      {/* Mobile Slide-in Menu */}
      <MobileSlideMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userRole={userProfile?.role || undefined}
        onLogout={handleSignOut}
      />
    </div>
  )
}

export default UserProfile
