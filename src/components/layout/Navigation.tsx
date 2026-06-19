import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useMessagesStore } from '../../stores/messages.store'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from './MobileSlideMenu'
import LanguageMenu from '../ui/LanguageMenu'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'

interface NavigationProps {
  onCreatePost: () => void
  showCreatePostButton?: boolean
  headerBg?: string
}

const Navigation: React.FC<NavigationProps> = ({
  headerBg
}) => {
  const { user, userProfile, logout } = useAuthStore()
  const { t } = useTranslation()
  const { unreadCount: notificationCount, loadNotifications } = useNotificationsStore()
  const { unreadCount: messageCount, loadUnreadCount } = useMessagesStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Total unread count (notifications + messages)
  const totalUnreadCount = notificationCount + messageCount

  // User's default region (canton), localized — shown next to the username
  const defaultCanton = userProfile?.default_canton || null
  const regionLabel = defaultCanton
    ? (SWISS_CANTONS.find(c => c.code === defaultCanton) ? t(`common:cantons.${defaultCanton}`) : defaultCanton)
    : null

  // Load notifications and unread message count when user is available
  useEffect(() => {
    if (user) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [user, loadNotifications, loadUnreadCount])

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <nav className="relative" style={headerBg ? { backgroundColor: headerBg } : undefined}>
      {/* Lebenskurve line art layered over the gradient header (forum landing, desktop) */}
      <img
        src="/images/lebenskurve.svg"
        alt=""
        aria-hidden="true"
        className="forum-curve"
      />

      {/* Desktop avatar group — pinned to the screen's right edge (with a
          margin) and vertically aligned with the REMY logo. Lives outside the
          centered container so it can reach the viewport edge; z-20 keeps it
          above the curve, while the slide menu below stays above it. */}
      <div className="hidden md:flex items-center gap-2 absolute top-[20px] right-8 z-20">
        {user ? (
          <>
            {/* Avatar + username → slide menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 text-gray-700 hover:opacity-80 transition-opacity"
            >
              {userProfile && (
                <span className="relative inline-flex">
                  <UserAvatar user={userProfile} size="small" />
                  {totalUnreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 rounded-full w-3 h-3" style={{ backgroundColor: '#ff6b35' }} />
                  )}
                </span>
              )}
              <span className="rounded-full bg-white/60 px-3 py-1 text-sm font-medium">
                {userProfile?.username || t('menu')}
              </span>
            </button>

            {/* Default region (only when the user has one set) */}
            {regionLabel && (
              <span className="rounded-full bg-white/60 px-3 py-1 text-sm font-medium text-gray-700">
                {regionLabel}
              </span>
            )}

            {/* Current language — opens a dropdown to switch */}
            <LanguageMenu />
          </>
        ) : (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-700 hover:opacity-80 px-3 py-2 rounded-md text-sm font-medium transition-opacity"
          >
            {t('menu')}
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-4">
              <div 
                className="text-[var(--primary)]"
                style={{ 
                  fontFamily: 'Gaegu, "Gaegu Accents", cursive',
                  fontWeight: 700,
                  fontSize: '60px',
                  letterSpacing: '-2.1px'
                }}
              >
                REMY
              </div>
              <div className="text-gray-500 md:text-gray-500 leading-tight text-left uppercase self-center whitespace-pre-line" style={{fontSize: '10px', letterSpacing: '0.5px'}}>
                {t('brandClaim')}
              </div>
            </Link>
          </div>

          {/* Mobile menu button - User Avatar with Notification Badge */}
          <div className="md:hidden">
            {user ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative p-1 rounded-full transition-colors"
              >
                {/* User Avatar */}
                {userProfile && (
                  <UserAvatar
                    user={userProfile}
                    size="small"
                  />
                )}

                {/* Notification Dot */}
                {totalUnreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 rounded-full w-3 h-3" style={{ backgroundColor: '#ff6b35' }} />
                )}
              </button>
            ) : (
              // Fallback to hamburger menu for non-logged in users
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-[var(--primary)] hover:text-[var(--primary)] p-2 rounded-md transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide-in menu — top-level inside <nav> so it overlays the absolutely
          positioned avatar group (z-20) too */}
      <MobileSlideMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userRole={userProfile?.role || undefined}
        onLogout={handleSignOut}
      />
    </nav>
  )
}

export default Navigation