import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { usePermissions } from '../../hooks/usePermissions'
import { DocumentsService } from '../../services/documents.service'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from '../layout/MobileSlideMenu'
import GuidelineSection from '../ui/GuidelineSection'
import type { Document, DocumentSection } from '../../types/database.types'

const CommunityGuidelinesPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, userProfile, logout } = useAuthStore()
  const { isAdmin } = usePermissions()
  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedDocument, setEditedDocument] = useState<Document | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  const handleEditClick = () => {
    if (document) {
      setEditedDocument(JSON.parse(JSON.stringify(document)))
      setIsEditMode(true)
    }
  }

  const handleSectionChange = (index: number, updatedSection: DocumentSection) => {
    if (editedDocument) {
      const updatedSections = [...editedDocument.sections]
      updatedSections[index] = updatedSection
      setEditedDocument({
        ...editedDocument,
        sections: updatedSections
      })
    }
  }

  const handleSave = async () => {
    if (!editedDocument || !document) return

    setIsSaving(true)
    try {
      const result = await documentsService.updateDocument(document.id, {
        title: editedDocument.title,
        lead_text: editedDocument.lead_text,
        sections: editedDocument.sections
      })

      if (result) {
        setDocument(result)
        setIsEditMode(false)
        alert('Community Guidelines updated successfully!')
      } else {
        alert('Failed to save changes. Please try again.')
      }
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Error saving changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setEditedDocument(null)
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
        {/* Edit Mode Controls */}
        {isEditMode && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-400 text-white rounded font-semibold hover:bg-gray-500 disabled:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Edit Link (Admin Only) */}
        {isAdmin && !isEditMode && (
          <button
            onClick={handleEditClick}
            className="mb-4 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            ✏️ Edit
          </button>
        )}

        {/* Title */}
        {isEditMode && editedDocument ? (
          <input
            type="text"
            value={editedDocument.title}
            onChange={(e) => setEditedDocument({ ...editedDocument, title: e.target.value })}
            className="w-full text-2xl font-bold mb-4 px-3 py-2 border border-gray-300 rounded"
            style={{ color: 'var(--primary)' }}
          />
        ) : (
          <h1 className="text-2xl font-bold mb-4 text-left" style={{ color: 'var(--primary)' }}>
            {document?.title}
          </h1>
        )}

        {/* Lead text */}
        {editedDocument && editedDocument.lead_text ? (
          isEditMode ? (
            <textarea
              value={editedDocument.lead_text}
              onChange={(e) => setEditedDocument({ ...editedDocument, lead_text: e.target.value })}
              className="w-full text-gray-700 leading-relaxed mb-8 text-base px-3 py-2 border border-gray-300 rounded"
              rows={3}
              placeholder="Lead text"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed mb-8 text-base text-left">
              {editedDocument.lead_text}
            </p>
          )
        ) : null}

        {/* Sections as accordions */}
        <div className="space-y-4">
          {(editedDocument || document)?.sections.map((section, index) => (
            <GuidelineSection
              key={index}
              section={section}
              isEditMode={isEditMode}
              onSectionChange={(updated) => handleSectionChange(index, updated)}
            />
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
