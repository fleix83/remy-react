import React, { useState, useEffect } from 'react'
import type { Designation } from '../../types/database.types'
import { DesignationsService } from '../../services/designations.service'
import DesignationRow from './DesignationRow'

/**
 * Admin tab for managing professional designations
 * Lists all designations with inline editing capabilities
 * Supports creating new designations
 */
const DesignationsTab: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const designationsService = new DesignationsService()

  useEffect(() => {
    loadDesignations()
  }, [])

  const loadDesignations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await designationsService.getAllDesignations()
      setDesignations(data)
    } catch (err) {
      console.error('Error loading designations:', err)
      setError('Fehler beim Laden der Bezeichnungen')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (isCreating) return

    setIsCreating(true)
    try {
      // Create a new designation with default values
      await designationsService.createDesignation({
        name_de_short_m: 'Neue Bezeichnung',
        name_de_short_f: null,
        name_de_long_m: null,
        name_de_long_f: null,
        name_fr_short_m: null,
        name_fr_short_f: null,
        name_fr_long_m: null,
        name_fr_long_f: null,
        name_it_short_m: null,
        name_it_short_f: null,
        name_it_long_m: null,
        name_it_long_f: null,
        description_de: null,
        description_fr: null,
        description_it: null,
        parent_id: null,
        is_active: true
      })

      // Reload the list to include the new designation
      await loadDesignations()

      // Scroll to top to show the new designation
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error creating designation:', err)
      alert('Fehler beim Erstellen der Bezeichnung')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    // Remove from local state immediately for better UX
    setDesignations(prev => prev.filter(d => d.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Lade Bezeichnungen...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button
          onClick={loadDesignations}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Berufsbezeichnung</h2>
        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
          style={{ color: '#4785ff' }}
        >
          {isCreating ? '+ Erstellen...' : '+ Neu'}
        </button>
      </div>

      {/* Scrollable Table Container */}
      <div className="overflow-x-auto">
        {/* Table Header */}
        <div className="bg-gray-100 border-b-2 border-gray-300 min-w-[1200px]">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="w-8"></div>
            <div className="w-10 text-xs font-semibold text-gray-600 uppercase">
              Spr.
            </div>
            <div className="w-44 text-xs font-semibold text-gray-600 uppercase text-left">
              Kurzb. (m)
            </div>
            <div className="w-44 text-xs font-semibold text-gray-600 uppercase text-left">
              Kurzb. (w)
            </div>
            <div className="flex-1 text-xs font-semibold text-gray-600 uppercase text-left">
              Lang (m)
            </div>
            <div className="flex-1 text-xs font-semibold text-gray-600 uppercase text-left">
              Lang (w)
            </div>
            <div className="w-16 text-xs font-semibold text-gray-600 uppercase flex justify-center">
              Aktiv
            </div>
            <div className="w-20 text-xs font-semibold text-gray-600 uppercase flex justify-end">
              Aktionen
            </div>
          </div>
        </div>

        {/* Designations List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden min-w-[1200px]">
          {designations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Keine Bezeichnungen vorhanden.
              <button
                onClick={handleCreateNew}
                className="block mx-auto mt-4 text-blue-600 hover:text-blue-800 font-medium"
                style={{ color: '#4785ff' }}
              >
                + Erste Bezeichnung erstellen
              </button>
            </div>
          ) : (
            designations.map((designation) => (
              <DesignationRow
                key={designation.id}
                designation={designation}
                onUpdate={loadDesignations}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="text-sm text-gray-500 text-right">
        {designations.length} Bezeichnung{designations.length !== 1 ? 'en' : ''} insgesamt
        {' • '}
        {designations.filter(d => d.is_active).length} aktiv
      </div>
    </div>
  )
}

export default DesignationsTab
