import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'

export const SUPPORTED_LNGS = ['de', 'fr', 'it', 'en'] as const
export type AppLng = (typeof SUPPORTED_LNGS)[number]

// Feature namespaces — one bundle per feature, mirroring the lazy() routes.
export const NAMESPACES = [
  'common', 'auth', 'forum', 'therapist', 'messaging', 'profile', 'admin',
] as const

// Resolves when the initial language + 'common' namespace are loaded.
// Import this if you ever need to await i18n readiness before rendering.
export const i18nReady = i18n
  // Lazy-load each (language, namespace) as its own hashed chunk.
  // ⚠️ This import() path MUST stay an inline static template literal —
  // abstracting it into a variable/helper stops Rollup enumerating the
  // chunks and silently breaks code-splitting.
  .use(resourcesToBackend(
    (language: string, namespace: string) =>
      import(`./locales/${language}/${namespace}.json`),
  ))
  // Detect from ?lng=, then our cached choice, then the browser.
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // German is the SOURCE language: any untranslated key renders German,
    // never a raw key or English. This is what makes incremental rollout safe.
    fallbackLng: 'de',
    supportedLngs: SUPPORTED_LNGS,
    // Collapse de-CH / fr-CH / it-CH onto the base language.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,

    ns: ['common'],          // the always-on chrome namespace
    defaultNS: 'common',
    fallbackNS: 'common',
    // Eagerly load 'common' for every language so switching the menu is
    // instant (no Suspense flicker). 'common' is tiny; feature namespaces
    // (forum, auth, …) still lazy-load per language on demand.
    preload: ['de', 'fr', 'it', 'en'],

    interpolation: {
      // React already escapes JSX; i18next escaping would double-encode
      // "&" and umlauts in attributes. Must be false in a React app.
      escapeValue: false,
    },

    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'remy_lng',
      caches: ['localStorage'], // returning users get the right bundle pre-auth → no flash
    },

    react: {
      useSuspense: true,        // main.tsx provides the top-level boundary
    },
  })

export default i18n
