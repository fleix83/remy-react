import React, { useRef, useState } from 'react'
import type { Category } from '../../types/database.types'
import InlineEditCell from '../ui/InlineEditCell'
import { CategoriesService } from '../../services/categories.service'
import { getCategoryColor } from '../../utils/categoryHelpers'

interface CategoryRowProps {
  category: Category
  onUpdate: () => void
}

/**
 * One forum category: badge color (picker), DE/FR/IT names, active flag.
 * Categories are never created or deleted here — post logic depends on the
 * fixed ids (1 Erfahrung, 4 Rant), so only their appearance is editable.
 */
const CategoryRow: React.FC<CategoryRowProps> = ({ category, onUpdate }) => {
  const categoriesService = new CategoriesService()

  // Local color state for live preview; persisting is debounced because the
  // native picker fires change events continuously while dragging.
  const [color, setColor] = useState(getCategoryColor(category))
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleUpdate = async (field: keyof Category, newValue: string | boolean): Promise<void> => {
    try {
      await categoriesService.updateCategory(category.id, { [field]: newValue })
      onUpdate()
    } catch (error) {
      console.error('Error updating category:', error)
      throw error
    }
  }

  const handleColorChange = (value: string) => {
    setColor(value)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      handleUpdate('color', value).catch(() => {
        alert('Fehler beim Speichern der Farbe (Migration 022 schon eingespielt?)')
        setColor(getCategoryColor(category))
      })
    }, 400)
  }

  return (
    <div className="border-b border-[#f1ece3] last:border-b-0">
      <div className="flex items-center gap-2 hover:bg-[#faf8f4] transition-colors px-2 py-1">
        <div className="w-10 text-sm text-slate-400 text-center tabular-nums">{category.id}</div>
        <div className="w-28 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-[#e2ddd3] bg-white p-0.5"
            title="Kategoriefarbe"
          />
          <span className="text-xs text-slate-500 uppercase tabular-nums">{color}</span>
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_de}
            onSave={(v) => handleUpdate('name_de', v)}
            placeholder="Name DE"
            displayClassName="text-left"
            required
          />
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_fr || ''}
            onSave={(v) => handleUpdate('name_fr', v)}
            placeholder="Name FR"
            displayClassName="text-left"
          />
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_it || ''}
            onSave={(v) => handleUpdate('name_it', v)}
            placeholder="Name IT"
            displayClassName="text-left"
          />
        </div>
        {/* Live badge preview, same styling as the forum badges */}
        <div className="flex-1 text-left">
          <span
            className="inline-flex items-center px-2 py-0.5 font-medium text-black"
            style={{ fontSize: '0.65rem', backgroundColor: color, borderRadius: '3px' }}
          >
            {category.name_de}
          </span>
        </div>
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={category.is_active ?? true}
            onChange={(e) => handleUpdate('is_active', e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[var(--primary)] focus:ring-[var(--primary)]"
            title={category.is_active ? 'Aktiv' : 'Inaktiv'}
          />
        </div>
      </div>
    </div>
  )
}

export default CategoryRow
