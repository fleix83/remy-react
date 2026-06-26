import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import ProfileHeader from './ProfileHeader'
import UserContent from './UserContent'
import UserSearchService from '../../services/user-search.service'
import { isSelfProfile, shouldShowPostHistory } from '../../utils/profileVisibility'
import type { User } from '../../types/database.types'

const PublicProfile: React.FC = () => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Viewing yourself: send to the editable own-profile screen.
  useEffect(() => {
    if (id && user && isSelfProfile(id, user.id)) {
      navigate('/profile', { replace: true })
    }
  }, [id, user, navigate])

  useEffect(() => {
    let cancelled = false
    if (!id || (user && isSelfProfile(id, user.id))) return
    setLoading(true)
    setNotFound(false)
    UserSearchService.getPublicUser(id)
      .then((data) => {
        if (cancelled) return
        if (!data) setNotFound(true)
        else setProfile(data)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('header.loading')}</p>
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{t('header.notFound')}</p>
        <button
          onClick={() => navigate('/')}
          className="font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--primary)' }}
        >
          {t('header.backToForum')}
        </button>
      </div>
    )
  }

  const showHistory = shouldShowPostHistory(profile, user?.id)

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: '#ffffff' }}>
      <div className="profile-top-header w-full flex items-start justify-center relative">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 h-[65px] flex justify-between items-center">
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
          <div className="w-6 h-6"></div>
        </div>
      </div>

      <div className="profile-content max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>
        <ProfileHeader user={profile} editable={false} />

        {showHistory && (
          <div className="mt-6">
            <UserContent userId={profile.id} publicView />
          </div>
        )}
      </div>
    </div>
  )
}

export default PublicProfile
