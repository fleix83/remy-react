import React, { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMessagesStore } from '../../stores/messages.store'
import { useAuthStore } from '../../stores/auth.store'

interface MobileSlideMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole?: 'user' | 'moderator' | 'admin'
  onLogout: () => void
}

// Shared big-menu-item look (Gaegu, blue). Reused by every entry + the
// language selector so they stay visually identical.
const MENU_ITEM_CLASS =
  'block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80'
const menuItemStyle: React.CSSProperties = {
  fontFamily: 'Gaegu, "Gaegu Accents", cursive',
  fontSize: '38px',
  color: '#4785ff',
}

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
] as const

const MobileSlideMenu: React.FC<MobileSlideMenuProps> = ({
  isOpen,
  onClose,
  userRole = 'user',
  onLogout
}) => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { unreadCount: messageCount, loadConversations } = useMessagesStore()
  const { user, updateProfile } = useAuthStore()
  const [langOpen, setLangOpen] = useState(false)

  const activeLang = (i18n.language || 'de').split('-')[0]
  const currentLangLabel = LANGUAGES.find(l => l.code === activeLang)?.label ?? 'Deutsch'

  // Refresh the unread-messages count whenever the menu opens; collapse the
  // language dropdown whenever it closes (the component stays mounted).
  useEffect(() => {
    if (isOpen) loadConversations()
    else setLangOpen(false)
  }, [isOpen, loadConversations])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle navigation and close menu
  const handleNavigation = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  // Handle logout
  const handleLogout = useCallback(() => {
    onLogout()
    onClose()
  }, [onLogout, onClose])

  // Flip i18next instantly and, for logged-in users, persist to their profile
  // so the choice follows them across devices (mirrors LanguageSwitcher).
  const changeLanguage = useCallback((lng: string) => {
    void i18n.changeLanguage(lng)
    if (user) updateProfile({ language_preference: lng }).catch(() => {})
    setLangOpen(false)
  }, [i18n, user, updateProfile])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Slide-in menu - full on mobile, 30% on desktop. No backdrop. */}
      <div
        className={`slide-menu-panel pointer-events-auto absolute right-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: '#e2ecff'
        }}
      >
        {/* Close button */}
        <div className="absolute top-8 right-8 z-10">
          <button
            onClick={onClose}
            className="p-2 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--primary)' }}
            aria-label="Close menu"
          >
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu content — scrollable (scrollbar hidden), centred when it fits
            and scrollable from the top when it overflows (m-auto, not
            justify-center, so the first item is never clipped). */}
        <div className="flex flex-col h-full pt-16">
          <nav className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
            <ul className="m-auto space-y-1 text-left py-6">
              {/* Language selector — first item; tap to reveal the others */}
              <li>
                <button
                  onClick={() => setLangOpen(o => !o)}
                  className={`${MENU_ITEM_CLASS} flex items-center gap-2`}
                  style={menuItemStyle}
                  aria-expanded={langOpen}
                  aria-haspopup="listbox"
                >
                  {currentLangLabel}
                  <svg
                    className="w-6 h-6 transition-transform duration-200"
                    style={{ transform: langOpen ? 'rotate(180deg)' : 'none' }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langOpen && (
                  <ul className="mt-1 mb-1 space-y-1" role="listbox" aria-label="Sprache">
                    {LANGUAGES.filter(l => l.code !== activeLang).map(l => (
                      <li key={l.code}>
                        <button
                          onClick={() => changeLanguage(l.code)}
                          className={MENU_ITEM_CLASS}
                          style={{ ...menuItemStyle, fontSize: '26px', opacity: 0.7 }}
                          role="option"
                          aria-selected={false}
                        >
                          {l.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>

              {/* Forum */}
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className={MENU_ITEM_CLASS}
                  style={menuItemStyle}
                >
                  {t('nav.forum')}
                </button>
              </li>

              {/* Therapeuten */}
              <li>
                <button
                  onClick={() => handleNavigation('/therapists')}
                  className={MENU_ITEM_CLASS}
                  style={menuItemStyle}
                >
                  {t('nav.therapists')}
                </button>
              </li>

              {/* Profil */}
              <li>
                <button
                  onClick={() => handleNavigation('/profile')}
                  className={MENU_ITEM_CLASS}
                  style={menuItemStyle}
                >
                  {t('nav.profile')}
                </button>
              </li>

              {/* Messages */}
              <li>
                <button
                  onClick={() => handleNavigation('/messages')}
                  className={`${MENU_ITEM_CLASS} flex items-center`}
                  style={menuItemStyle}
                >
                  {t('nav.messages')}
                  {messageCount > 0 && (
                    <div
                      className="ml-3 flex items-center justify-center text-white font-bold rounded-full"
                      style={{
                        backgroundColor: '#ff6467',
                        width: '24px',
                        height: '24px',
                        fontSize: '14px'
                      }}
                    >
                      {messageCount > 9 ? '9+' : messageCount}
                    </div>
                  )}
                </button>
              </li>

              {/* Community Guidelines */}
              <li>
                <button
                  onClick={() => handleNavigation('/community-guidelines')}
                  className={MENU_ITEM_CLASS}
                  style={menuItemStyle}
                >
                  {t('nav.guidelines')}
                </button>
              </li>

              {/* Moderation - Only for moderators and admin */}
              {(userRole === 'moderator' || userRole === 'admin') && (
                <li>
                  <button
                    onClick={() => handleNavigation('/admin/moderation')}
                    className={MENU_ITEM_CLASS}
                    style={menuItemStyle}
                  >
                    {t('nav.moderation')}
                  </button>
                </li>
              )}

              {/* Admin - Only for admin users */}
              {userRole === 'admin' && (
                <li>
                  <button
                    onClick={() => handleNavigation('/admin')}
                    className={MENU_ITEM_CLASS}
                    style={menuItemStyle}
                  >
                    {t('nav.admin')}
                  </button>
                </li>
              )}

              {/* Abmelden */}
              <li>
                <button
                  onClick={handleLogout}
                  className={MENU_ITEM_CLASS}
                  style={menuItemStyle}
                >
                  {t('nav.logout')}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default MobileSlideMenu
