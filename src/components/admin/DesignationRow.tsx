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
 * Collapsible designation row component
 * Shows German by default, expands to show French and Italian
 * Inline editing for all fields with auto-save
 */
const DesignationRow: React.FC<DesignationRowProps> = ({
  designation,
  onUpdate,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const designationsService = new DesignationsService()

  const handleUpdate = async (field: keyof Designation, newValue: string) => {
    try {
      await designationsService.updateDesignation(designation.id, {
        [field]: newValue
      })
      onUpdate() // Refresh the list
    } catch (error) {
      console.error('Error updating designation:', error)
      throw error // Let InlineEditCell handle the error display
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Bezeichnung "${designation.name_de}" wirklich löschen?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await designationsService.deleteDesignation(designation.id)
      onDelete(designation.id)
    } catch (error) {
      console.error('Error deleting designation:', error)
      alert('Fehler beim Löschen der Bezeichnung')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="border-b border-gray-200">
      {/* German Row (Always Visible) */}
      <div className="flex items-center gap-2 hover:bg-gray-50 transition-colors px-2">
        {/* Expand/Collapse Icon */}
        <div className="w-8">
          <button
            onClick={toggleExpanded}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isExpanded ? 'Sprachen ausblenden' : 'Sprachen anzeigen'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Language Label */}
        <div className="w-10 text-sm font-medium text-gray-600">
          DE
        </div>

        {/* Kurzb. (m) - Short Masculine */}
        <div className="w-44">
          <InlineEditCell
            value={designation.name_de_short_m || ''}
            onSave={(newValue) => handleUpdate('name_de_short_m', newValue)}
            placeholder="Kurzb. (m)"
            displayClassName="text-left"
          />
        </div>

        {/* Kurzb. (w) - Short Feminine */}
        <div className="w-44">
          <InlineEditCell
            value={designation.name_de_short_f || ''}
            onSave={(newValue) => handleUpdate('name_de_short_f', newValue)}
            placeholder="Kurzb. (w)"
            displayClassName="text-left"
          />
        </div>

        {/* Lang (m) - Long Masculine */}
        <div className="flex-1">
          <InlineEditCell
            value={designation.name_de_long_m || ''}
            onSave={(newValue) => handleUpdate('name_de_long_m', newValue)}
            placeholder="Lang (m)"
            displayClassName="text-left"
          />
        </div>

        {/* Lang (w) - Long Feminine */}
        <div className="flex-1">
          <InlineEditCell
            value={designation.name_de_long_f || ''}
            onSave={(newValue) => handleUpdate('name_de_long_f', newValue)}
            placeholder="Lang (w)"
            displayClassName="text-left"
          />
        </div>

        {/* Active Status */}
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={designation.is_active}
            onChange={async (e) => {
              await handleUpdate('is_active', e.target.checked as any)
            }}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            title={designation.is_active ? 'Aktiv' : 'Inaktiv'}
          />
        </div>

        {/* Delete Button */}
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

      {/* French Row (Collapsible) */}
      {isExpanded && (
        <div className="flex items-center gap-2 bg-gray-50 px-2">
          <div className="w-8"></div>
          <div className="w-10 text-sm font-medium text-gray-600">
            FR
          </div>
          <div className="w-44">
            <InlineEditCell
              value={designation.name_fr_short_m || ''}
              onSave={(newValue) => handleUpdate('name_fr_short_m', newValue)}
              placeholder="Kurzb. (m)"
              displayClassName="text-left"
            />
          </div>
          <div className="w-44">
            <InlineEditCell
              value={designation.name_fr_short_f || ''}
              onSave={(newValue) => handleUpdate('name_fr_short_f', newValue)}
              placeholder="Kurzb. (w)"
              displayClassName="text-left"
            />
          </div>
          <div className="flex-1">
            <InlineEditCell
              value={designation.name_fr_long_m || ''}
              onSave={(newValue) => handleUpdate('name_fr_long_m', newValue)}
              placeholder="Lang (m)"
              displayClassName="text-left"
            />
          </div>
          <div className="flex-1">
            <InlineEditCell
              value={designation.name_fr_long_f || ''}
              onSave={(newValue) => handleUpdate('name_fr_long_f', newValue)}
              placeholder="Lang (w)"
              displayClassName="text-left"
            />
          </div>
          <div className="w-16"></div>
          <div className="w-20"></div>
        </div>
      )}

      {/* Italian Row (Collapsible) */}
      {isExpanded && (
        <div className="flex items-center gap-2 bg-gray-50 px-2">
          <div className="w-8"></div>
          <div className="w-10 text-sm font-medium text-gray-600">
            IT
          </div>
          <div className="w-44">
            <InlineEditCell
              value={designation.name_it_short_m || ''}
              onSave={(newValue) => handleUpdate('name_it_short_m', newValue)}
              placeholder="Kurzb. (m)"
              displayClassName="text-left"
            />
          </div>
          <div className="w-44">
            <InlineEditCell
              value={designation.name_it_short_f || ''}
              onSave={(newValue) => handleUpdate('name_it_short_f', newValue)}
              placeholder="Kurzb. (w)"
              displayClassName="text-left"
            />
          </div>
          <div className="flex-1">
            <InlineEditCell
              value={designation.name_it_long_m || ''}
              onSave={(newValue) => handleUpdate('name_it_long_m', newValue)}
              placeholder="Lang (m)"
              displayClassName="text-left"
            />
          </div>
          <div className="flex-1">
            <InlineEditCell
              value={designation.name_it_long_f || ''}
              onSave={(newValue) => handleUpdate('name_it_long_f', newValue)}
              placeholder="Lang (w)"
              displayClassName="text-left"
            />
          </div>
          <div className="w-16"></div>
          <div className="w-20"></div>
        </div>
      )}
    </div>
  )
}

export default DesignationRow
