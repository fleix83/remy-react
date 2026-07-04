import { useContentDocument, type ContentDocument } from './useSiteContent'
import { DEFAULT_SEO_CONTENT, type SeoContent } from '../types/seo-content.types'

/** SEO metadata document ('seo' in site_content) — defaults instantly, DB overrides when fetched. */
export function useSeoContent(lng?: string): ContentDocument<SeoContent> {
  return useContentDocument<SeoContent>('seo', DEFAULT_SEO_CONTENT, lng)
}
