import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfinitePosts, useCategories, useCreatePost, useSearchPosts } from '../../hooks/usePosts'
import { useAuthStore } from '../../stores/auth.store'
import { useMessagesStore } from '../../stores/messages.store'
import PostCard from './PostCard'
import PostEditor from './PostEditor'
import FilterModal from './FilterModal'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'

interface ForumViewProps {
  showCreatePostDialog?: boolean
  onCreatePostDialogClose?: () => void
  onCreatePost?: () => void
}

interface PostFilters {
  category?: number
  cantons?: string[]
  therapist?: string
  designation?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

const REMY_USER_ID = 'b286390f-652b-4c14-84d1-c1b6fce159d9'

const ForumView: React.FC<ForumViewProps> = React.memo(({
  showCreatePostDialog = false,
  onCreatePostDialogClose = () => {},
  onCreatePost = () => {}
}) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { findOrCreateConversation, setCurrentConversation } = useMessagesStore()
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFiltersState] = useState<PostFilters>({})

  // React Query hooks - use searchTerm when it exists, otherwise use filters
  const isSearchMode = Boolean(searchTerm.trim())
  
  const { 
    data: postsData, 
    isLoading: postsLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfinitePosts(isSearchMode ? {} : filters) // Don't apply filters when searching
  
  const { data: searchResults = [], isLoading: searchLoading } = useSearchPosts(searchTerm)
  const { data: categories = [] } = useCategories()
  const createPostMutation = useCreatePost()

  // Flatten infinite query pages
  const posts = useMemo(() => 
    postsData?.pages.flatMap(page => page) || [], 
    [postsData]
  )

  // Determine which posts to show and loading state
  const displayPosts = isSearchMode ? searchResults : posts
  const loading = isSearchMode ? searchLoading : postsLoading

  const handleSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchTerm('')
      return
    }
    // Clear filters when searching
    setFiltersState({})
    setSearchTerm(term.trim())
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value) // Update input immediately
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      handleSearch(value)
    }, 300)
    
    setSearchTimeout(newTimeout)
  }, [searchTimeout, handleSearch])

  const handleCreatePost = useCallback(async (postData: any) => {
    try {
      console.log('🚀 ForumView: Attempting to create post with data:', postData)
      await createPostMutation.mutateAsync(postData)
      console.log('✅ ForumView: Post created successfully')
      onCreatePostDialogClose() // Close dialog using prop
    } catch (error) {
      console.error('❌ ForumView: Error creating post:', error)
      alert('Fehler beim Erstellen des Beitrags: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'))
      throw error
    }
  }, [createPostMutation, onCreatePostDialogClose])

  const handleCategoryFilter = useCallback((categoryId: number | null) => {
    // Clear search when applying filters, preserve canton selections
    setSearchInput('')
    setSearchTerm('')
    setFiltersState(prev => ({ category: categoryId || undefined, cantons: prev.cantons }))
  }, [])

  const handleCantonToggle = useCallback((cantonCode: string) => {
    setSearchInput('')
    setSearchTerm('')
    setFiltersState(prev => {
      const current = prev.cantons || []
      const updated = current.includes(cantonCode)
        ? current.filter(c => c !== cantonCode)
        : [...current, cantonCode]
      return { ...prev, cantons: updated.length > 0 ? updated : undefined }
    })
  }, [])

  const getActiveFilterCount = useMemo(() => {
    let count = 0
    if (filters.category) count++
    if (filters.cantons && filters.cantons.length > 0) count++
    if (filters.therapist) count++
    if (filters.designation) count++
    if (filters.dateFrom || filters.dateTo) count++
    return count
  }, [filters])

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 && // Load more when 1000px from bottom
        hasNextPage && 
        !isFetchingNextPage &&
        !loading
      ) {
        fetchNextPage()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, loading, fetchNextPage])


  return (
    <div className="min-h-screen">
      <div className="max-w-6xl forum-list-column mx-auto pt-0 pb-6 px-0 md:px-4">
        {/* New Navbar */}
        <div className="forum-navbar p-4 mb-4 mx-4 md:mx-0 relative" style={{borderRadius: '20px', backgroundColor: '#d1f2d794', zIndex: 40}}>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="forum-search relative flex-1">
              <input
                type="text"
                placeholder="Suche..."
                value={searchInput}
                onChange={handleSearchChange}
                className="w-full pl-4 pr-10 py-2 bg-[var(--bg-body)] text-gray-400 placeholder-[oklch(0.32_0_0)] focus:outline-none focus:ring-2 focus:ring-[#d9f7de] text-lg"
                style={{borderRadius: '20px'}}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#2ebe7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter Button — icon only on desktop */}
            <button
              onClick={() => setShowFilterModal(true)}
              className="forum-filter-btn bg-white hover:bg-gray-50 transition-colors relative flex items-center justify-center"
              style={{borderRadius: '20px', color: 'var(--color-gray-400)', padding: '8px 12px'}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="md:hidden ml-2 text-sm font-medium">Filter</span>
              {getActiveFilterCount > 0 && (
                <span className="bg-[var(--primary)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center absolute -top-1 -right-1">
                  {getActiveFilterCount}
                </span>
              )}
            </button>

            {/* Neu Button */}
            <button
              onClick={onCreatePost}
              className="forum-neu-btn bg-[var(--primary)] hover:bg-[var(--primary)] text-white px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2"
              style={{borderRadius: '20px'}}
            >
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Neu
            </button>
          </div>
        </div>

        {/* Filter Modal */}
        <FilterModal 
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFiltersChange={setFiltersState}
        />

        {/* Category Filter - inline horizontal below navbar */}
        <div className="flex items-center flex-wrap gap-1.5 px-4 md:px-0 mb-2">
          <button
            onClick={() => handleCategoryFilter(null)}
            className={`inline-flex items-center px-2 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
              !filters.category
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
            }`}
            style={{fontSize: '0.6rem'}}
          >
            Alle
          </button>
          {categories.map((category) => {
            const categoryBgs: Record<number, string> = {
              1: 'var(--bg-erfahrung)',
              2: 'var(--bg-suche)',
              3: 'var(--bg-austausch)',
              4: 'var(--bg-rant)',
              5: 'var(--bg-ressourcen)',
            }
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`inline-flex items-center px-2 py-0.5 rounded font-medium whitespace-nowrap transition-colors ${
                  filters.category === category.id
                    ? 'text-gray-700'
                    : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
                }`}
                style={{
                  fontSize: '0.6rem',
                  backgroundColor: filters.category === category.id ? categoryBgs[category.id] : undefined
                }}
              >
                {category.name_de}
              </button>
            )
          })}
        </div>

        {/* Canton Filter - inline horizontal with flags, wrapping */}
        <div className="flex items-center flex-wrap gap-1 px-4 md:px-0 mb-8">
          {filters.cantons && filters.cantons.length > 0 && (
            <button
              onClick={() => setFiltersState(prev => ({ ...prev, cantons: undefined }))}
              className="text-[var(--primary)] hover:opacity-80 mr-1"
              style={{ fontSize: '0.55rem' }}
            >
              ✕
            </button>
          )}
          {SWISS_CANTONS.filter(c => c.code !== '').map(canton => (
            <button
              key={canton.code}
              onClick={() => handleCantonToggle(canton.code)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filters.cantons?.includes(canton.code)
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-gray-500 hover:bg-[var(--bg-element-hover)]'
              }`}
              style={{ fontSize: '0.55rem', border: 'none', cursor: 'pointer', background: filters.cantons?.includes(canton.code) ? undefined : 'transparent' }}
              title={canton.name}
            >
              <img
                src={`/kantone/${canton.code.toLowerCase()}.png`}
                alt={canton.name}
                className="w-3 h-3 object-contain"
              />
              {canton.code}
            </button>
          ))}
        </div>

      {/* Post Editor Dialog */}
      {showCreatePostDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 z-40">
          <div className="w-screen h-screen md:rounded-lg md:max-w-4xl md:w-full md:max-h-[90vh] md:h-auto overflow-y-auto" style={{backgroundColor: '#ecffef'}}>
            <div className="px-4 md:px-6 pb-0" style={{paddingTop: '35px'}}>
              <button
                onClick={onCreatePostDialogClose}
                className="absolute text-gray-500 hover:text-gray-700 transition-colors p-1"
                style={{ top: '35px', right: '25px' }}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="mb-10"></div>
              <h2 className="font-headline font-bold text-left" style={{ color: '#4785ff', fontSize: '20px' }}>
                Neuen Beitrag erstellen
              </h2>
            </div>
            <div className="px-4 md:px-6 pb-20 md:pb-6">
              <PostEditor
                onSubmit={handleCreatePost}
                onCancel={onCreatePostDialogClose}
                mobileOptimized={true}
              />
            </div>
          </div>
        </div>
      )}

        {/* Posts area */}
        <div className="forum-posts-area relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2ebe7a]"></div>
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">Keine Beiträge gefunden</h3>
              <p className="text-gray-700 mt-1">
                {filters.category
                  ? 'In dieser Kategorie wurden noch keine Beiträge erstellt.'
                  : 'Es wurden noch keine Beiträge erstellt.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-4 md:px-0">
              {displayPosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  className={index === 0 ? 'mt-32' : ''}
                />
              ))}
            </div>
          )}

          {/* Load More Button / Infinite Scroll Loading */}
          {displayPosts.length > 0 && !isSearchMode && (
            <div className="text-center mt-8">
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2ebe7a]"></div>
                  <span className="ml-2 text-gray-600">Lade weitere Beiträge...</span>
                </div>
              ) : hasNextPage ? (
                <button 
                  onClick={() => fetchNextPage()}
                  className="bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] text-white px-6 py-3 rounded-md font-medium transition-colors"
                >
                  Weitere Beiträge laden
                </button>
              ) : (
                <p className="text-gray-500 text-sm">Keine weiteren Beiträge verfügbar</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ForumView.displayName = 'ForumView'

export default ForumView