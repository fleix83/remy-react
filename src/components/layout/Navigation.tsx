import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions } from '../../hooks/usePermissions'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useMessagesStore } from '../../stores/messages.store'
import MessagesButton from '../messaging/MessagesButton'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from './MobileSlideMenu'

interface NavigationProps {
  onCreatePost: () => void
  showCreatePostButton?: boolean
  headerBg?: string
}

const Navigation: React.FC<NavigationProps> = ({
  onCreatePost,
  showCreatePostButton = true,
  headerBg
}) => {
  const { user, userProfile, logout } = useAuthStore()
  const permissions = usePermissions()
  const { unreadCount: notificationCount, loadNotifications } = useNotificationsStore()
  const { unreadCount: messageCount } = useMessagesStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Total unread count (notifications + messages)
  const totalUnreadCount = notificationCount + messageCount

  // Load notifications when user is available
  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user, loadNotifications])

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <nav className="relative" style={headerBg ? { backgroundColor: headerBg } : undefined}>
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Main Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🏠 Forum
              </Link>
              
              <Link 
                to="/therapists" 
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                👩‍⚕️ Therapeuten
              </Link>
              
              {user && (
                <MessagesButton 
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  showLabel={true}
                />
              )}
              
              {/* Admin & Moderation Links - Only for moderators and admins */}
              {permissions.canModerate && (
                <>
                  <Link 
                    to="/admin/moderation" 
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    🛡️ Moderation
                  </Link>
                  {permissions.isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      ⚙️ Admin
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Create Post Button */}
            {showCreatePostButton && (
              <button
                onClick={onCreatePost}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-md flex items-center space-x-2"
                style={{ 
                  backgroundColor: '#0284c7',
                  boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Beitrag erstellen</span>
              </button>
            )}

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-3">
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {userProfile && (
                    <UserAvatar 
                      user={userProfile} 
                      size="small" 
                    />
                  )}
                  <span className="hidden lg:inline">Profil</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Abmelden
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Anmelden
                </Link>
                <Link 
                  to="/register" 
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Registrieren
                </Link>
              </div>
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
                
                {/* Notification Badge */}
                {totalUnreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-400 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[1.25rem]" style={{fontSize: '0.65rem'}}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </div>
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