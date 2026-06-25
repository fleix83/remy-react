import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePaginatedPosts, useCategories, useCreatePost, useSearchPosts } from '../../hooks/usePosts'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import 'react-day-picker/style.css'
import PostCard from './PostCard'
import PostEditor from './PostEditor'
import FilterModal from './FilterModal'
import Pagination from '../ui/Pagination'
import { SWISS_CANTONS, CANTON_NEIGHBORS } from '../../constants/switzerland.constants'
import { DesignationsService } from '../../services/designations.service'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { getCategoryColor, getCategoryName, getCategoryDescription, mixWithWhite } from '../../utils/categoryHelpers'
import { useAuthStore } from '../../stores/auth.store'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { dateFnsLocale } from '../../utils/dateFormat'
import { toast } from '../../stores/toast.store'
import { useTranslation } from 'react-i18next'
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
  const lang = useActiveLanguage()
  const { t } = useTranslation('forum')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  // Tint of the currently-selected category, reported by the editor — drives
  // the new-post modal's category-coloured top-header gradient.
  const [editorTint, setEditorTint] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<PostFilters>({})
  const [designations, setDesignations] = useState<Designation[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Default-canton filtering: when the user has a default canton, the forum
  // shows only posts from that canton + its neighbours until they opt out.
  const [showAllCantons, setShowAllCantons] = useState(false)
  const defaultCanton = userProfile?.default_canton || null
  const defaultCantonName = defaultCanton
    ? (SWISS_CANTONS.find(c => c.code === defaultCanton) ? t(`common:cantons.${defaultCanton}`) : defaultCanton)
    : ''
  const defaultCantons = useMemo(
    () => (defaultCanton ? [defaultCanton, ...(CANTON_NEIGHBORS[defaultCanton] || [])] : null),
    [defaultCanton]
  )
  const defaultCantonActive = !!defaultCantons && !showAllCantons

  // React Query hooks - use searchTerm when it exists, otherwise use filters
  const isSearchMode = Boolean(searchTerm.trim())

  // Effective filters fed to the query: while the default-canton restriction is
  // active, force the canton set to the default + neighbours.
  const effectiveFilters = useMemo<PostFilters>(
    () => (defaultCantonActive ? { ...filters, cantons: defaultCantons! } : filters),
    [filters, defaultCantonActive, defaultCantons]
  )

  // Numbered pagination state; jump back to page 1 whenever the effective
  // filters change (state-during-render pattern so we never fetch a stale page)
  const [page, setPage] = useState(1)
  const [prevFilters, setPrevFilters] = useState(effectiveFilters)
  if (effectiveFilters !== prevFilters) {
    setPrevFilters(effectiveFilters)
    setPage(1)
  }

  const {
    data: pageData,
    isLoading: postsLoading,
    isFetching: postsFetching,
    totalPages
  } = usePaginatedPosts(isSearchMode ? {} : effectiveFilters, page) // Don't apply filters when searching

  const { data: searchResults = [], isLoading: searchLoading } = useSearchPosts(searchTerm)
  const { data: categories = [] } = useCategories()
  const createPostMutation = useCreatePost()

  // Category whose description panel is open (toggled via the tab's info icon,
  // desktop only).
  const [openCategory, setOpenCategory] = useState<(typeof categories)[number] | null>(null)

  // Close the category panel on Escape.
  useEffect(() => {
    if (!openCategory) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenCategory(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openCategory])

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
      toast.error(t('createError', { message: error instanceof Error ? error.message : t('unknownError') }))
      throw error
    }
  }, [createPostMutation, onCreatePostDialogClose, t])

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

  // Opt out of the default-canton restriction: show all posts and bring the
  // normal canton filter back. Re-applies on the next visit (in-memory flag).
  const handleShowAllCantons = useCallback(() => {
    setShowAllCantons(true)
    setFiltersState(prev => ({ ...prev, cantons: undefined }))
  }, [])

  // Snap back to the default-region restriction after opting out
  const handleShowMyRegion = useCallback(() => {
    setShowAllCantons(false)
    setFiltersState(prev => ({ ...prev, cantons: undefined }))
  }, [])

  // FilterModal changes flow through here so that touching the canton picker
  // while the default restriction is active counts as opting out of it.
  const handleFiltersChange = useCallback((next: PostFilters) => {
    if (defaultCantonActive && next.cantons !== filters.cantons) {
      setShowAllCantons(true)
    }
    setFiltersState(next)
  }, [defaultCantonActive, filters.cantons])

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
        <div className={`forum-navbar p-4 mb-4 mx-4 md:mx-0 relative ${showCreatePostDialog ? 'md:hidden' : ''}`} style={{borderRadius: '20px', backgroundColor: 'rgba(252, 252, 252, 0.46)', zIndex: 40}}>
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="forum-search relative flex-1">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchInput}
                onChange={handleSearchChange}
                onFocus={() => setSearchExpanded(true)}
                onBlur={() => setSearchExpanded(false)}
                className="w-full pl-4 pr-10 py-2 bg-white md:bg-[var(--bg-body)] text-gray-400 placeholder-gray-400 md:placeholder-[oklch(0.32_0_0)] font-medium md:font-normal focus:outline-none focus:ring-2 focus:ring-[#4785ff] md:focus:ring-[#d9f7de] text-sm md:text-lg"
                style={{borderRadius: '20px'}}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#4785ff] md:text-[#2ebe7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className="md:hidden ml-2 text-sm font-medium">{t('filter')}</span>
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
              {t('new')}
            </button>
          </div>
        </div>

        {/* Lebenskurve — decorative life-curve below the toolbar (mobile only) */}
        <img
          src="/images/lebenskurve_mobile.svg"
          alt=""
          aria-hidden="true"
          className="md:hidden block w-full px-4 mt-2 select-none pointer-events-none"
        />

        {/* Filter Modal */}
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          defaultCantonActive={defaultCantonActive && !isSearchMode}
          defaultCantonLabel={defaultCantonName}
          onShowAllCantons={handleShowAllCantons}
        />

        {/* Default-canton banner — replaces the canton filter while active
            (hidden during search, which ignores filters anyway) */}
        {defaultCantonActive && !isSearchMode ? (
          <div className={`${showCreatePostDialog ? 'hidden' : 'flex'} flex-col items-start canton-inline mt-[50px] mb-[-88px] md:mt-0 md:mb-20`} style={{ padding: '0 40px', fontFamily: 'Nunito' }}>
            <p className="text-gray-600 text-left" style={{ fontSize: 'medium' }}>
              {t('regionBanner', { canton: defaultCantonName })}
            </p>
            <button
              onClick={handleShowAllCantons}
              className="text-sm underline text-[var(--primary)] hover:opacity-80 mt-1"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('showAllPosts')}
            </button>
          </div>
        ) : (
        <>
        {/* "Meine Region anzeigen" — opt back into the default-region restriction.
            Shown only when a default region is set but the user is viewing all posts. */}
        {defaultCantons && showAllCantons && !isSearchMode && (
          <div className={`${showCreatePostDialog ? 'hidden' : 'flex'} justify-end mt-[50px] mb-4 md:mt-0 md:mb-4`} style={{ padding: '0 40px', fontFamily: 'Nunito' }}>
            <button
              onClick={handleShowMyRegion}
              className="text-sm underline hover:opacity-80"
              style={{ color: '#4785ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('showMyRegion')}
            </button>
          </div>
        )}
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
              title={t(`common:cantons.${canton.code}`)}
            >
              <img
                src={`/kantone/${canton.code.toLowerCase()}.png`}
                alt={t(`common:cantons.${canton.code}`)}
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
              {t('reset')}
            </button>
          )}
        </div>
        </>
        )}

      {/* Post Editor Dialog — Mobile only (full-screen modal). Portaled to
          <body> so it covers the site nav (logo/avatar) rather than being
          trapped under it inside <main>'s z-2 stacking context. */}
      {showCreatePostDialog && createPortal(
        /* z-40: above the site nav (logo z-10 / avatar z-20) so they don't bleed
           through, but below the therapist create modal (a z-50 body portal) so
           "+ Therapeut:in hinzufügen" still opens on top. */
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 z-40">
          <div className="post-editor-surface w-full h-full overflow-hidden flex flex-col relative" style={{ '--editor-cat-tint': editorTint ?? undefined } as React.CSSProperties}>
            <button
              onClick={onCreatePostDialogClose}
              className="absolute text-[var(--primary)] hover:text-[#3b71e6] transition-colors p-1.5 z-10 rounded-full bg-white/70 backdrop-blur-sm"
              style={{ top: '44px', right: '28px' }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-y-auto flex-1 px-4 pt-[120px] pb-20">
              <h2 className="font-headline font-bold text-left mb-1" style={{ color: '#4785ff', fontSize: '20px' }}>
                {t('newPostTitle')}
              </h2>
              <PostEditor
                onSubmit={handleCreatePost}
                onCancel={onCreatePostDialogClose}
                onCategoryTintChange={setEditorTint}
                mobileOptimized={true}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Post Editor — Desktop inline section */}
      {showCreatePostDialog && (
        <div className="hidden md:block px-4 md:px-0" style={{marginTop: '132px'}}>
          <div style={{ backgroundColor: 'white', borderRadius: '30px', padding: '30px' }}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="font-headline font-bold text-left" style={{ color: '#4785ff', fontSize: '20px' }}>
                {t('newPostTitle')}
              </h2>
              <button
                onClick={onCreatePostDialogClose}
                className="text-base font-medium hover:underline transition-colors bg-transparent border-none cursor-pointer"
                style={{ color: '#4785ff' }}
              >
                {t('backToForum')}
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
                  ? t('dateFrom', { date: format(new Date(filters.dateFrom), 'dd.MM.yy') })
                  : t('date')}
            </button>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => { handleDateRangeSelect(undefined); setShowDatePicker(false) }}
                className="text-[var(--primary)] hover:opacity-80"
                style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
              >
                {t('reset')}
              </button>
            )}
            {showDatePicker && (
              <div className="date-picker-dropdown">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  locale={dateFnsLocale(lang)}
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
                  : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--primary)] hover:text-white'
              }`}
              style={{fontSize: '0.65rem'}}
            >
              {t('allCategories')}
            </button>
            {categories.map((category) => {
              const catColor = getCategoryColor(category)
              const isActive = filters.category === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryFilter(category.id)}
                  className={`flex w-full items-center justify-between gap-2 px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors category-tab ${
                    isActive ? 'text-gray-700' : 'bg-[var(--bg-element)] text-gray-700'
                  }`}
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: isActive ? catColor : undefined,
                    '--cat-color': catColor,
                  } as React.CSSProperties}
                >
                  <span>{getCategoryName(category, lang)}</span>
                  <span
                    aria-label={`Info: ${getCategoryName(category, lang)}`}
                    title={getCategoryName(category, lang)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenCategory(prev => (prev?.id === category.id ? null : category))
                    }}
                    className="category-info-icon shrink-0 cursor-pointer text-[var(--primary)] opacity-60 transition-opacity hover:opacity-100"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Category description panel — floats over the main forum column
              while a category tab is hovered (desktop only). Placeholder copy
              for now; replace with real per-category descriptions. */}
          {openCategory && (
            <div
              className="category-hint-panel text-left"
              style={{ backgroundColor: mixWithWhite(getCategoryColor(openCategory), 0.75) }}
            >
              <button
                type="button"
                onClick={() => setOpenCategory(null)}
                aria-label="Schließen"
                className="absolute right-4 top-4 text-[var(--primary)] transition-opacity hover:opacity-70"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="mb-3 pr-8 text-[22px] font-semibold text-gray-800">
                {getCategoryName(openCategory, lang)}
              </h3>
              <p className="whitespace-pre-line text-[18px] leading-relaxed text-gray-700">
                {getCategoryDescription(openCategory, lang) || t('categoryPanelEmpty')}
              </p>
            </div>
          )}

          {/* Designation Filter - sidebar on desktop */}
          <div className="hidden md:flex designation-filters">
            {/* "Alle Bezeichnungen" reset */}
            <button
              onClick={() => setFiltersState(prev => ({ ...prev, designations: undefined }))}
              className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                !filters.designations || filters.designations.length === 0
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--primary)] hover:text-white'
              }`}
              style={{ fontSize: '0.65rem' }}
            >
              {t('allDesignations')}
            </button>

            {/* Gender tabs — one line, choose one, none, or both */}
            <div className="flex gap-1.5">
              {([
                { value: 'f' as const, label: t('women') },
                { value: 'm' as const, label: t('men') }
              ]).map(g => (
                <button
                  key={g.value}
                  onClick={() => handleGenderToggle(g.value)}
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filters.gender === g.value || filters.gender === 'both'
                      ? 'bg-[#f4edd8] text-gray-700'
                      : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[#f4edd8]'
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
                    ? 'bg-[#f4edd8] text-gray-700'
                    : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[#f4edd8]'
                }`}
                style={{ fontSize: '0.65rem' }}
              >
                {getDesignationLabel(d, lang)}
              </button>
            ))}
          </div>

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
              <h3 className="text-lg font-medium text-white">{t('empty.title')}</h3>
              <p className="text-gray-700 mt-1">
                {filters.category
                  ? t('empty.inCategory')
                  : t('empty.none')}
              </p>
            </div>
          ) : (
            <div className={`space-y-4 px-4 md:px-0 transition-opacity duration-150 ${postsFetching && !postsLoading ? 'opacity-60' : ''}`}>
              {displayPosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  /* First post: keep mt-32 when the region banner sits above it
                     (it offsets the banner's negative bottom margin); otherwise
                     use a tighter gap to the navbar/header graphic. */
                  className={index === 0 ? ((defaultCantonActive && !isSearchMode) ? 'mt-32' : 'first-post-no-region') : ''}
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