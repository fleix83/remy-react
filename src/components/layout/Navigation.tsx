import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'

interface NavigationProps {
  onCreatePost: () => void
  showCreatePostButton?: boolean
}

const Navigation: React.FC<NavigationProps> = ({ 
  onCreatePost, 
  showCreatePostButton = true 
}) => {
  const { user, logout } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <nav className="bg-[#1a3442] md:bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div>
                <h1 className="text-2xl font-headline font-bold text-[#37a653] md:text-primary-600">
                  Remy Forum
                </h1>
                <p className="text-xs text-gray-300 md:text-gray-500 -mt-1">
                  Psychotherapie Community
                </p>
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
              
              <Link 
                to="/messages" 
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                💬 Nachrichten
              </Link>
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
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">
                      {user.email?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
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

          {/* Mobile menu button */}
          <div className="md:hidden">
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
              
              <Link 
                to="/messages" 
                className="text-gray-300 hover:text-[#37a653] px-4 py-3 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                💬 Nachrichten
              </Link>

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
                    <div className="w-8 h-8 bg-[#37a653] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-semibold">
                        {user.email?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
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