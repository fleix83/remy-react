import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category } from '../../types/database.types'
import { CategoriesService } from '../../services/categories.service'
import { getCategoryName } from '../../utils/categoryHelpers'
import { toast } from '../../stores/toast.store'

interface CategoryExplainerModalProps {
  isOpen: boolean
  category: Category | null
  onClose: () => void
  onSaved: () => void
}

// Explainer description columns, one per UI language.
const LANG_FIELDS = [
  { field: 'description_de', labelKey: 'explainerModal.langDe' },
  { field: 'description_fr', labelKey: 'explainerModal.langFr' },
  { field: 'description_it', labelKey: 'explainerModal.langIt' },
  { field: 'description_en', labelKey: 'explainerModal.langEn' },
] as const

/**
 * Modal editor for a category's explainer-panel copy in all four UI languages
 * (DE/FR/IT/EN). Saves straight to the categories table via the admin service.
 */
const CategoryExplainerModal: React.FC<CategoryExplainerModalProps> = ({
  isOpen,
  category,
  onClose,
  onSaved,
}) => {
  const { t, i18n } = useTranslation('admin')
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Seed the textareas from the category whenever the modal opens.
  useEffect(() => {
    if (isOpen && category) {
      setValues({
        description_de: category.description_de || '',
        description_fr: category.description_fr || '',
        description_it: category.description_it || '',
        description_en: category.description_en || '',
      })
    }
  }, [isOpen, category])

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !category) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await new CategoriesService().updateCategory(category.id, {
        description_de: values.description_de.trim() || null,
        description_fr: values.description_fr.trim() || null,
        description_it: values.description_it.trim() || null,
        description_en: values.description_en.trim() || null,
      })
      toast.success(t('explainerModal.saved'))
      onSaved()
      onClose()
    } catch (err) {
      console.error('Error saving category descriptions:', err)
      toast.error(t('explainerModal.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 md:bg-[#f8f5e6]/90 md:backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#fff9e2] shadow-[0_8px_30px_rgba(20,66,32,0.08)]"
        style={{ paddingTop: '35px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px' }}
      >
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute text-gray-500 transition-colors hover:text-gray-700 md:text-[var(--primary)] md:hover:text-[#3b71e6] disabled:opacity-50"
          style={{ top: '25px', right: '25px' }}
          aria-label={t('common:actions.cancel')}
        >
          <svg className="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="mb-1 pr-10 text-left text-lg font-semibold text-[var(--post-title)]">
          {t('explainerModal.title')}
        </h3>
        <p className="mb-4 text-left text-sm text-gray-600">
          {t('explainerModal.subtitle', { name: getCategoryName(category, i18n.language) })}
        </p>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto">
          {LANG_FIELDS.map(({ field, labelKey }) => (
            <div key={field} className="text-left">
              <label className="mb-1 block text-sm font-medium text-gray-700">{t(labelKey)}</label>
              <textarea
                value={values[field] ?? ''}
                onChange={(e) => setValues(prev => ({ ...prev, [field]: e.target.value }))}
                rows={3}
                placeholder={t('explainerModal.placeholder')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-50"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3b71e6] disabled:opacity-50"
          >
            {saving ? t('explainerModal.saving') : t('common:actions.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryExplainerModal
