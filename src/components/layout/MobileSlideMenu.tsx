import React, { useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

  // Handle clicking outside the menu
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [onClose])

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

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[99999] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
    >
      {/* Backdrop with custom green overlay */}
      <div 
        className="absolute inset-0 cursor-pointer transition-opacity duration-300 ease-in-out"
        style={{ backgroundColor: '#aed0b4f5' }}
        onClick={handleBackdropClick}
      />
      
      {/* Slide-in menu - 2/3 of screen width */}
      <div 
        className={`absolute right-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: '100vw',
          backgroundColor: '#d1f2d7'
        }}
      >
        {/* Close button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-2 text-black hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu content */}
        <div className="flex flex-col h-full pt-16">
          <nav className="flex-1 flex items-center justify-center">
            <ul className="space-y-3 text-left">
              {/* Forum */}
              <li>
                <button
                  onClick={() => handleNavigation('/')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  FORUM
                </button>
              </li>

              {/* Therapeuten */}
              <li>
                <button
                  onClick={() => handleNavigation('/therapists')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  THERAPEUTEN
                </button>
              </li>

              {/* Profil */}
              <li>
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  PROFIL
                </button>
              </li>

              {/* Messages */}
              <li>
                <button
                  onClick={() => handleNavigation('/messages')}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  MESSAGES
                </button>
              </li>

              {/* Moderation - Only for moderators and admin */}
              {(userRole === 'moderator' || userRole === 'admin') && (
                <li>
                  <button
                    onClick={() => handleNavigation('/admin/moderation')}
                    className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                    style={{ 
                      fontFamily: 'Gaegu, cursive',
                      fontSize: '38px',
                      color: '#4785ff'
                    }}
                  >
                    MODERATION
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
                      fontFamily: 'Gaegu, cursive',
                      fontSize: '38px',
                      color: '#4785ff'
                    }}
                  >
                    ADMIN
                  </button>
                </li>
              )}

              {/* Abmelden */}
              <li>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80"
                  style={{ 
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  ABMELDEN
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