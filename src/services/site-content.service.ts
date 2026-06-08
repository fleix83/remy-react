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
  async getContent<T>(key: string, defaults: T): Promise<T> {
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

    return deepMerge(defaults, data.value)
  }

  /**
   * Upsert a content document (admin only — enforced by RLS).
   * Stores the full object; records who/when via `updated_by` / `updated_at`.
   */
  async saveContent<T>(key: string, value: T): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('site_content')
      .upsert(
        {
          key,
          value: value as unknown as Json,
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
