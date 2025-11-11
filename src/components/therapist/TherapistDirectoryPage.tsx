import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import TherapistSelector from './TherapistSelector'
import TherapistCreateModal from './TherapistCreateModal'
import type { Therapist, PostWithRelations } from '../../types/database.types'
import { PostsService } from '../../services/posts.service'
import { TherapistsService } from '../../services/therapists.service'
import { useAuthStore } from '../../stores/auth.store'
import UserAvatar from '../user/UserAvatar'
import MobileSlideMenu from '../layout/MobileSlideMenu'

const TherapistDirectoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
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

  const handleTherapistSelect = (therapist: Therapist | null) => {
    setSelectedTherapist(therapist)
  }

  const handleTherapistUpdated = (updatedTherapist: Therapist) => {
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
      {/* Header bar - no background */}
      <div
        className="w-full flex items-center justify-center relative"
        style={{
          height: '65px'
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

          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-1 rounded-full transition-colors mr-2.5"
            >
              {userProfile && (
                <UserAvatar
                  user={userProfile}
                  size="small"
                />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-blue-600 mb-2 text-left">
            Therapeuten
          </h1>
          <p className="text-gray-900 mb-8 text-left">
            Suche hier nach Therapeuten und Erfahrungen
          </p>

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

              {/* Therapist name with canton flag */}
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-[#37a653] text-left">
                  {therapistsService.formatTherapistName(selectedTherapist)}
                </h3>
                {selectedTherapist.canton && (
                  <img
                    src={`/remyreact/kantone/${selectedTherapist.canton.toLowerCase()}.png`}
                    alt={`${selectedTherapist.canton} flag`}
                    className="w-4 h-auto object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
              </div>

              <div className="space-y-2 text-left mb-6">
                {/* Designation without label */}
                <p className="text-gray-700">
                  {selectedTherapist.designation}
                </p>

                {/* Institution - without label */}
                {selectedTherapist.institution && (
                  <p className="text-gray-700">
                    {selectedTherapist.institution}
                  </p>
                )}

                {/* Description/Bio */}
                {selectedTherapist.description && (
                  <p className="text-gray-700 mt-4">
                    {selectedTherapist.description}
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