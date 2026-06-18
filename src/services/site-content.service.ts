import { supabase } from '../lib/supabase'
import type { Json } from '../types/database.types'

/**
 * Deep-merge a stored override (from the `site_content.value` JSONB) over a
 * typed defaults object.
 *
 * Rules:
 * - Only keys present in `defaults` are considered (stray keys in the DB row
 *   are ignored), so the shape is always the typed one.
 * - Plain objects are merged recursively.
 * - Arrays and primitives are replaced wholesale by the override when present.
 * - A missing (`undefined`) or `null` override falls back to the default value.
 *
 * This is what guarantees the landing page never breaks: an old or partial DB
 * row still renders, with defaults filling any gaps.
 */
export function deepMerge<T>(defaults: T, override: unknown): T {
  if (override === undefined || override === null) return defaults
  if (!isPlainObject(defaults) || !isPlainObject(override)) {
    return override as T
  }

  const result: Record<string, unknown> = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const overrideValue = (override as Record<string, unknown>)[key]
    if (overrideValue === undefined) continue
    result[key] = deepMerge((defaults as Record<string, unknown>)[key], overrideValue)
  }
  return result as T
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const CONTENT_LANGS = ['de', 'fr', 'it', 'en'] as const

/**
 * A stored value is "localized" when it's keyed by language (de/fr/it/en) rather
 * than holding content fields directly. Legacy rows written before i18n hold the
 * content object directly and are NOT localized — they are treated as German.
 */
export function isLocalized(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && CONTENT_LANGS.some((l) => l in value)
}

/**
 * Pick the content branch for a language, with fallback:
 *   requested language → German → (legacy) the raw value itself.
 * Returns `undefined` when there is nothing usable (so defaults take over).
 */
export function localizedBranch(value: unknown, lng: string): unknown {
  if (!isPlainObject(value)) return undefined
  if (!isLocalized(value)) return value // legacy un-wrapped row = the German content
  return value[lng] ?? value.de
}

/**
 * Access layer for the `site_content` table — named CMS content documents.
 * Each document (e.g. 'landing', 'footer') is one row whose `value` JSONB holds
 * a structured content object. Code defaults are the canonical fallback; the row
 * stores admin overrides only.
 */
export class SiteContentService {
  /**
   * Fetch a content document and merge stored overrides over `defaults`.
   * Returns `defaults` unchanged if the row is missing or the fetch fails, so a
   * read error never breaks the page.
   */
  async getContent<T>(key: string, defaults: T, lng: string = 'de'): Promise<T> {
    const { data, error } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error) {
      console.error(`❌ SiteContentService: error fetching '${key}':`, error)
      return defaults
    }
    if (!data) return defaults

    // Merge the requested language's branch (with German/legacy fallback) over
    // the code defaults, so an untranslated language renders German.
    return deepMerge(defaults, localizedBranch(data.value, lng))
  }

  /**
   * Upsert one language's branch of a content document (admin only — RLS).
   *
   * Reads the current raw row first and updates only `value[lng]`, so other
   * languages are never clobbered. A legacy un-wrapped (German) row is migrated
   * into the `de` branch on first save — lazy, non-destructive, no migration
   * step. Records who/when via `updated_by` / `updated_at`.
   */
  async saveContent<T>(key: string, lng: string, value: T): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()

    const { data: existing } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    const raw = existing?.value
    const wrapped: Record<string, unknown> = isLocalized(raw)
      ? { ...raw }
      : isPlainObject(raw)
        ? { de: raw } // migrate legacy German content into the de branch
        : {}
    wrapped[lng] = value as unknown

    const { error } = await supabase
      .from('site_content')
      .upsert(
        {
          key,
          value: wrapped as unknown as Json,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id ?? null,
        },
        { onConflict: 'key' }
      )

    if (error) {
      console.error(`❌ SiteContentService: error saving '${key}':`, error)
      throw error
    }
  }
}
