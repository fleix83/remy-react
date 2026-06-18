import { useTranslation } from 'react-i18next'

/**
 * Reactive active UI language ('de' | 'fr' | 'it' | 'en'), re-rendering the
 * caller whenever the language is switched. Feed this to content helpers
 * (getCategoryName / getDesignationLabel / therapistDesignationLabel) so the
 * DB-backed labels follow the same active language as the i18next chrome.
 *
 * Languages without content columns (currently 'en') fall back to German
 * inside those helpers — see normalizeLanguage().
 */
export function useActiveLanguage(): string {
  const { i18n } = useTranslation()
  // Use the SELECTED language (base, region stripped) — NOT resolvedLanguage.
  // resolvedLanguage returns the first language with non-empty loaded
  // translations, so while fr/it/en bundles are still empty it wrongly reports
  // 'de'. i18n.language reflects the user's actual choice.
  return (i18n.language || 'de').split('-')[0]
}
