import React, { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMessagesStore } from '../../stores/messages.store'
import { useAuthStore } from '../../stores/auth.store'
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
  const { user } = useAuthStore()
  const { unreadCount: messageCount, loadConversations, setCurrentConversation } = useMessagesStore()
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([])

  // Load recent conversations when menu opens
  useEffect(() => {
    if (isOpen) {
      loadConversations().then(() => {
        const convs = useMessagesStore.getState().conversations
        // Only show conversations where the last message is incoming
        const incoming = convs.filter(c =>
          c.lastMessage && c.lastMessage.sender_id !== user?.id
        )
        const sorted = [...incoming].sort((a, b) =>
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
      {/* Backdrop: warm overlay on mobile, invisible click-catcher on desktop */}
      <div
        className="absolute inset-0 cursor-pointer transition-opacity duration-300 ease-in-out bg-[#ffe9e9f5] md:bg-transparent"
        onClick={handleBackdropClick}
      />
      
      {/* Slide-in menu - full on mobile, 30% on desktop */}
      <div
        className={`slide-menu-panel absolute right-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: '#f7f7f7'
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
          {/* Language selector - mobile only */}
          <div className="flex md:hidden items-center justify-center space-x-4 mb-6">
            {['DE', 'FR', 'IT'].map((lang) => (
              <button
                key={lang}
                className="text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--primary)' }}
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
                        backgroundColor: '#ffffff'
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
                    color: 'var(--primary)'
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
                    color: 'var(--primary)'
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
                    color: 'var(--primary)'
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
                    color: 'var(--primary)'
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
                    color: 'var(--primary)'
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
                      color: 'var(--primary)'
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
                      color: 'var(--primary)'
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
                    color: 'var(--primary)'
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