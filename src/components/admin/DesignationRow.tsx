import React, { useState } from 'react'
import type { Designation } from '../../types/database.types'
import InlineEditCell from '../ui/InlineEditCell'
import { DesignationsService } from '../../services/designations.service'

interface DesignationRowProps {
  designation: Designation
  onUpdate: () => void
  onDelete: (id: number) => void
}

/**
 * One curated designation: slug, pair-form labels (DE/FR/IT), import keywords,
 * sort order (also the keyword-match priority — most specific first), active flag.
 */
const DesignationRow: React.FC<DesignationRowProps> = ({ designation, onUpdate, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const designationsService = new DesignationsService()

  const handleUpdate = async (field: keyof Designation, newValue: string | number | boolean): Promise<void> => {
    try {
      await designationsService.updateDesignation(designation.id, { [field]: newValue })
      onUpdate()
    } catch (error) {
      console.error('Error updating designation:', error)
      throw error
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Bezeichnung "${designation.label_de}" wirklich löschen?`)) return
    setIsDeleting(true)
    try {
      await designationsService.deleteDesignation(designation.id)
      onDelete(designation.id)
    } catch (error) {
      console.error('Error deleting designation:', error)
      alert('Fehler beim Löschen der Bezeichnung (wird sie noch von Therapeuten verwendet?)')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="border-b border-[#f1ece3] last:border-b-0">
      <div className="flex items-center gap-2 hover:bg-[#faf8f4] transition-colors px-2">
        <div className="w-32">
          <InlineEditCell
            value={designation.slug}
            onSave={(v) => handleUpdate('slug', v)}
            placeholder="slug"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_de}
            onSave={(v) => handleUpdate('label_de', v)}
            placeholder="Label DE"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_fr}
            onSave={(v) => handleUpdate('label_fr', v)}
            placeholder="Label FR"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_it}
            onSave={(v) => handleUpdate('label_it', v)}
            placeholder="Label IT"
            displayClassName="text-left"
          />
        </div>
        <div className="flex-1">
          <InlineEditCell
            value={designation.keywords || ''}
            onSave={(v) => handleUpdate('keywords', v)}
            placeholder="Keywords (kommagetrennt, z.B. FMH, Psychiat)"
            displayClassName="text-left"
          />
        </div>
        <div className="w-16">
          <InlineEditCell
            value={String(designation.sort_order)}
            onSave={(v) => handleUpdate('sort_order', parseInt(v) || 100)}
            placeholder="Sort"
            displayClassName="text-center"
          />
        </div>
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={designation.is_active}
            onChange={(e) => handleUpdate('is_active', e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[var(--primary)] focus:ring-[var(--primary)]"
            title={designation.is_active ? 'Aktiv' : 'Inaktiv'}
          />
        </div>
        <div className="w-20 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DesignationRow
