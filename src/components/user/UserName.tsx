import React from 'react'
import { useTranslation } from 'react-i18next'
import { isVerifiedTherapist } from '../../types/database.types'

/** Brand blue used for verified therapists everywhere a user name appears. */
export const THERAPIST_BLUE = '#4785ff'

interface TherapistBadgeProps {
  /** Icon size in px; defaults to 1em so it tracks the surrounding font size. */
  size?: number | string
  className?: string
}

/** Blue circular checkmark shown next to verified therapists' names. */
export const TherapistBadge: React.FC<TherapistBadgeProps> = ({ size = '1em', className = '' }) => {
  const { t } = useTranslation('common')
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block align-[-0.15em] flex-shrink-0 ${className}`}
      role="img"
      aria-label={t('therapist.verified')}
      style={{ color: THERAPIST_BLUE }}
    >
      <title>{t('therapist.verified')}</title>
      <path
        fill="currentColor"
        d="M12 1.5l2.4 1.9 3-.5 1.2 2.8 2.8 1.2-.5 3 1.9 2.4-1.9 2.4.5 3-2.8 1.2-1.2 2.8-3-.5L12 22.5l-2.4-1.9-3 .5-1.2-2.8-2.8-1.2.5-3L1.2 12l1.9-2.4-.5-3 2.8-1.2 1.2-2.8 3 .5z"
      />
      <path
        d="M7.5 12.2l3 3 6-6.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface UserNameProps {
  user: { username?: string | null; therapist_verified_at?: string | null } | null | undefined
  /** Text shown when the user is missing (deleted account, anonymous). */
  fallback?: string
  /** Element used for the text; defaults to <span>. */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div'
  className?: string
  style?: React.CSSProperties
  /** Hide the checkmark (e.g. in very tight spaces); the blue colour stays. */
  hideBadge?: boolean
}

/**
 * Renders a user's display name. Verified therapists are shown in blue with a
 * checkmark, everyone else inherits the surrounding styling. Use this instead
 * of `{user.username}` wherever a name is displayed.
 */
const UserName: React.FC<UserNameProps> = ({
  user,
  fallback = '',
  as: Tag = 'span',
  className = '',
  style,
  hideBadge = false,
}) => {
  const name = user?.username || fallback
  const verified = isVerifiedTherapist(user)

  if (!verified) {
    return (
      <Tag className={className} style={style}>
        {name}
      </Tag>
    )
  }

  return (
    <Tag className={className} style={{ ...style, color: THERAPIST_BLUE }}>
      <span className="inline-flex items-center gap-[0.3em] max-w-full">
        <span className="truncate">{name}</span>
        {!hideBadge && <TherapistBadge />}
      </span>
    </Tag>
  )
}

export default UserName
