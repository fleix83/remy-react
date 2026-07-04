import { describe, it, expect } from 'vitest'
import { DEFAULT_SEO_CONTENT, resolvePageMeta, type SeoPageId } from './seo-content.types'

describe('DEFAULT_SEO_CONTENT', () => {
  it('has non-empty German title and description for every page', () => {
    const pages = Object.keys(DEFAULT_SEO_CONTENT.pages) as SeoPageId[]
    expect(pages.sort()).toEqual(['about', 'communityGuidelines', 'datenschutz', 'impressum', 'landing'])
    for (const p of pages) {
      expect(DEFAULT_SEO_CONTENT.pages[p].title.length).toBeGreaterThan(5)
      expect(DEFAULT_SEO_CONTENT.pages[p].description.length).toBeGreaterThan(30)
    }
  })
})

describe('resolvePageMeta', () => {
  it('builds an absolute self-canonical from site URL + path', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'impressum', 'https://remyforum.ch', '/impressum')
    expect(meta.canonical).toBe('https://remyforum.ch/impressum')
  })

  it('tolerates a trailing slash on the site URL', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'landing', 'https://remyforum.ch/', '/')
    expect(meta.canonical).toBe('https://remyforum.ch/')
  })

  it('falls back to the social default OG image and makes it absolute', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'about', 'https://remyforum.ch', '/about')
    expect(meta.ogImage).toBe('https://remyforum.ch/images/logo_claim.png')
  })

  it('keeps an already-absolute page OG image untouched and defaults noindex to false', () => {
    const content = structuredClone(DEFAULT_SEO_CONTENT)
    content.pages.about.ogImage = 'https://cdn.example.org/x.png'
    const meta = resolvePageMeta(content, 'about', 'https://remyforum.ch', '/about')
    expect(meta.ogImage).toBe('https://cdn.example.org/x.png')
    expect(meta.noindex).toBe(false)
  })
})
