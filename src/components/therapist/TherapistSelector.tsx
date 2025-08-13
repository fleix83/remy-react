import React, { useState, useEffect, useRef } from 'react'
import { TherapistsService } from '../../services/therapists.service'
import TherapistCreateModal from './TherapistCreateModal'
import type { Therapist } from '../../types/database.types'

interface TherapistSelectorProps {
  selectedTherapist: Therapist | null
  onTherapistSelect: (therapist: Therapist | null) => void
  canton?: string
  disabled?: boolean
}

const TherapistSelector: React.FC<TherapistSelectorProps> = ({
  selectedTherapist,
  onTherapistSelect,
  canton = '',
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [filteredTherapists, setFilteredTherapists] = useState<Therapist[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const therapistsService = new TherapistsService()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load therapists on mount
  useEffect(() => {
    loadTherapists()
  }, [])

  // Filter therapists based on search term and canton
  useEffect(() => {
    let filtered = therapists

    // Filter by canton if provided
    if (canton) {
      filtered = filtered.filter(t => t.canton === canton || !t.canton)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(therapist => 
        therapist.first_name.toLowerCase().includes(term) ||
        therapist.last_name.toLowerCase().includes(term) ||
        (therapist.institution && therapist.institution.toLowerCase().includes(term)) ||
        therapist.designation.toLowerCase().includes(term)
      )
    }

    setFilteredTherapists(filtered)
    setSelectedIndex(-1)
  }, [therapists, searchTerm, canton])

  // Update search term when therapist is selected
  useEffect(() => {
    if (selectedTherapist) {
      setSearchTerm(therapistsService.formatTherapistDisplay(selectedTherapist))
      setIsDropdownOpen(false)
    }
  }, [selectedTherapist])

  const loadTherapists = async () => {
    try {
      setIsLoading(true)
      console.log('🔧 TherapistSelector: Loading therapists...')
      const data = await therapistsService.getTherapists()
      console.log('✅ TherapistSelector: Loaded therapists:', data)
      setTherapists(data)
    } catch (error) {
      console.error('❌ TherapistSelector: Error loading therapists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // Clear selection if input is cleared or changed
    if (selectedTherapist && value !== therapistsService.formatTherapistDisplay(selectedTherapist)) {
      onTherapistSelect(null)
    }
    
    setIsDropdownOpen(true)
  }

  const handleInputFocus = () => {
    setIsDropdownOpen(true)
  }

  const handleInputBlur = () => {
    // Delay closing to allow for option selection
    setTimeout(() => {
      setIsDropdownOpen(false)
    }, 200)
  }

  const handleTherapistSelect = (therapist: Therapist) => {
    onTherapistSelect(therapist)
    setSearchTerm(therapistsService.formatTherapistDisplay(therapist))
    setIsDropdownOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredTherapists.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredTherapists.length) {
          handleTherapistSelect(filteredTherapists[selectedIndex])
        }
        break
      case 'Escape':
        setIsDropdownOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleCreateNewTherapist = () => {
    setShowCreateModal(true)
    setIsDropdownOpen(false)
  }

  const handleTherapistCreated = (newTherapist: Therapist) => {
    console.log('🔧 TherapistSelector: Handling newly created therapist:', newTherapist)
    
    // Add to therapists list
    setTherapists(prev => {
      const updated = [newTherapist, ...prev]
      console.log('✅ TherapistSelector: Updated therapists list:', updated)
      return updated
    })
    
    // Auto-select the newly created therapist
    onTherapistSelect(newTherapist)
    setSearchTerm(therapistsService.formatTherapistDisplay(newTherapist))
    
    // Also reload the therapists from the database to ensure consistency
    setTimeout(() => {
      console.log('🔄 TherapistSelector: Reloading therapists from database...')
      loadTherapists()
    }, 1000)
  }

  const clearSelection = () => {
    onTherapistSelect(null)
    setSearchTerm('')
    searchInputRef.current?.focus()
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onClick={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Therapeut/in suchen oder klicken um zu erstellen..."
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
        />
        
        {/* Clear button */}
        {selectedTherapist && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isDropdownOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Create new therapist option */}
          <div
            onClick={handleCreateNewTherapist}
            className="px-4 py-3 cursor-pointer hover:bg-primary-50 border-b border-gray-200 flex items-center space-x-2 text-primary-600 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Neuen Therapeuten hinzufügen</span>
          </div>

          {/* Therapist options */}
          {filteredTherapists.length === 0 && searchTerm ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Keine Therapeuten gefunden für "{searchTerm}"
              {therapists.length > 0 && (
                <div className="text-xs mt-1">
                  ({therapists.length} Therapeuten insgesamt verfügbar)
                </div>
              )}
            </div>
          ) : filteredTherapists.length === 0 && therapists.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Noch keine Therapeuten vorhanden. Erstellen Sie den ersten Therapeuten.
            </div>
          ) : filteredTherapists.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Keine Therapeuten für diesen Kanton gefunden
              {therapists.length > 0 && (
                <div className="text-xs mt-1">
                  ({therapists.length} Therapeuten insgesamt verfügbar)
                </div>
              )}
            </div>
          ) : (
            filteredTherapists.map((therapist, index) => (
              <div
                key={therapist.id}
                onClick={() => handleTherapistSelect(therapist)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-primary-50' : ''
                } ${selectedTherapist?.id === therapist.id ? 'bg-primary-100' : ''}`}
              >
                <div className="font-medium text-gray-900">
                  {therapistsService.formatTherapistName(therapist)}
                </div>
                <div className="text-sm text-gray-600">
                  {therapist.designation}
                  {therapist.institution && ` • ${therapist.institution}`}
                  {therapist.canton && ` • ${therapist.canton}`}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Therapist Modal */}
      <TherapistCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTherapistCreated={handleTherapistCreated}
        preselectedCanton={canton}
      />
    </div>
  )
}

export default TherapistSelector