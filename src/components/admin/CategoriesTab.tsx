import React, { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Category } from '../../types/database.types'
import { CategoriesService } from '../../services/categories.service'
import { postsKeys } from '../../hooks/usePosts'
import CategoryRow from './CategoryRow'

/**
 * Admin tab for managing forum categories (Kategorien):
 * badge color and DE/FR/IT names, with inline editing like designations.
 */
const CategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const loadCategories = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true)
      setError(null)
      const data = await new CategoriesService().getAllCategories()
      setCategories(data)
      // Forum, editor, and filters cache categories via React Query —
      // drop that cache so edits show up without a reload.
      queryClient.invalidateQueries({ queryKey: postsKeys.categories })
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Fehler beim Laden der Kategorien')
    } finally {
      if (initial) setLoading(false)
    }
  }, [queryClient])

  useEffect(() => {
    loadCategories(true)
  }, [loadCategories])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
        <span className="ml-3 text-slate-500">Lade Kategorien...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button
          onClick={() => loadCategories(true)}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--type)]">Kategorien</h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#efe9df]">
        {/* Table Header */}
        <div className="border-b border-[#efe9df] bg-[#faf8f4] min-w-[900px]">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="w-10 text-xs font-semibold text-slate-500 uppercase text-center">ID</div>
            <div className="w-28 text-xs font-semibold text-slate-500 uppercase text-left">Farbe</div>
            <div className="w-44 text-xs font-semibold text-slate-500 uppercase text-left">DE</div>
            <div className="w-44 text-xs font-semibold text-slate-500 uppercase text-left">FR</div>
            <div className="w-44 text-xs font-semibold text-slate-500 uppercase text-left">IT</div>
            <div className="flex-1 text-xs font-semibold text-slate-500 uppercase text-left">Vorschau</div>
            <div className="w-16 text-xs font-semibold text-slate-500 uppercase flex justify-center">Aktiv</div>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white overflow-hidden min-w-[900px]">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Keine Kategorien vorhanden.</div>
          ) : (
            categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onUpdate={loadCategories}
              />
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-slate-500 text-right">
        {categories.length} Kategorie{categories.length !== 1 ? 'n' : ''} insgesamt
        {' • '}
        {categories.filter(c => c.is_active).length} aktiv
      </div>
    </div>
  )
}

export default CategoriesTab
