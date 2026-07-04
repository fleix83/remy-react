import React from 'react'
import { useLocation } from 'react-router-dom'
import { useSeoContent } from '../../hooks/useSeoContent'
import { resolvePageMeta, type SeoPageId } from '../../types/seo-content.types'
import { SITE_URL } from '../../constants/site'

interface SeoHeadProps {
  page: SeoPageId
  /** Optional dynamic title (e.g. a document title from the DB). */
  titleOverride?: string
}

/**
 * Per-page head metadata. React 19 hoists <title>/<meta>/<link> rendered in
 * components into <head> — no head-manager library needed. Content comes from
 * the localized 'seo' CMS document with code defaults as instant fallback.
 *
 * Honest limitation: this runs client-side, so it reaches JS-rendering
 * crawlers (Googlebot). Non-JS crawlers see the baked index.html defaults
 * until prerendering lands (docs/PLAN-SEO-GEO.md Phase 2).
 */
const SeoHead: React.FC<SeoHeadProps> = ({ page, titleOverride }) => {
  const { content } = useSeoContent()
  const { pathname } = useLocation()
  const meta = resolvePageMeta(content, page, SITE_URL, pathname)
  const title = titleOverride ?? meta.title

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={content.social.siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:image" content={meta.ogImage} />
      {meta.noindex && <meta name="robots" content="noindex" />}
    </>
  )
}

export default SeoHead
