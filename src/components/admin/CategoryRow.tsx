import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category } from '../../types/database.types'
import InlineEditCell from '../ui/InlineEditCell'
import { CategoriesService } from '../../services/categories.service'
import { getCategoryColor } from '../../utils/categoryHelpers'
import { toast } from '../../stores/toast.store'
import CategoryExplainerModal from './CategoryExplainerModal'

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
  const { t } = useTranslation('admin')
  const categoriesService = new CategoriesService()

  // Local color state for live preview; persisting is debounced because the
  // native picker fires change events continuously while dragging.
  const [color, setColor] = useState(getCategoryColor(category))
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [explainerOpen, setExplainerOpen] = useState(false)

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
        toast.error(t('categoryRow.colorSaveError'))
        setColor(getCategoryColor(category))
      })
    }, 400)
  }

  return (
    <>
    <div className="border-b border-[#f1ece3] last:border-b-0">
      <div className="flex items-center gap-2 hover:bg-[#faf8f4] transition-colors px-2 py-1">
        <div className="w-10 text-sm text-slate-400 text-center tabular-nums">{category.id}</div>
        <div className="w-28 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-[#e2ddd3] bg-white p-0.5"
            title={t('categoryRow.colorTitle')}
          />
          <span className="text-xs text-slate-500 uppercase tabular-nums">{color}</span>
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_de}
            onSave={(v) => handleUpdate('name_de', v)}
            placeholder={t('categoryRow.namePlaceholderDe')}
            displayClassName="text-left"
            required
          />
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_fr || ''}
            onSave={(v) => handleUpdate('name_fr', v)}
            placeholder={t('categoryRow.namePlaceholderFr')}
            displayClassName="text-left"
          />
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_it || ''}
            onSave={(v) => handleUpdate('name_it', v)}
            placeholder={t('categoryRow.namePlaceholderIt')}
            displayClassName="text-left"
          />
        </div>
        <div className="w-44">
          <InlineEditCell
            value={category.name_en || ''}
            onSave={(v) => handleUpdate('name_en', v)}
            placeholder={t('categoryRow.namePlaceholderEn')}
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
        {/* Explainer-panel editor (all 4 languages) */}
        <div className="w-24 flex justify-center">
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="rounded-lg p-1.5 text-[var(--primary)] transition-colors hover:bg-[#eef2ff]"
            title={t('categoryRow.explainerButton')}
            aria-label={t('categoryRow.explainerButton')}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={category.is_active ?? true}
            onChange={(e) => handleUpdate('is_active', e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[var(--primary)] focus:ring-[var(--primary)]"
            title={category.is_active ? t('categoryRow.activeTitle') : t('categoryRow.inactiveTitle')}
          />
        </div>
      </div>
    </div>

    <CategoryExplainerModal
      isOpen={explainerOpen}
      category={category}
      onClose={() => setExplainerOpen(false)}
      onSaved={onUpdate}
    />
    </>
  )
}

export default CategoryRow
