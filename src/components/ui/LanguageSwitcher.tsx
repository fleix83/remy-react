import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'

const LANGS: ReadonlyArray<readonly [string, string]> = [
  ['de', 'DE'], ['fr', 'FR'], ['it', 'IT'], ['en', 'EN'],
]

interface LanguageSwitcherProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Compact DE/FR/IT/EN switcher. Flips i18next instantly (chrome + content) and,
 * for logged-in users, persists the choice to their profile so it follows them
 * across devices. Anonymous users' choice is cached in localStorage by the
 * language detector. The active language is underlined.
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', style }) => {
  const { i18n } = useTranslation()
  const { user, updateProfile } = useAuthStore()
  const active = (i18n.language || 'de').split('-')[0]

  const change = (lng: string) => {
    void i18n.changeLanguage(lng)
    if (user) updateProfile({ language_preference: lng }).catch(() => {})
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} style={style}>
      {LANGS.map(([lng, label]) => {
        const isActive = active === lng
        return (
          <button
            key={lng}
            type="button"
            onClick={() => change(lng)}
            aria-current={isActive ? 'true' : undefined}
            className="text-sm font-semibold transition-opacity hover:opacity-80 focus:outline-none"
            style={{
              color: '#4785ff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textDecoration: isActive ? 'underline' : 'none',
              textUnderlineOffset: '4px',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
