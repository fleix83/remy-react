/**
 * Editable SEO metadata for the public pages.
 *
 * Same CMS pattern as landing-content.types.ts: these DEFAULT_* constants are
 * the canonical fallback, rendered instantly; the `site_content` row with key
 * 'seo' stores admin overrides only (localized de/fr/it/en, German fallback).
 */

export type SeoPageId = 'landing' | 'about' | 'impressum' | 'datenschutz' | 'communityGuidelines'

export interface PageMeta {
  title: string
  description: string
  /** Absolute URL or site-relative path; falls back to social.defaultOgImage. */
  ogImage?: string
  noindex?: boolean
}

export interface SeoContent {
  pages: Record<SeoPageId, PageMeta>
  social: {
    siteName: string
    defaultOgImage: string
  }
}

export const DEFAULT_SEO_CONTENT: SeoContent = {
  pages: {
    landing: {
      title: 'Remy – Forum für Menschen in Psychotherapie',
      description:
        'Auf Remy tauschst du dich anonym über deine Erfahrungen in der Psychotherapie aus – sicher, moderiert und unabhängig. Eine Patienteninitiative für die Schweiz.',
    },
    about: {
      title: 'Über Remy – die Patienteninitiative',
      description:
        'Was Remy ist, wie das Forum moderiert wird und warum es Remy braucht: die unabhängige Patienteninitiative für Menschen in Psychotherapie in der Schweiz.',
    },
    impressum: {
      title: 'Impressum – Remy',
      description:
        'Impressum und Kontaktangaben von Remy, dem Schweizer Forum für Menschen in Psychotherapie.',
    },
    datenschutz: {
      title: 'Datenschutz – Remy',
      description:
        'Datenschutzerklärung von Remy: welche Daten wir speichern, wie wir sie schützen und welche Rechte du hast.',
    },
    communityGuidelines: {
      title: 'Community Guidelines – Remy',
      description:
        'Die Spielregeln des Remy-Forums: respektvoller Austausch, Anonymität und der Umgang mit Erfahrungsberichten über Therapeut:innen.',
    },
  },
  social: {
    siteName: 'Remy',
    defaultOgImage: '/images/logo_claim.png',
  },
}

export interface ResolvedPageMeta {
  title: string
  description: string
  canonical: string
  ogImage: string
  noindex: boolean
}

/** Merge page meta with social defaults and absolutize URLs for rendering. */
export function resolvePageMeta(
  content: SeoContent,
  page: SeoPageId,
  siteUrl: string,
  path: string
): ResolvedPageMeta {
  const p = content.pages[page]
  const base = siteUrl.replace(/\/+$/, '')
  const ogImage = p.ogImage ?? content.social.defaultOgImage
  return {
    title: p.title,
    description: p.description,
    canonical: `${base}${path}`,
    ogImage: ogImage.startsWith('http') ? ogImage : `${base}${ogImage}`,
    noindex: p.noindex === true,
  }
}
