import React, { useState, useEffect } from 'react'
import { useForumStore } from '../../stores/forum.store'
import { PostsService } from '../../services/posts.service'
import { TherapistsService } from '../../services/therapists.service'
import type { Designation, Therapist } from '../../types/database.types'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
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

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose }) => {
  const { categories, filters, setFilters, clearFilters, loadPosts } = useForumStore()
  const [localFilters, setLocalFilters] = useState<FilterState>({})
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(false)
  const [therapistSearch, setTherapistSearch] = useState('')
  const [therapistSuggestions, setTherapistSuggestions] = useState<Therapist[]>([])
  const [showTherapistDropdown, setShowTherapistDropdown] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [isTherapistExpanded, setIsTherapistExpanded] = useState(false)
  
  const postsService = new PostsService()
  const therapistsService = new TherapistsService()

  // Load designations on mount
  useEffect(() => {
    loadDesignations()
  }, [])

  // Initialize local filters from store
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({
        category: filters.category,
        canton: filters.canton,
        therapist: filters.therapist,
        designation: filters.designation,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      })
      
      // Initialize therapist search if there's a selected therapist
      if (filters.therapist) {
        // Find the therapist by ID and set the search text
        loadTherapistById(filters.therapist)
      } else {
        setTherapistSearch('')
        setSelectedTherapist(null)
      }
    }
  }, [isOpen, filters])

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
      // We'll fetch unique designations from therapists table for now
      // In a full implementation, you'd have a designations table
      const designations = await postsService.getDesignations()
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
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleApplyFilters = async () => {
    setLoading(true)
    try {
      // Convert local filters to store filter format
      const storeFilters = {
        category: localFilters.category,
        canton: localFilters.canton,
        therapist: localFilters.therapist,
        designation: localFilters.designation,
        dateFrom: localFilters.dateFrom,
        dateTo: localFilters.dateTo,
        search: filters.search // Preserve existing search
      }

      // Apply filters and reload posts
      setFilters(storeFilters)
      await loadPosts(storeFilters)
      onClose()
    } catch (error) {
      console.error('Error applying filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = async () => {
    setLoading(true)
    try {
      setLocalFilters({})
      setTherapistSearch('')
      setSelectedTherapist(null)
      setShowTherapistDropdown(false)
      setIsTherapistExpanded(false)
      clearFilters()
      await loadPosts({})
      onClose()
    } catch (error) {
      console.error('Error clearing filters:', error)
    } finally {
      setLoading(false)
    }
  }


  if (!isOpen) return null

  return (
    <div className="bg-[#203f4a] rounded-lg mb-4 mx-4 md:mx-0" style={{borderRadius: '20px'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a4a57]">
          <h2 className="text-xl font-semibold text-white">Filter</h2>
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
                value={localFilters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full appearance-none bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#37a653] cursor-pointer text-sm"
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
                value={localFilters.canton || ''}
                onChange={(e) => handleFilterChange('canton', e.target.value || undefined)}
                className="w-full appearance-none bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#37a653] cursor-pointer text-sm"
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
                placeholder={selectedTherapist ? therapistsService.formatTherapistDisplay(selectedTherapist) : "Therapeut suchen..."}
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
                className={`w-full bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center placeholder-white placeholder-opacity-90 focus:outline-none focus:ring-2 focus:ring-[#37a653] focus:text-left focus:placeholder-transparent text-sm transition-all duration-300 ${isTherapistExpanded ? 'shadow-lg' : ''}`}
              />
              {/* Clear button overlay */}
              {(selectedTherapist || therapistSearch) && (
                <div className="absolute right-0 top-0 bottom-0 w-5 bg-white bg-opacity-90 rounded-r-lg flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTherapist(null)
                      setTherapistSearch('')
                      setShowTherapistDropdown(false)
                      setIsTherapistExpanded(false)
                      handleFilterChange('therapist', undefined)
                    }}
                    className="hover:bg-gray-100 rounded-full p-1 transition-colors duration-200"
                  >
                    <svg className="w-3 h-3 text-gray-600 hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                        {therapist.designation}
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
                value={localFilters.designation || ''}
                onChange={(e) => handleFilterChange('designation', e.target.value || undefined)}
                className="w-full appearance-none bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#37a653] cursor-pointer text-sm"
              >
                <option value="">Alle Bezeichnungen</option>
                {designations.map(designation => (
                  <option key={designation.id} value={designation.name_de}>
                    {designation.name_de}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="relative">
              <input
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="w-full bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#37a653] text-sm [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
                value={localFilters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="w-full bg-[#e85a4f] hover:bg-[#d14940] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none focus:ring-2 focus:ring-[#37a653] text-sm [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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

        {/* Footer Actions */}
        <div className="flex items-center justify-center p-4 space-x-3">
          <button
            onClick={handleClearFilters}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
          >
            Zurücksetzen
          </button>
          
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>Filtern</span>
          </button>
        </div>
    </div>
  )
}

export default FilterModal