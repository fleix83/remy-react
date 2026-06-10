import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import TherapistSelector from './TherapistSelector'
import TherapistCreateModal from './TherapistCreateModal'
import type { TherapistWithDesignation, PostWithRelations } from '../../types/database.types'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { PostsService } from '../../services/posts.service'
import { TherapistsService } from '../../services/therapists.service'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from '../layout/MobileSlideMenu'

const TherapistDirectoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistWithDesignation | null>(null)
  const [therapistPosts, setTherapistPosts] = useState<PostWithRelations[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const postsService = new PostsService()
  const therapistsService = new TherapistsService()
  const { user, userProfile, logout } = useAuthStore()

  const isModeratorOrAdmin = userProfile?.role === 'moderator' || userProfile?.role === 'admin'

  // Load therapist from URL parameter
  useEffect(() => {
    const therapistId = searchParams.get('therapist')
    if (therapistId) {
      loadTherapistFromUrl(parseInt(therapistId))
    }
  }, [searchParams])

  useEffect(() => {
    if (selectedTherapist) {
      loadTherapistPosts()
    } else {
      setTherapistPosts([])
    }
  }, [selectedTherapist])

  const loadTherapistFromUrl = async (therapistId: number) => {
    try {
      const therapist = await therapistsService.getTherapist(therapistId)
      if (therapist) {
        setSelectedTherapist(therapist)
      }
    } catch (error) {
      console.error('Error loading therapist from URL:', error)
    }
  }

  const loadTherapistPosts = async () => {
    if (!selectedTherapist) return

    try {
      setIsLoadingPosts(true)
      const posts = await postsService.getPosts({
        therapist: selectedTherapist.id.toString()
      })
      setTherapistPosts(posts)
    } catch (error) {
      console.error('Error loading therapist posts:', error)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const handleTherapistSelect = (therapist: TherapistWithDesignation | null) => {
    setSelectedTherapist(therapist)
  }

  const handleTherapistUpdated = (updatedTherapist: TherapistWithDesignation) => {
    setSelectedTherapist(updatedTherapist)
    setShowEditModal(false)
  }

  const handleSignOut = async () => {
    await logout()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: '#eefaf0' }}>
      {/* Header bar - matching PostView */}
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

      <div className="max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '48px' }}>
        {/* Title */}
        <h1 className="text-2xl font-bold mb-4 text-left" style={{ color: 'var(--primary)' }}>
          Therapeut:innen
        </h1>

        {/* Lead text */}
        <p className="text-gray-700 leading-relaxed mb-8 text-base text-left">
          Finde hier alle Therapeut:innen und Institutionen und dazugehörige Erfahrungsberichte.
        </p>

        {/* White container for search and results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <TherapistSelector
            selectedTherapist={selectedTherapist}
            onTherapistSelect={handleTherapistSelect}
          />

          {selectedTherapist && (
            <div className="mt-8 pt-[30px] relative">
              {/* Edit button - top right corner (moderator/admin only) */}
              {isModeratorOrAdmin && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute right-0 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 text-sm"
                  style={{ top: '-10px' }}
                  title="Therapeut bearbeiten"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Bearbeiten</span>
                </button>
              )}

              {/* Review flag banner - visible only to moderators/admins */}
              {isModeratorOrAdmin && selectedTherapist.needs_review && (
                <div
                  className="mb-4 px-3 py-2 rounded text-sm font-medium text-left flex items-center gap-2"
                  style={{
                    backgroundColor: '#fff9de',
                    border: '1px solid #fff0b5',
                    color: '#856404'
                  }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  <span>Wird geprüft</span>
                </div>
              )}

              {/* Therapist name with canton flag */}
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#37a653] text-left">
                  {therapistsService.formatTherapistName(selectedTherapist)}
                </h3>
                {selectedTherapist.canton && (
                  <img
                    src={`/kantone/${selectedTherapist.canton.toLowerCase()}.png`}
                    alt={`${selectedTherapist.canton} flag`}
                    className="w-4 h-auto object-cover"
                    loading="lazy"
                    decoding="async"
                    width={16}
                    height={11}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>

              <div className="space-y-2 text-left mb-6">
                {/* Curated designation (UI language) + verbatim professional title */}
                {selectedTherapist.designations && (
                  <p className="text-gray-700 font-medium">
                    {getDesignationLabel(selectedTherapist.designations, userProfile?.language_preference)}
                  </p>
                )}
                {selectedTherapist.full_title && (
                  <p className="text-gray-600 text-sm">
                    {selectedTherapist.full_title}
                  </p>
                )}

                {/* Institution - without label */}
                {selectedTherapist.institution && (
                  <p className="text-gray-700">
                    {selectedTherapist.institution}
                  </p>
                )}

                {/* City */}
                {selectedTherapist.city && (
                  <p className="text-gray-700 mt-2">
                    <strong>Stadt:</strong> {selectedTherapist.city}
                  </p>
                )}

                {/* Languages */}
                {selectedTherapist.languages && (
                  <p className="text-gray-700 mt-2">
                    <strong>Sprachen:</strong> {selectedTherapist.languages}
                  </p>
                )}
              </div>

              {/* Posts Container */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 text-left">
                  Beiträge über {selectedTherapist.first_name} {selectedTherapist.last_name}
                </h4>

                {isLoadingPosts ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37a653]"></div>
                  </div>
                ) : therapistPosts.length > 0 ? (
                  <div className="space-y-4">
                    {therapistPosts.map((post) => {
                      // Access comment count safely - posts service adds it as { count: number }
                      const commentCount = (post.comments?.[0] as any)?.count || (post as any).comment_count || 0

                      return (
                        <Link
                          key={post.id}
                          to={`/post/${post.id}`}
                          className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-[#37a653] hover:text-[#2d8542] mb-2">
                                {post.title}
                              </h5>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>{post.users?.username || 'Anonym'}</span>
                                <span>•</span>
                                <span>{post.created_at ? formatDate(post.created_at) : 'Unbekannt'}</span>
                              </div>

                              {/* Tags */}
                              {post.content && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-lg"
                                    style={{
                                      fontSize: '0.65rem',
                                      color: 'grey',
                                      background: '#fbfffc'
                                    }}
                                  >
                                    Minimalismus
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Comment count with icon */}
                            <div className="relative flex items-center ml-4">
                              <div className="relative bg-white rounded-full p-1.5">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                              </div>
                              {commentCount > 0 && (
                                <div className="absolute -top-1 -right-1 bg-red-400 text-white font-bold rounded-full w-4 h-4 flex items-center justify-center min-w-[1rem]" style={{fontSize: '0.6rem'}}>
                                  {commentCount > 99 ? '99+' : commentCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-left py-4">
                    Noch keine Beiträge über diesen Therapeuten vorhanden.
                  </p>
                )}
              </div>
            </div>
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

      {/* Edit Therapist Modal */}
      <TherapistCreateModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onTherapistCreated={handleTherapistUpdated}
        therapist={selectedTherapist}
      />
    </div>
  )
}

export default TherapistDirectoryPage