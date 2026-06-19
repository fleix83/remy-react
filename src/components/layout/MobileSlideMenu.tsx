import React, { useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMessagesStore } from '../../stores/messages.store'
import { useNotificationsStore } from '../../stores/notifications.store'
import { format } from 'date-fns'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { dateFnsLocale } from '../../utils/dateFormat'

interface MobileSlideMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole?: 'user' | 'moderator' | 'admin'
  onLogout: () => void
}

const MobileSlideMenu: React.FC<MobileSlideMenuProps> = ({
  isOpen,
  onClose,
  userRole = 'user',
  onLogout
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const lang = useActiveLanguage()
  const { unreadCount: messageCount, conversations, loadConversations, setCurrentConversation } = useMessagesStore()
  const { notifications, loadNotifications, markPostNotificationsAsRead } = useNotificationsStore()

  // Refresh unread messages + notifications whenever the menu opens
  useEffect(() => {
    if (isOpen) {
      loadConversations()
      loadNotifications()
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

  // Top-of-menu feed: unread direct messages + unread "comment on your post"
  // notifications, merged into one time-sorted list capped at 3. Items vanish
  // once read (the conversation/notification is marked read on click and on
  // viewing the target), so only genuinely-unread items ever appear here.
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

    return [...dmItems, ...commentItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  }, [conversations, notifications, setCurrentConversation, markPostNotificationsAsRead, handleNavigation])

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
        <div className="absolute top-8 right-8">
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

        {/* Menu content */}
        <div className="flex flex-col h-full pt-16">
          <nav className="flex-1 flex items-center justify-center">
            <div className="text-left">
            {/* Unread messages + post-comment notifications, newest first (max 3) */}
            {menuMessages.length > 0 && (
              <div className="mb-4">
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

            <ul className="space-y-3 text-left">
              {/* Forum */}
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  {t('nav.forum')}
                </button>
              </li>

              {/* Therapeuten */}
              <li>
                <button
                  onClick={() => handleNavigation('/therapists')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  {t('nav.therapists')}
                </button>
              </li>

              {/* Profil */}
              <li>
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  {t('nav.profile')}
                </button>
              </li>

              {/* Messages */}
              <li>
                <button
                  onClick={() => handleNavigation('/messages')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80 flex items-center"
                  style={{
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
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
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  {t('nav.guidelines')}
                </button>
              </li>

              {/* Moderation - Only for moderators and admin */}
              {(userRole === 'moderator' || userRole === 'admin') && (
                <li>
                  <button
                    onClick={() => handleNavigation('/admin/moderation')}
                    className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                    style={{
                      fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                      fontSize: '38px',
                      color: '#4785ff'
                    }}
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
                    className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                    style={{ 
                      fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                      fontSize: '38px',
                      color: '#4785ff'
                    }}
                  >
                    {t('nav.admin')}
                  </button>
                </li>
              )}

              {/* Abmelden */}
              <li>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
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