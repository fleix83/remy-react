import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { DocumentsService } from '../../services/documents.service'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import GuidelineSection from '../ui/GuidelineSection'
import type { Document } from '../../types/database.types'

const CommunityGuidelinesPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, userProfile, logout } = useAuthStore()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const documentsService = new DocumentsService()

  useEffect(() => {
    loadDocument()
  }, [])

  const loadDocument = async () => {
    try {
      setIsLoading(true)
      const doc = await documentsService.getDocumentBySlug('community-guidelines')
      setDocument(doc)
    } catch (error) {
      console.error('Error loading community guidelines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Community Guidelines nicht gefunden.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-[var(--primary)] hover:underline"
          >
            Zurück zum Forum
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: '#eefaf0' }}>
      {/* Header bar - matching profile page */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: '65px',
          background: 'linear-gradient(180deg, hsla(221, 100%, 95%, 1) 0%, hsla(130, 55%, 96%, 1) 100%, hsla(130, 55%, 96%, 1) 100%)'
        }}
      >
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 flex justify-between items-center">
          {/* Invisible spacer to balance the avatar and center the back button */}
          <div className="w-6 h-6"></div>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" style={{ stroke: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zum Forum
          </button>

          {user && userProfile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-1 rounded-full transition-colors mr-2.5"
            >
              <UserAvatar
                user={userProfile}
                size="small"
              />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '48px' }}>
        {/* Title */}
        <h1 className="text-2xl font-bold mb-4 text-left" style={{ color: 'var(--primary)' }}>
          {document.title}
        </h1>

        {/* Lead text */}
        {document.lead_text && (
          <p className="text-gray-700 leading-relaxed mb-8 text-base text-left">
            {document.lead_text}
          </p>
        )}

        {/* Sections as accordions */}
        <div className="space-y-4">
          {document.sections.map((section, index) => (
            <GuidelineSection key={index} section={section} />
          ))}
        </div>
      </div>

      {/* Mobile Slide-in Menu */}
      {user && userProfile && (
        <MobileSlideMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          userRole={userProfile?.role || undefined}
          onLogout={handleSignOut}
        />
      )}
    </div>
  )
}

export default CommunityGuidelinesPage
