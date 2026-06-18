import { de, fr, it, enGB } from 'date-fns/locale'

/**
 * Active UI language → BCP-47 locale for Intl date/number formatting.
 * Swiss regional variants so dates read naturally (dd.mm.yyyy etc.).
 * Pass the value from useActiveLanguage().
 */
export function intlLocale(lang?: string | null): string {
  switch ((lang || 'de').split('-')[0]) {
    case 'fr': return 'fr-CH'
    case 'it': return 'it-CH'
    case 'en': return 'en-GB'
    default: return 'de-CH'
  }
}

/**
 * Active UI language → date-fns Locale (for react-day-picker and date-fns
 * format()). Locales are bundled in the existing 'date' chunk.
 */
export function dateFnsLocale(lang?: string | null) {
  switch ((lang || 'de').split('-')[0]) {
    case 'fr': return fr
    case 'it': return it
    case 'en': return enGB
    default: return de
  }
}
