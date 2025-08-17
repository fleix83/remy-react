import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions } from '../../hooks/usePermissions'
import { useNotificationsStore } from '../../stores/notifications.store'
import { useMessagesStore } from '../../stores/messages.store'
import MessagesButton from '../messaging/MessagesButton'
import UserAvatar from '../user/UserAvatar'

interface NavigationProps {
  onCreatePost: () => void
  showCreatePostButton?: boolean
}

const Navigation: React.FC<NavigationProps> = ({ 
  onCreatePost, 
  showCreatePostButton = true 
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
    <nav className="bg-[#1a3442] md:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <h1 className="font-headline font-bold text-[#37a653] md:text-primary-600" style={{fontSize: '39px'}}>
                REMY
              </h1>
              <div className="text-white md:text-gray-500 leading-tight text-left uppercase" style={{fontSize: '8px'}}>
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
                className="text-[#37a653] hover:text-[#2e8844] p-2 rounded-md transition-colors"
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

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#2a4a57] py-4">
            <div className="flex flex-col space-y-2">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏠 Forum
              </Link>
              
              <Link 
                to="/therapists" 
                className="text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                👩‍⚕️ Therapeuten
              </Link>
              
              {user && (
                <div 
                  className="px-4 py-3"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessagesButton 
                    className="text-gray-300 hover:text-[#37a653] text-base font-medium transition-colors"
                    showLabel={true}
                  />
                </div>
              )}

              {/* Mobile Admin & Moderation Links - Only for moderators and admins */}
              {permissions.canModerate && (
                <>
                  <Link 
                    to="/admin/moderation" 
                    className="text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    🛡️ Moderation
                  </Link>
                  {permissions.isAdmin && (
                    <Link 
                      to="/admin" 
                      className="text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ⚙️ Admin
                    </Link>
                  )}
                </>
              )}

              {/* Mobile Create Post Button */}
              {showCreatePostButton && (
                <button
                  onClick={() => {
                    onCreatePost()
                    setIsMobileMenuOpen(false)
                  }}
                  className="mx-4 mt-2 bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Beitrag erstellen</span>
                </button>
              )}

              {/* Mobile User Menu */}
              {user ? (
                <div className="border-t border-[#2a4a57] mt-4 pt-4">
                  <div className="flex items-center px-4 py-2 text-sm text-gray-300">
                    {userProfile && (
                      <div className="mr-3">
                        <UserAvatar 
                          user={userProfile} 
                          size="small" 
                        />
                      </div>
                    )}
                    <span>{user.email}</span>
                  </div>
                  
                  <Link 
                    to="/profile" 
                    className="block text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    👤 Profil
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full text-left text-gray-300 hover:text-red-400 px-4 py-3 rounded-md text-base font-medium transition-colors"
                  >
                    🚪 Abmelden
                  </button>
                </div>
              ) : (
                <div className="border-t border-[#2a4a57] mt-4 pt-4 flex flex-col space-y-2 px-4">
                  <Link 
                    to="/login" 
                    className="text-center bg-[#2a4a57] hover:bg-[#37a653] text-gray-300 hover:text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Anmelden
                  </Link>
                  <Link 
                    to="/register" 
                    className="text-center bg-[#37a653] hover:bg-[#2e8844] text-white px-4 py-3 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Registrieren
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation