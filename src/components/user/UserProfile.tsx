import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from './UserAvatar'
import ProfileSettings from './ProfileSettings'
import BlockedUsers from './BlockedUsers'
import UserContent from './UserContent'
import AvatarService from '../../services/avatar.service'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import { toast } from '../../stores/toast.store'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'

const UserProfile: React.FC = () => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { user, userProfile, loadUserProfile, logout } = useAuthStore()
  const lang = useActiveLanguage()
  const [showSettings, setShowSettings] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundHover, setBackgroundHover] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale(lang), {
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
      toast.error(error instanceof Error ? error.message : t('header.backgroundUploadError'))
    } finally {
      setUploadingBackground(false)
      if (backgroundInputRef.current) {
        backgroundInputRef.current.value = ''
      }
    }
  }

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: 'rgb(238, 250, 240)' }}>
      {/* Header bar - matching PostView */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: '65px',
          background: 'linear-gradient(180deg, hsla(221, 100%, 95%, 1) 0%, hsla(130, 55%, 96%, 1) 100%, hsla(130, 55%, 96%, 1) 100%)'
        }}
      >
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 flex justify-between items-center">
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

      <div className="max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>
        {/* Header Container with Banner and Avatar */}
        <div className="relative">
          {/* Background Header */}
          <div
            className="bg-gradient-to-r from-[var(--primary)] to-[#2d8544] relative overflow-hidden cursor-pointer group"
            style={{
              maxHeight: '118px',
              height: '118px',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              borderBottomLeftRadius: '0',
              borderBottomRightRadius: '0'
            }}
            onClick={handleBackgroundClick}
            onMouseEnter={() => setBackgroundHover(true)}
            onMouseLeave={() => setBackgroundHover(false)}
          >
            {userProfile.background_image_url && (
              <div
                style={{
                  backgroundImage: `url(${userProfile.background_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              />
            )}

            {/* Edit Banner button - shown on hover */}
            <div className="absolute top-4 right-4">
              <div className={`bg-white/90 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-opacity duration-200 ${backgroundHover || uploadingBackground ? 'opacity-100' : 'opacity-0'}`}>
                {uploadingBackground ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[var(--primary)]"></div>
                    {t('header.uploadingBanner')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('header.changeBanner')}
                  </>
                )}
              </div>
            </div>

            {/* Hidden file input - accepts all image formats including iOS HEIC */}
            <input
              ref={backgroundInputRef}
              type="file"
              accept={AvatarService.FILE_INPUT_ACCEPT}
              onChange={handleBackgroundChange}
              className="hidden"
              disabled={uploadingBackground}
            />
          </div>

          {/* Overlapping Avatar - aligned with content + 15px left offset */}
          <div className="absolute" style={{ left: '15px', top: '29px', zIndex: 10 }}>
            <UserAvatar
              user={userProfile}
              size="large"
              showUpload={true}
            />
          </div>
        </div>

        {/* Public Profile Information */}
        <div
          className="bg-white shadow-sm relative"
          style={{
            marginTop: '0',
            paddingTop: '74px',
            paddingBottom: '32px',
            paddingLeft: '24px',
            paddingRight: '24px',
            minHeight: '200px',
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: '28px',
            borderBottomRightRadius: '28px'
          }}
        >
          {/* Edit Profile link - positioned in top right corner of profile div */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="absolute border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded-md px-3 py-1 transition-colors duration-200"
            style={{ top: '16px', right: '16px' }}
          >
            {t('header.edit')}
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {userProfile.username}
            </h1>
            <p className="text-gray-400 text-sm mb-4">
              {t('header.registeredOn', { date: userProfile.created_at ? formatDate(userProfile.created_at) : t('header.unknownDate') })}
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