import React, { useEffect, useRef, useState } from 'react'
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
 * Compact language dropdown: shows the active language code (e.g. "DE") and
 * opens a small menu with the remaining languages on click. Flips i18next
 * instantly (chrome + content) and, for logged-in users, persists the choice
 * to their profile so it follows them across devices. Anonymous users' choice
 * is cached in localStorage by the language detector.
 *
 * The trigger inherits its text color from the wrapper, so callers style it
 * per context (e.g. white on the mobile landing gradient).
 */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', style }) => {
  const { i18n } = useTranslation()
  const { user, updateProfile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = (i18n.language || 'de').split('-')[0]
  const activeLabel = LANGS.find(([lng]) => lng === active)?.[1] ?? 'DE'

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const change = (lng: string) => {
    void i18n.changeLanguage(lng)
    if (user) updateProfile({ language_preference: lng }).catch(() => {})
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} style={style}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sprache wählen"
        className="flex items-center gap-1 text-sm font-bold focus:outline-none"
        style={{ color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.03em' }}
      >
        {activeLabel}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transition: 'transform 0.15s ease-out', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-[64px] rounded-xl bg-white py-1 shadow-lg"
        >
          {LANGS.filter(([lng]) => lng !== active).map(([lng, label]) => (
            <button
              key={lng}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => change(lng)}
              className="block w-full px-4 py-2 text-left text-sm font-semibold transition-colors hover:bg-[#eef3ff]"
              style={{ color: '#4785ff', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
