import React, { useState, useEffect } from 'react'
import { TherapistsService } from '../../services/therapists.service'
import { DesignationsService } from '../../services/designations.service'
import { useCategories } from '../../hooks/usePosts'
import type { Designation, Therapist } from '../../types/database.types'

interface PostFilters {
  category?: number
  canton?: string
  therapist?: string
  designation?: string
  dateFrom?: string
  dateTo?: string
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: PostFilters
  onFiltersChange: (filters: PostFilters) => void
}

interface FilterState {
  category?: number
  canton?: string
  therapist?: string
  designation?: string
  dateFrom?: string
  dateTo?: string
}

const CANTONS = [
  { name: 'Aargau', code: 'AG' },
  { name: 'Appenzell Ausserrhoden', code: 'AR' },
  { name: 'Appenzell Innerrhoden', code: 'AI' },
  { name: 'Basel-Landschaft', code: 'BL' },
  { name: 'Basel-Stadt', code: 'BS' },
  { name: 'Bern', code: 'BE' },
  { name: 'Freiburg', code: 'FR' },
  { name: 'Genf', code: 'GE' },
  { name: 'Glarus', code: 'GL' },
  { name: 'Graubünden', code: 'GR' },
  { name: 'Jura', code: 'JU' },
  { name: 'Luzern', code: 'LU' },
  { name: 'Neuenburg', code: 'NE' },
  { name: 'Nidwalden', code: 'NW' },
  { name: 'Obwalden', code: 'OW' },
  { name: 'Schaffhausen', code: 'SH' },
  { name: 'Schwyz', code: 'SZ' },
  { name: 'Solothurn', code: 'SO' },
  { name: 'St. Gallen', code: 'SG' },
  { name: 'Tessin', code: 'TI' },
  { name: 'Thurgau', code: 'TG' },
  { name: 'Uri', code: 'UR' },
  { name: 'Waadt', code: 'VD' },
  { name: 'Wallis', code: 'VS' },
  { name: 'Zug', code: 'ZG' },
  { name: 'Zürich', code: 'ZH' }
]

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, filters, onFiltersChange }) => {
  const { data: categories = [] } = useCategories()
  const [designations, setDesignations] = useState<Designation[]>([])
  const [therapistSearch, setTherapistSearch] = useState('')
  const [therapistSuggestions, setTherapistSuggestions] = useState<Therapist[]>([])
  const [showTherapistDropdown, setShowTherapistDropdown] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [isTherapistExpanded, setIsTherapistExpanded] = useState(false)

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.category ||
    filters.canton ||
    filters.therapist ||
    filters.designation ||
    filters.dateFrom ||
    filters.dateTo
  )

  const therapistsService = new TherapistsService()

  // Load designations on mount
  useEffect(() => {
    loadDesignations()
  }, [])

  // Initialize therapist search if there's a selected therapist
  useEffect(() => {
    if (isOpen) {
      if (filters.therapist) {
        // Find the therapist by ID and set the search text
        loadTherapistById(filters.therapist)
      } else {
        setTherapistSearch('')
        setSelectedTherapist(null)
      }
    }
  }, [isOpen, filters.therapist])

  const loadTherapistById = async (therapistId: string) => {
    try {
      const therapists = await therapistsService.getTherapists()
      const therapist = therapists.find(t => t.id.toString() === therapistId)
      if (therapist) {
        setSelectedTherapist(therapist)
        setTherapistSearch(therapistsService.formatTherapistDisplay(therapist))
      }
    } catch (error) {
      console.error('Error loading therapist:', error)
    }
  }

  const loadDesignations = async () => {
    try {
      const designationsService = new DesignationsService()
      const designations = await designationsService.getActiveDesignations()
      setDesignations(designations)
    } catch (error) {
      console.error('Error loading designations:', error)
    }
  }

  const searchTherapists = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setTherapistSuggestions([])
      return
    }
    
    try {
      const therapists = await therapistsService.searchTherapists(searchTerm)
      setTherapistSuggestions(therapists.slice(0, 10)) // Limit to 10 suggestions
    } catch (error) {
      console.error('Error searching therapists:', error)
      setTherapistSuggestions([])
    }
  }

  const handleTherapistSearchChange = (value: string) => {
    setTherapistSearch(value)
    setShowTherapistDropdown(true)
    
    // Clear selection if search is cleared
    if (!value) {
      setSelectedTherapist(null)
      setTherapistSuggestions([])
      handleFilterChange('therapist', undefined)
    } else {
      // Search immediately for better UX
      searchTherapists(value)
    }
  }

  const handleTherapistSelect = (therapist: Therapist) => {
    setSelectedTherapist(therapist)
    setTherapistSearch(therapistsService.formatTherapistDisplay(therapist))
    setShowTherapistDropdown(false)
    // Keep expanded - will shrink only when user clicks outside
    handleFilterChange('therapist', therapist.id.toString())
  }

  const handleFilterChange = (key: keyof FilterState, value: string | number | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value
    }
    onFiltersChange(newFilters) // Apply immediately to parent
  }

  const handleClearFilters = () => {
    setTherapistSearch('')
    setSelectedTherapist(null)
    setShowTherapistDropdown(false)
    setIsTherapistExpanded(false)

    onFiltersChange({}) // Clear filters immediately
    // Don't close modal - let user see results update
  }


  if (!isOpen) return null

  return (
    <div className="bg-[var(--bg-element)] rounded-lg mb-4 mx-4 md:mx-0" style={{borderRadius: '20px'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-black">Filter</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-[#4785ff] hover:opacity-80 underline transition-opacity"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-6">
          {/* Filter Buttons Grid */}
          <div className={`grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto ${isTherapistExpanded ? 'relative' : ''}`}>
            {/* Kategorien */}
            <div className="relative">
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full appearance-none bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none cursor-pointer text-sm"
              >
                <option value="">Alle Kategorien</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name_de}
                  </option>
                ))}
              </select>
            </div>

            {/* Kantone */}
            <div className="relative">
              <select
                value={filters.canton || ''}
                onChange={(e) => handleFilterChange('canton', e.target.value || undefined)}
                className="w-full appearance-none bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none cursor-pointer text-sm"
              >
                <option value="">Alle Kantone</option>
                {CANTONS.map(canton => (
                  <option key={canton.code} value={canton.code}>
                    {canton.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Therapeuten */}
            <div className={`relative ${isTherapistExpanded ? 'absolute inset-0 z-40 col-span-2' : ''}`}>
              <input
                type="text"
                placeholder={selectedTherapist ? therapistsService.formatTherapistDisplay(selectedTherapist) : "Therapeuten"}
                value={therapistSearch}
                onChange={(e) => handleTherapistSearchChange(e.target.value)}
                onFocus={() => {
                  setIsTherapistExpanded(true)
                  setShowTherapistDropdown(true)
                  if (therapistSearch && !selectedTherapist) {
                    searchTherapists(therapistSearch)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowTherapistDropdown(false)
                    // Always shrink when clicking outside, regardless of content
                    setIsTherapistExpanded(false)
                  }, 200)
                }}
                className={`w-full bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center placeholder-white placeholder-opacity-90 focus:outline-none focus:text-left focus:placeholder-transparent text-sm transition-all duration-300 ${isTherapistExpanded ? 'shadow-lg' : ''}`}
              />
              {/* Clear button overlay */}
              {(selectedTherapist || therapistSearch) && (
                <div
                  className="absolute right-0 top-0 bottom-0 rounded-r-lg flex items-center justify-end"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(to right, rgba(244, 146, 116, 0) 0%, rgb(255 60 0 / 0%) 40%, #ff6467 100%)',
                    paddingRight: '15px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTherapist(null)
                      setTherapistSearch('')
                      setShowTherapistDropdown(false)
                      setIsTherapistExpanded(false)
                      handleFilterChange('therapist', undefined)
                    }}
                    className="hover:opacity-80 rounded-full p-1 transition-opacity duration-200"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Search icon - only show when no content */}
              {!(selectedTherapist || therapistSearch) && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
              
              {/* Therapist Suggestions Dropdown */}
              {showTherapistDropdown && therapistSuggestions.length > 0 && (
                <div className="absolute z-40 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {therapistSuggestions.map((therapist) => (
                    <div
                      key={therapist.id}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                      onClick={() => handleTherapistSelect(therapist)}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {therapistsService.formatTherapistName(therapist)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {therapist.short_designation || therapist.designation}
                        {therapist.institution && ` • ${therapist.institution}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Berufsbezeichnung */}
            <div className="relative">
              <select
                value={filters.designation || ''}
                onChange={(e) => handleFilterChange('designation', e.target.value || undefined)}
                className="w-full appearance-none bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none cursor-pointer text-sm"
              >
                <option value="">Alle Bezeichnungen</option>
                {designations.map(designation => {
                  const designationsService = new DesignationsService()
                  const displayName = designationsService.getDisplayName(designation)
                  return (
                    <option key={designation.id} value={displayName}>
                      {displayName}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Date From */}
            <div className="relative">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="w-full bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none text-sm [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="tt.mm.jjjj"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Date To */}
            <div className="relative">
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="w-full bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none text-sm [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                placeholder="tt.mm.jjjj"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}

export default FilterModal