/**
 * Canonical public origin, used for absolute canonical/OG URLs.
 * Set per environment via VITE_SITE_URL (.env.production = https://remyforum.ch).
 * Staging builds are noindexed at the CI level, so their canonicals are moot.
 * `VITE_SITE_URL` is also used for Supabase auth redirect URLs in
 * src/stores/auth.store.ts — both uses want the public origin; keep them in
 * sync if that ever changes.
 */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || 'https://remyforum.ch'
