import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { therapistClaimsService, type OwnTherapistStatus } from '../../services/therapist-claims.service'
import { formatTherapistPersonName } from '../../utils/therapistHelpers'
import { TherapistBadge } from './UserName'

/**
 * Own-profile card showing a verified therapist the state of their directory
 * entry: linked (with an edit shortcut), pending moderation, or rejected.
 * Renders nothing for non-therapists.
 */
const TherapistProfileCard: React.FC = () => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { user, userProfile } = useAuthStore()
  const verified = !!userProfile?.therapist_verified_at
  const [status, setStatus] = useState<OwnTherapistStatus | null>(null)

  useEffect(() => {
    if (!user || !verified) return
    let cancelled = false

    const load = async () => {
      try {
        let result = await therapistClaimsService.getOwnStatus(user.id, verified)
        if (result.status === 'none') {
          // No link and no claim yet — run the (idempotent) matcher once.
          await therapistClaimsService.claimOwnProfile()
          result = await therapistClaimsService.getOwnStatus(user.id, verified)
        }
        if (!cancelled) setStatus(result)
      } catch (err) {
        console.error('Error loading therapist profile status:', err)
        if (!cancelled) setStatus({ status: 'none' })
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user, verified])

  if (!verified) return null

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '28px',
    padding: '24px',
  }

  let body: React.ReactNode
  if (!status) {
    body = <p className="text-sm text-gray-500">{t('therapist.loading')}</p>
  } else if (status.status === 'linked') {
    const th = status.therapist
    const name = formatTherapistPersonName(th) || th.institution || ''
    const location = [th.institution && formatTherapistPersonName(th) ? th.institution : null, th.city, th.canton]
      .filter(Boolean)
      .join(', ')
    body = (
      <>
        <p className="text-sm text-gray-500 mb-2">{t('therapist.linked')}</p>
        <p className="font-semibold text-gray-900">{name}</p>
        {location && <p className="text-sm text-gray-600">{location}</p>}
        <button
          onClick={() => navigate(`/therapists?therapist=${th.id}`)}
          className="mt-4 rounded-full px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4785ff' }}
        >
          {t('therapist.editProfile')}
        </button>
      </>
    )
  } else if (status.status === 'pending') {
    body = (
      <>
        <p className="font-semibold text-gray-900">
          {status.claim.hin_first_name} {status.claim.hin_last_name}
        </p>
        <p className="text-sm text-gray-600 mt-1">{t('therapist.pending')}</p>
      </>
    )
  } else if (status.status === 'rejected') {
    body = (
      <>
        <p className="text-sm text-gray-700">{t('therapist.rejected')}</p>
        {status.claim.note && (
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{status.claim.note}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">{t('therapist.contactModeration')}</p>
      </>
    )
  } else {
    // 'none' after a failed claim attempt — nothing useful to show yet.
    return null
  }

  return (
    <div className="mt-6 shadow-sm text-left" style={cardStyle}>
      <h2 className="text-lg font-bold mb-3 inline-flex items-center gap-2" style={{ color: '#4785ff' }}>
        <TherapistBadge size={20} />
        {t('therapist.title')}
      </h2>
      {body}
    </div>
  )
}

export default TherapistProfileCard
