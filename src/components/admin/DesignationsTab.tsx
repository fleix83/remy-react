import React, { useState, useEffect } from 'react'
import type { Designation } from '../../types/database.types'
import { DesignationsService } from '../../services/designations.service'
import DesignationRow from './DesignationRow'
import { toast } from '../../stores/toast.store'

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
        slug: `neu-${Date.now()}`,
        label_de: 'Neue Bezeichnung',
        label_fr: '',
        label_it: '',
        keywords: null,
        sort_order: 100,
        is_active: true
      })

      // Reload the list to include the new designation
      await loadDesignations()

      // Scroll to top to show the new designation
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error creating designation:', err)
      toast.error('Fehler beim Erstellen der Bezeichnung')
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Lade Bezeichnungen...</span>
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
        <h2 className="text-xl font-bold text-[var(--type)]">Berufsbezeichnung</h2>
        <button
          onClick={handleCreateNew}
          disabled={isCreating}
          className="inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-3 py-1.5 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[#e0eaff] disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          {isCreating ? 'Erstellen…' : 'Neu'}
        </button>
      </div>

      {/* Scrollable Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#efe9df]">
        {/* Table Header */}
        <div className="border-b border-[#efe9df] bg-[#faf8f4] min-w-[900px]">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="w-32 text-xs font-semibold text-slate-500 uppercase text-left">Slug</div>
            <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">DE</div>
            <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">FR</div>
            <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">IT</div>
            <div className="flex-1 text-xs font-semibold text-slate-500 uppercase text-left">Keywords (Import-Zuordnung)</div>
            <div className="w-16 text-xs font-semibold text-slate-500 uppercase text-center">Sort</div>
            <div className="w-16 text-xs font-semibold text-slate-500 uppercase flex justify-center">Aktiv</div>
            <div className="w-20 text-xs font-semibold text-slate-500 uppercase flex justify-end">Aktionen</div>
          </div>
        </div>

        {/* Designations List */}
        <div className="bg-white overflow-hidden min-w-[900px]">
          {designations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Keine Bezeichnungen vorhanden.
              <button
                onClick={handleCreateNew}
                className="mx-auto mt-4 block font-semibold text-[var(--primary)] hover:underline"
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
      <div className="text-sm text-slate-500 text-right">
        {designations.length} Bezeichnung{designations.length !== 1 ? 'en' : ''} insgesamt
        {' • '}
        {designations.filter(d => d.is_active).length} aktiv
      </div>
    </div>
  )
}

export default DesignationsTab
