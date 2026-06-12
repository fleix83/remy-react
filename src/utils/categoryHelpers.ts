import { normalizeLanguage } from './designationHelpers'

/**
 * Badge colors formerly hardcoded as CSS variables in index.css.
 * Used as fallback while categories.color is NULL (or the column has not
 * been migrated yet), so the app renders identically pre/post migration.
 */
export const DEFAULT_CATEGORY_COLORS: Record<number, string> = {
  1: '#ffeb99', // Erfahrung
  2: '#FFC8C8', // Suche
  3: '#C5D0FF', // Austausch
  4: '#edd3ff', // Rant
  5: '#98FFC7', // Ressourcen
}

type CategoryColorSource = { id: number; color?: string | null } | null | undefined

/** Badge color for a category: DB color first, hardcoded default second. */
export function getCategoryColor(category: CategoryColorSource): string {
  if (category?.color) return category.color
  return DEFAULT_CATEGORY_COLORS[category?.id ?? 0] || '#f3f4f6'
}

/**
 * Resolve a category's color via the fetched categories list (which includes
 * the color column) — joined post rows only carry id + names.
 */
export function getCategoryColorById(
  categoryId: number | null | undefined,
  categories?: CategoryColorSource[] | null
): string {
  const category = categories?.find(c => c?.id === categoryId)
  return getCategoryColor(category ?? (categoryId ? { id: categoryId } : null))
}

type CategoryNameSource = {
  name_de: string
  name_fr?: string | null
  name_it?: string | null
}

/** Localized category name with German fallback (same pattern as designations). */
export function getCategoryName(
  category: CategoryNameSource | null | undefined,
  lang?: string | null
): string {
  if (!category) return ''
  const l = normalizeLanguage(lang)
  if (l === 'fr') return category.name_fr || category.name_de
  if (l === 'it') return category.name_it || category.name_de
  return category.name_de
}
