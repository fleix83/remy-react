import type { DesignationLabels } from '../types/database.types'

/**
 * Content languages backed by DB columns (de/fr/it). The UI also supports 'en'
 * (i18next chrome), but there are no English designation/category columns, so
 * 'en' — like any unrecognized value — intentionally falls back to German here
 * until label_en/name_en exist.
 */
export type AppLanguage = 'de' | 'fr' | 'it'

export function normalizeLanguage(lang?: string | null): AppLanguage {
  return lang === 'fr' || lang === 'it' ? lang : 'de'
}

/** Pair-form label ("Psychiater:in") in the requested UI language, German fallback. */
export function getDesignationLabel(d: DesignationLabels, lang?: string | null): string {
  const l = normalizeLanguage(lang)
  if (l === 'fr') return d.label_fr || d.label_de
  if (l === 'it') return d.label_it || d.label_de
  return d.label_de
}

/**
 * Display label for a therapist: curated designation label when classified,
 * otherwise the verbatim full_title (unclassified imports), otherwise ''.
 */
export function therapistDesignationLabel(
  therapist: { full_title?: string | null; designations?: DesignationLabels | null },
  lang?: string | null
): string {
  if (therapist.designations) return getDesignationLabel(therapist.designations, lang)
  return therapist.full_title || ''
}

/**
 * Classify a scraped professional title against the curated designations.
 * keywords is a comma-separated list; matching is case-insensitive substring.
 * Designations are tried in sort_order (admins put more specific ones first).
 * Returns the matched designation id or null.
 */
export function matchDesignation(
  fullTitle: string,
  designations: Array<{ id: number; keywords: string | null; sort_order: number }>
): number | null {
  const title = fullTitle.toLowerCase()
  const sorted = [...designations].sort((a, b) => a.sort_order - b.sort_order)
  for (const d of sorted) {
    const keywords = (d.keywords || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
    if (keywords.some((k) => title.includes(k))) return d.id
  }
  return null
}
