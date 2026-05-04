import React, { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessagesStore } from '../../stores/messages.store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Conversation } from '../../services/messages.service'

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
  const { unreadCount: messageCount, loadConversations, setCurrentConversation } = useMessagesStore()
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([])

  // Load recent conversations when menu opens
  useEffect(() => {
    if (isOpen) {
      loadConversations().then(() => {
        const convs = useMessagesStore.getState().conversations
        const sorted = [...convs].sort((a, b) =>
          new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        )
        setRecentConversations(sorted.slice(0, 5))
      })
    }
  }, [isOpen, loadConversations])

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
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop with custom green overlay */}
      <div 
        className="absolute inset-0 cursor-pointer transition-opacity duration-300 ease-in-out"
        style={{ backgroundColor: '#aed0b4f5' }}
        onClick={handleBackdropClick}
      />
      
      {/* Slide-in menu - full on mobile, 30% on desktop */}
      <div
        className={`slide-menu-panel absolute right-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
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
          {/* Language selector - mobile only */}
          <div className="flex md:hidden items-center justify-center space-x-4 mb-6">
            {['DE', 'FR', 'IT'].map((lang) => (
              <button
                key={lang}
                className="text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: '#4785ff' }}
              >
                {lang}
              </button>
            ))}
          </div>

          <nav className="flex-1 flex items-center justify-center">
            <div className="text-left">
            {/* Recent messages - desktop only */}
            {recentConversations.length > 0 && (
              <div className="hidden md:block mb-4">
                <div className="space-y-1">
                  {recentConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setCurrentConversation(conv)
                        handleNavigation('/messages')
                      }}
                      className="block text-left hover:opacity-80 transition-opacity"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        width: 'fit-content',
                        backgroundColor: conv.unreadCount > 0 ? '#ffffffb3' : 'transparent'
                      }}
                    >
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{conv.participant.username}</span>
                        <span className="text-gray-400 mx-1">·</span>
                        <span className="text-gray-400" style={{ fontSize: '0.75rem' }}>
                          {conv.lastMessage?.created_at
                            ? format(new Date(conv.lastMessage.created_at), 'dd. MMM', { locale: de })
                            : ''}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate" style={{ maxWidth: '220px' }}>
                        {conv.lastMessage?.content?.replace(/<[^>]*>/g, '').slice(0, 50) || '...'}
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
                  className="block w-full text-left font-bold uppercase transition-colors hover:opacity-80 focus:outline-none focus:opacity-80 flex items-center"
                  style={{
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  MESSAGES
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
                    fontFamily: 'Gaegu, cursive',
                    fontSize: '38px',
                    color: '#4785ff'
                  }}
                >
                  GUIDELINES
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
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default MobileSlideMenu