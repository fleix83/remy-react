import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import UserAvatar from './UserAvatar'
import AvatarService from '../../services/avatar.service'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import type { User } from '../../types/database.types'

interface ProfileHeaderProps {
  user: User
  editable?: boolean
  uploadingBackground?: boolean
  onBackgroundChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onEditClick?: () => void
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  editable = false,
  uploadingBackground = false,
  onBackgroundChange,
  onEditClick,
}) => {
  const { t } = useTranslation('profile')
  const lang = useActiveLanguage()
  const [backgroundHover, setBackgroundHover] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(intlLocale(lang), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const handleBackgroundClick = () => {
    if (editable) backgroundInputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBackgroundChange?.(e)
    if (backgroundInputRef.current) backgroundInputRef.current.value = ''
  }

  return (
    <>
      {/* Header Container with Banner and Avatar */}
      <div className="relative">
        <div
          className={`bg-gradient-to-r from-[var(--primary)] to-[#2d8544] relative overflow-hidden group ${editable ? 'cursor-pointer' : ''}`}
          style={{
            maxHeight: '118px',
            height: '118px',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            borderBottomLeftRadius: '0',
            borderBottomRightRadius: '0',
          }}
          onClick={handleBackgroundClick}
          onMouseEnter={() => editable && setBackgroundHover(true)}
          onMouseLeave={() => editable && setBackgroundHover(false)}
        >
          {user.background_image_url && (
            <div
              style={{
                backgroundImage: `url(${user.background_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          )}

          {editable && (
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
          )}

          {editable && (
            <input
              ref={backgroundInputRef}
              type="file"
              accept={AvatarService.FILE_INPUT_ACCEPT}
              onChange={handleChange}
              className="hidden"
              disabled={uploadingBackground}
            />
          )}
        </div>

        {/* Overlapping Avatar */}
        <div className="absolute" style={{ left: '15px', top: '29px', zIndex: 10 }}>
          <UserAvatar user={user} size="large" showUpload={editable} />
        </div>
      </div>

      {/* Bio card */}
      <div
        className="shadow-sm relative"
        style={{
          backgroundColor: '#f7f5ef',
          marginTop: '0',
          paddingTop: '74px',
          paddingBottom: '32px',
          paddingLeft: '24px',
          paddingRight: '24px',
          minHeight: '200px',
          borderTopLeftRadius: '0',
          borderTopRightRadius: '0',
          borderBottomLeftRadius: '28px',
          borderBottomRightRadius: '28px',
        }}
      >
        {editable && (
          <button
            onClick={onEditClick}
            className="absolute border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded-md px-3 py-1 transition-colors duration-200"
            style={{ top: '16px', right: '16px' }}
          >
            {t('header.edit')}
          </button>
        )}
        <div className="text-left">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.username}</h1>
          <p className="text-gray-400 text-sm mb-4">
            {t('header.registeredOn', { date: user.created_at ? formatDate(user.created_at) : t('header.unknownDate') })}
          </p>
          {user.bio && (
            <div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ProfileHeader
