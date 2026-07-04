import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSeoContent } from '../../hooks/useSeoContent'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { resolvePageMeta, type SeoPageId } from '../../types/seo-content.types'
import { SITE_URL } from '../../constants/site'

interface SeoHeadProps {
  page: SeoPageId
  /** Optional dynamic title (e.g. a document title from the DB). */
  titleOverride?: string
  /** Canonical path override — use when the mounted route is not the page's canonical URL (e.g. the logged-out catch-all renders the landing at arbitrary paths). */
  path?: string
  /** Force a robots noindex regardless of CMS settings (e.g. not-found states). */
  noindex?: boolean
}

const OG_LOCALES: Record<string, string> = { de: 'de_CH', fr: 'fr_CH', it: 'it_CH', en: 'en_US' }

/**
 * Per-page head metadata. React 19 hoists <title>/<meta>/<link> rendered in
 * components into <head> — no head-manager library needed. Content comes from
 * the localized 'seo' CMS document with code defaults as instant fallback.
 *
 * Honest limitation: this runs client-side, so it reaches JS-rendering
 * crawlers (Googlebot). Non-JS crawlers see the baked index.html defaults
 * until prerendering lands (docs/PLAN-SEO-GEO.md Phase 2).
 */
const SeoHead: React.FC<SeoHeadProps> = ({ page, titleOverride, path: pathProp, noindex }) => {
  const { content } = useSeoContent()
  const { pathname } = useLocation()
  const lang = useActiveLanguage()
  const path = pathProp ?? pathname
  const meta = resolvePageMeta(content, page, SITE_URL, path)
  const title = titleOverride ?? meta.title

  // Baked index.html meta/og tags serve non-JS crawlers; once React hoists the
  // per-page tags, the baked ones are duplicates (and win by document order).
  useEffect(() => {
    document.head.querySelectorAll('[data-seo-static]').forEach((el) => el.remove())
  }, [])

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={content.social.siteName} />
      <meta property="og:locale" content={OG_LOCALES[lang] ?? 'de_CH'} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:image" content={meta.ogImage} />
      {(meta.noindex || noindex) && <meta name="robots" content="noindex" />}
    </>
  )
}

export default SeoHead
