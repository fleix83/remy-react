import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useMessagesStore } from '../../stores/messages.store'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from './MobileSlideMenu'

interface NavigationProps {
  onCreatePost: () => void
  showCreatePostButton?: boolean
  headerBg?: string
}

const Navigation: React.FC<NavigationProps> = ({
  headerBg
}) => {
  const { user, userProfile, logout } = useAuthStore()
  const { unreadCount: notificationCount, loadNotifications } = useNotificationsStore()
  const { unreadCount: messageCount, loadUnreadCount } = useMessagesStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Total unread count (notifications + messages)
  const totalUnreadCount = notificationCount + messageCount

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
    <nav className="main-nav relative" style={headerBg ? { backgroundColor: headerBg } : undefined}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-4">
              <div 
                className="text-[var(--primary)]"
                style={{ 
                  fontFamily: 'Gaegu, cursive',
                  fontWeight: 700,
                  fontSize: '60px',
                  letterSpacing: '-2.1px'
                }}
              >
                REMY
              </div>
              <div className="text-gray-500 md:text-gray-500 leading-tight text-left uppercase self-center" style={{fontSize: '10px', letterSpacing: '0.5px'}}>
                <div>FORUM FÜR</div>
                <div>MENSCHEN IN</div>
                <div>PSYCHOTHERAPIE</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation — avatar + username triggers slide menu */}
          <div className="hidden md:flex items-center">
            {user ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:opacity-80 transition-opacity relative"
              >
                {userProfile && (
                  <UserAvatar user={userProfile} size="small" />
                )}
                <span className="text-sm font-medium">{userProfile?.username || 'Menü'}</span>
                {totalUnreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-2 rounded-full w-3 h-3" style={{ backgroundColor: '#ff6b35' }} />
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700 hover:opacity-80 px-3 py-2 rounded-md text-sm font-medium transition-opacity"
              >
                Menü
              </button>
            )}
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

        {/* Mobile Slide-in Menu */}
        <MobileSlideMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          userRole={userProfile?.role || undefined}
          onLogout={handleSignOut}
        />
      </div>
    </nav>
  )
}

export default Navigation