import React, { useEffect, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMessagesStore } from '../../stores/messages.store'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useAuthStore } from '../../stores/auth.store'
import { format } from 'date-fns'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { dateFnsLocale } from '../../utils/dateFormat'

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
  const lang = useActiveLanguage()
  const { unreadCount: messageCount, conversations, loadConversations, setCurrentConversation } = useMessagesStore()
  const { notifications, unreadCount: notifCount, loadNotifications, markPostNotificationsAsRead, markAsRead } = useNotificationsStore()
  const { user, updateProfile } = useAuthStore()
  const [langOpen, setLangOpen] = useState(false)

  const activeLang = (i18n.language || 'de').split('-')[0]
  const currentLangLabel = LANGUAGES.find(l => l.code === activeLang)?.label ?? 'Deutsch'

  // Red dot on the Messages item: unread direct messages OR unread notifications.
  const hasUnread = messageCount > 0 || notifCount > 0

  // Refresh unread messages + notifications whenever the menu opens; collapse
  // the language dropdown whenever it closes (the component stays mounted).
  useEffect(() => {
    if (isOpen) {
      loadConversations()
      loadNotifications()
    } else {
      setLangOpen(false)
    }
  }, [isOpen, loadConversations, loadNotifications])

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

  // Top-of-menu feed: unread direct messages + unread "comment on your post"
  // notifications, merged into one time-sorted list capped at 3. Shown on the
  // desktop menu only (hidden on mobile).
  const menuMessages = useMemo(() => {
    const dmItems = conversations
      .filter(c => c.unreadCount > 0 && c.lastMessage)
      .map(c => ({
        key: `dm-${c.id}`,
        name: c.participant.username,
        date: c.lastMessage?.created_at || c.lastActivity,
        preview: c.lastMessage?.content?.replace(/<[^>]*>/g, '').slice(0, 50) || '…',
        onClick: () => {
          setCurrentConversation(c)
          handleNavigation('/messages')
        },
      }))

    const commentItems = notifications
      .filter(n => n.type === 'post_comment' && !n.is_read && n.related_post_id)
      .map(n => ({
        key: `comment-${n.id}`,
        name: n.title || 'Neue Antwort',
        date: n.created_at || '',
        preview: (n.message || '').replace(/<[^>]*>/g, '').slice(0, 60) || '…',
        onClick: () => {
          markPostNotificationsAsRead(n.related_post_id!)
          handleNavigation(`/post/${n.related_post_id}`)
        },
      }))

    // System notifications (e.g. "your post was not published" from the
    // LLM moderation) — clicking opens the own profile, where the rejected
    // item shows the full explanation.
    const systemItems = notifications
      .filter(n => n.type === 'system' && !n.is_read)
      .map(n => ({
        key: `system-${n.id}`,
        name: n.title || '',
        date: n.created_at || '',
        preview: (n.message || '').replace(/<[^>]*>/g, '').slice(0, 60) || '…',
        onClick: () => {
          markAsRead(n.id)
          if (user) handleNavigation(`/user/${user.id}`)
        },
      }))

    return [...dmItems, ...commentItems, ...systemItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  }, [conversations, notifications, setCurrentConversation, markPostNotificationsAsRead, markAsRead, user, handleNavigation])

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
            <div className="m-auto text-left py-6">
              {/* Unread messages + post-comment notifications (max 3), newest
                  first. Desktop menu only — hidden on mobile. */}
              {menuMessages.length > 0 && (
                <div className="hidden md:block mb-4">
                  <div className="space-y-1">
                    {menuMessages.map(item => (
                      <button
                        key={item.key}
                        onClick={item.onClick}
                        className="block text-left hover:opacity-80 transition-opacity"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          width: 'fit-content',
                          backgroundColor: '#fffae6'
                        }}
                      >
                        <div className="text-sm text-gray-700 flex items-center">
                          <span
                            className="mr-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: '#ff6b35' }}
                          />
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span className="text-gray-400" style={{ fontSize: '0.75rem' }}>
                            {item.date
                              ? format(new Date(item.date), 'dd. MMM', { locale: dateFnsLocale(lang) })
                              : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 truncate" style={{ maxWidth: '220px' }}>
                          {item.preview}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ul className="space-y-1 text-left">
                {/* Language selector — first item; tap to reveal the others.
                    Mobile only: on desktop the language switcher lives in the
                    top bar, so it's hidden here (md:hidden). */}
                <li className="md:hidden">
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
                    {hasUnread && (
                      <span
                        className="ml-3 inline-block flex-shrink-0 rounded-full"
                        style={{ backgroundColor: '#ff6467', width: '12px', height: '12px' }}
                        aria-label="ungelesen"
                      />
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
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default MobileSlideMenu
