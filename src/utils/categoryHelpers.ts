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
 * Mix a hex color with white. `whiteAmount` is the white fraction, so 0.75
 * yields 75% white + 25% of the original. Non-hex inputs returned unchanged.
 */
export function mixWithWhite(color: string, whiteAmount: number): string {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return color
  let hex = match[1]
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const w = Math.max(0, Math.min(1, whiteAmount))
  const mix = (channel: number) => Math.round(channel * (1 - w) + 255 * w)
  const r = mix(parseInt(hex.slice(0, 2), 16))
  const g = mix(parseInt(hex.slice(2, 4), 16))
  const b = mix(parseInt(hex.slice(4, 6), 16))
  const toHex = (x: number) => x.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
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
  name_en?: string | null
}

/**
 * Localized category name with German fallback. Categories carry all four UI
 * languages (DE/FR/IT/EN), so 'en' is honored here rather than collapsing to
 * German.
 */
export function getCategoryName(
  category: CategoryNameSource | null | undefined,
  lang?: string | null
): string {
  if (!category) return ''
  const l = (lang || 'de').split('-')[0]
  if (l === 'fr') return category.name_fr || category.name_de
  if (l === 'it') return category.name_it || category.name_de
  if (l === 'en') return category.name_en || category.name_de
  return category.name_de
}

type CategoryDescriptionSource = {
  description_de?: string | null
  description_fr?: string | null
  description_it?: string | null
  description_en?: string | null
}

/**
 * Localized category explainer (description-panel copy) with German fallback.
 * Unlike names, descriptions exist in all four UI languages, so 'en' is honored
 * here rather than collapsing to German.
 */
export function getCategoryDescription(
  category: CategoryDescriptionSource | null | undefined,
  lang?: string | null
): string {
  if (!category) return ''
  const l = (lang || 'de').split('-')[0]
  if (l === 'fr') return category.description_fr || category.description_de || ''
  if (l === 'it') return category.description_it || category.description_de || ''
  if (l === 'en') return category.description_en || category.description_de || ''
  return category.description_de || ''
}
