import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'

// Languages shown by their own (endonym) name.
const LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
]

interface LanguageMenuProps {
  className?: string
}

/**
 * Pill-styled language picker: shows the current language and opens a dropdown
 * to switch. Flips i18next instantly and, for logged-in users, persists the
 * choice to their profile so it follows them across devices.
 */
const LanguageMenu: React.FC<LanguageMenuProps> = ({ className = '' }) => {
  const { i18n } = useTranslation()
  const { user, updateProfile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = (i18n.language || 'de').split('-')[0]
  const current = LANGUAGES.find(l => l.code === active) ?? LANGUAGES[0]

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code: string) => {
    void i18n.changeLanguage(code)
    if (user) updateProfile({ language_preference: code }).catch(() => {})
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-sm font-medium text-gray-700 hover:opacity-80 transition-opacity ${className}`}
      >
        {current.label}
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 min-w-[8rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {LANGUAGES.map(l => {
            const isActive = l.code === active
            return (
              <li key={l.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => choose(l.code)}
                  className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 ${
                    isActive ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {l.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LanguageMenu
