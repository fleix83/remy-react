/**
 * Canonical public origin, used for absolute canonical/OG URLs.
 * Set per environment via VITE_SITE_URL (.env.production = https://remyforum.ch).
 * Staging builds are noindexed at the CI level, so their canonicals are moot.
 */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || 'https://remyforum.ch'
