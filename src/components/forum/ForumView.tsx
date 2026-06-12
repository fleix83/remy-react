import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { usePaginatedPosts, useCategories, useCreatePost, useSearchPosts } from '../../hooks/usePosts'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import 'react-day-picker/style.css'
import PostCard from './PostCard'
import PostEditor from './PostEditor'
import FilterModal from './FilterModal'
import Pagination from '../ui/Pagination'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'
import { DesignationsService } from '../../services/designations.service'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { useAuthStore } from '../../stores/auth.store'
import type { Designation } from '../../types/database.types'
import type { DateRange } from 'react-day-picker'

interface ForumViewProps {
  showCreatePostDialog?: boolean
  onCreatePostDialogClose?: () => void
  onCreatePost?: () => void
}

interface PostFilters {
  category?: number
  cantons?: string[]
  therapist?: string
  designations?: number[]
  gender?: 'm' | 'f' | 'both'
  dateFrom?: string
  dateTo?: string
  search?: string
}

const ForumView: React.FC<ForumViewProps> = React.memo(({
  showCreatePostDialog = false,
  onCreatePostDialogClose = () => {},
  onCreatePost = () => {}
}) => {
  const { userProfile } = useAuthStore()
  const lang = userProfile?.language_preference
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filters, setFiltersState] = useState<PostFilters>({})
  const [designations, setDesignations] = useState<Designation[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // React Query hooks - use searchTerm when it exists, otherwise use filters
  const isSearchMode = Boolean(searchTerm.trim())

  // Numbered pagination state; jump back to page 1 whenever filters change
  // (state-during-render pattern so the new filters never fetch a stale page)
  const [page, setPage] = useState(1)
  const [prevFilters, setPrevFilters] = useState(filters)
  if (filters !== prevFilters) {
    setPrevFilters(filters)
    setPage(1)
  }

  const {
    data: pageData,
    isLoading: postsLoading,
    isFetching: postsFetching,
    totalPages
  } = usePaginatedPosts(isSearchMode ? {} : filters, page) // Don't apply filters when searching

  const { data: searchResults = [], isLoading: searchLoading } = useSearchPosts(searchTerm)
  const { data: categories = [] } = useCategories()
  const createPostMutation = useCreatePost()

  const posts = useMemo(() => pageData?.posts || [], [pageData])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0 })
  }, [])

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

  // Load designations
  const designationsService = useMemo(() => new DesignationsService(), [])
  useEffect(() => {
    designationsService.getActiveDesignations().then(setDesignations).catch(console.error)
  }, [designationsService])

  // Close date picker on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dateRange: DateRange | undefined = useMemo(() => {
    if (!filters.dateFrom && !filters.dateTo) return undefined
    return {
      from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      to: filters.dateTo ? new Date(filters.dateTo) : undefined
    }
  }, [filters.dateFrom, filters.dateTo])

  const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
    setFiltersState(prev => ({
      ...prev,
      dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined
    }))
  }, [])

  const handleDesignationToggle = useCallback((id: number) => {
    setSearchInput('')
    setSearchTerm('')
    setFiltersState(prev => {
      const current = prev.designations || []
      const updated = current.includes(id) ? current.filter(d => d !== id) : [...current, id]
      return { ...prev, designations: updated.length > 0 ? updated : undefined }
    })
  }, [])

  // Each gender tab toggles independently: one, none, or both can be active.
  // Both selected = posts with a therapist of any gender.
  const handleGenderToggle = useCallback((g: 'm' | 'f') => {
    setSearchInput('')
    setSearchTerm('')
    setFiltersState(prev => {
      const current = prev.gender
      let next: 'm' | 'f' | 'both' | undefined
      if (current === g) next = undefined
      else if (current === 'both') next = g === 'm' ? 'f' : 'm'
      else if (current) next = 'both'
      else next = g
      return { ...prev, gender: next }
    })
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
    if (filters.designations && filters.designations.length > 0) count++
    if (filters.gender) count++
    if (filters.dateFrom || filters.dateTo) count++
    return count
  }, [filters])

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl forum-list-column mx-auto pt-0 pb-6 px-0 md:px-4">
        {/* New Navbar */}
        <div className={`forum-navbar p-4 mb-4 mx-4 md:mx-0 relative ${showCreatePostDialog ? 'md:hidden' : ''}`} style={{borderRadius: '20px', backgroundColor: 'rgb(255 255 255 / 47%)', zIndex: 40}}>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="forum-search relative flex-1">
              <input
                type="text"
                placeholder="Suche..."
                value={searchInput}
                onChange={handleSearchChange}
                onFocus={() => setSearchExpanded(true)}
                onBlur={() => setSearchExpanded(false)}
                className="w-full pl-4 pr-10 py-2 bg-white text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffd6d6] text-sm font-medium md:text-lg md:font-normal md:placeholder-[oklch(0.32_0_0)]"
                style={{borderRadius: '20px'}}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#ff8787]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter Button — icon only on desktop; hidden while the mobile search is expanded */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`forum-filter-btn bg-white hover:bg-gray-50 transition-colors relative ${searchExpanded ? 'hidden' : 'flex'} md:hidden items-center justify-center`}
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

            {/* Neu Button — hidden while the mobile search is expanded */}
            <button
              onClick={onCreatePost}
              className={`forum-neu-btn bg-[var(--primary)] hover:bg-[var(--primary)] text-white px-4 py-2 font-medium transition-colors text-sm ${searchExpanded ? 'hidden md:flex' : 'flex'} items-center gap-2`}
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

        {/* Canton Filter - inline below navbar on desktop */}
        <div className={`${showCreatePostDialog ? 'hidden' : 'hidden md:flex'} items-center flex-wrap gap-1 canton-inline`} style={{ padding: '0 20px', marginBottom: '80px' }}>
          {SWISS_CANTONS.filter(c => c.code !== '').map(canton => (
            <button
              key={canton.code}
              onClick={() => handleCantonToggle(canton.code)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filters.cantons?.includes(canton.code)
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-gray-500 hover:bg-[var(--bg-element-hover)]'
              }`}
              style={{ fontSize: '0.75rem', border: 'none', cursor: 'pointer', background: filters.cantons?.includes(canton.code) ? undefined : 'transparent' }}
              title={canton.name}
            >
              <img
                src={`/kantone/${canton.code.toLowerCase()}.png`}
                alt={canton.name}
                className="w-4 h-4 object-contain"
                loading="lazy"
                decoding="async"
                width={16}
                height={16}
              />
              {canton.code}
            </button>
          ))}
          {filters.cantons && filters.cantons.length > 0 && (
            <button
              onClick={() => setFiltersState(prev => ({ ...prev, cantons: undefined }))}
              className="text-[var(--primary)] hover:opacity-80 ml-1"
              style={{ fontSize: '0.7rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              zurücksetzen
            </button>
          )}
        </div>

      {/* Post Editor Dialog — Mobile only (full-screen modal) */}
      {showCreatePostDialog && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 z-[70]">
          <div className="w-full h-full overflow-hidden flex flex-col relative" style={{backgroundColor: '#ecffef'}}>
            <button
              onClick={onCreatePostDialogClose}
              className="absolute text-[var(--primary)] hover:text-[#3b71e6] transition-colors p-1.5 z-10 rounded-full bg-[#ecffef]/85 backdrop-blur-sm"
              style={{ top: '44px', right: '28px' }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-y-auto flex-1 px-4 pt-[120px] pb-20">
              <h2 className="font-headline font-bold text-left mb-12" style={{ color: '#4785ff', fontSize: '20px' }}>
                Neuen Beitrag erstellen
              </h2>
              <PostEditor
                onSubmit={handleCreatePost}
                onCancel={onCreatePostDialogClose}
                mobileOptimized={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Post Editor — Desktop inline section */}
      {showCreatePostDialog && (
        <div className="hidden md:block px-4 md:px-0" style={{marginTop: '132px'}}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', padding: '30px' }}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="font-headline font-bold text-left" style={{ color: '#4785ff', fontSize: '20px' }}>
                Neuen Beitrag erstellen
              </h2>
              <button
                onClick={onCreatePostDialogClose}
                className="text-base font-medium hover:underline transition-colors bg-transparent border-none cursor-pointer"
                style={{ color: '#4785ff' }}
              >
                zurück zum forum
              </button>
            </div>
            <PostEditor
              onSubmit={handleCreatePost}
              onCancel={onCreatePostDialogClose}
              mobileOptimized={true}
            />
          </div>
        </div>
      )}

        {/* Posts area — filters sidebar + list */}
        <div className={`forum-posts-area relative ${showCreatePostDialog ? 'md:hidden' : ''}`}>
          {/* Date Range Filter - sidebar on desktop, above categories */}
          <div className="hidden md:flex date-filters" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(prev => !prev)}
              className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filters.dateFrom || filters.dateTo
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-gray-700 hover:bg-[var(--bg-element-hover)]'
              }`}
              style={{ backgroundColor: !(filters.dateFrom || filters.dateTo) ? 'white' : undefined }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {filters.dateFrom && filters.dateTo
                ? `${format(new Date(filters.dateFrom), 'dd.MM.yy')} – ${format(new Date(filters.dateTo), 'dd.MM.yy')}`
                : filters.dateFrom
                  ? `Ab ${format(new Date(filters.dateFrom), 'dd.MM.yy')}`
                  : 'Datum'}
            </button>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => { handleDateRangeSelect(undefined); setShowDatePicker(false) }}
                className="text-[var(--primary)] hover:opacity-80"
                style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
              >
                zurücksetzen
              </button>
            )}
            {showDatePicker && (
              <div className="date-picker-dropdown">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  locale={de}
                  numberOfMonths={1}
                />
              </div>
            )}
          </div>

          {/* Category Filter - Hidden on mobile, sidebar on desktop */}
          <div className="hidden md:flex items-center space-x-2 overflow-x-auto px-4 md:px-0 mb-4 category-filters">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                !filters.category
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
              }`}
              style={{fontSize: '0.65rem'}}
            >
              Alle Kategorien
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
                  className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filters.category === category.id
                      ? 'text-gray-700'
                      : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
                  }`}
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: filters.category === category.id ? categoryBgs[category.id] : undefined
                  }}
                >
                  {category.name_de}
                </button>
              )
            })}
          </div>

          {/* Designation Filter - sidebar on desktop */}
          <div className="hidden md:flex designation-filters">
            {/* "Alle Bezeichnungen" reset */}
            <button
              onClick={() => setFiltersState(prev => ({ ...prev, designations: undefined }))}
              className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                !filters.designations || filters.designations.length === 0
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
              }`}
              style={{ fontSize: '0.65rem' }}
            >
              Alle Bezeichnungen
            </button>

            {/* Gender tabs — one line, choose one, none, or both */}
            <div className="flex gap-1.5">
              {([
                { value: 'f' as const, label: 'Frauen' },
                { value: 'm' as const, label: 'Männer' }
              ]).map(g => (
                <button
                  key={g.value}
                  onClick={() => handleGenderToggle(g.value)}
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filters.gender === g.value || filters.gender === 'both'
                      ? 'bg-[#c0e1ff] text-gray-700'
                      : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
                  }`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {designations.map(d => (
              <button
                key={d.id}
                onClick={() => handleDesignationToggle(d.id)}
                className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filters.designations?.includes(d.id)
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
                }`}
                style={{ fontSize: '0.65rem' }}
              >
                {getDesignationLabel(d, lang)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff8787]"></div>
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
            <div className={`space-y-4 px-4 md:px-0 transition-opacity duration-150 ${postsFetching && !postsLoading ? 'opacity-60' : ''}`}>
              {displayPosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  className={index === 0 ? 'mt-32' : ''}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isSearchMode && !postsLoading && totalPages > 1 && (
            <div className="mt-10 mb-4 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ForumView.displayName = 'ForumView'

export default ForumView