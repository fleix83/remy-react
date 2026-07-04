// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// RTL's auto-cleanup only self-registers when `afterEach` is a global (i.e.
// vitest's `test.globals: true`), which this repo's vite.config.ts does not
// set. Without it, React 19's hoisted <title>/<meta>/<link> elements from one
// test's render survive into the next, and document.querySelector matches the
// stale (first) element instead of the current render's.
afterEach(cleanup)

// Keep the test offline: the real service would query Supabase over the network.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

// Pin SITE_URL to the production origin. The repo's committed `.env` sets
// VITE_SITE_URL=http://localhost:5173 for an unrelated purpose (auth-redirect
// URLs in auth.store.ts), and Vite loads that base `.env` regardless of mode
// (including `vitest run`), which would otherwise leak the dev URL into the
// canonical/OG assertions below.
vi.mock('../../constants/site', () => ({
  SITE_URL: 'https://remyforum.ch',
}))

import SeoHead from './SeoHead'
import { DEFAULT_SEO_CONTENT } from '../../types/seo-content.types'

function renderHead(path: string, page: Parameters<typeof SeoHead>[0]['page']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <SeoHead page={page} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SeoHead', () => {
  it('renders the default title and description for the landing page', () => {
    renderHead('/', 'landing')
    // React 19 hoists <title>/<meta> into <head>; query the whole document.
    expect(document.querySelector('title')?.textContent).toBe(DEFAULT_SEO_CONTENT.pages.landing.title)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      DEFAULT_SEO_CONTENT.pages.landing.description
    )
  })

  it('renders an absolute self-canonical for the current path', () => {
    renderHead('/impressum', 'impressum')
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')
    expect(canonical).toBe('https://remyforum.ch/impressum')
  })

  it('renders OG tags with an absolute image URL', () => {
    renderHead('/about', 'about')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      DEFAULT_SEO_CONTENT.pages.about.title
    )
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/^https:\/\//)
  })

  it('emits no robots meta unless noindex is set', () => {
    renderHead('/', 'landing')
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })
})
