// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Document } from '../../types/database.types'

// RTL's auto-cleanup only self-registers with vitest's `test.globals: true`,
// which this repo's vite.config.ts does not set. Without it, a previous
// test's mounted tree (and its hoisted <title>) survives into the next
// render — see SeoHead.test.tsx for the same note.
afterEach(cleanup)

// vi.hoisted so this is initialized before the vi.mock factory below runs
// (vi.mock calls are hoisted to the top of the file; a plain `vi.fn()` const
// declared after them would still be in the temporal dead zone when the
// factory executes on import).
const getDocumentBySlug = vi.hoisted(() => vi.fn())
vi.mock('../../services/documents.service', () => ({
  DocumentsService: class { getDocumentBySlug = getDocumentBySlug },
}))
// SeoHead inside the page fetches the 'seo' CMS doc — keep that offline too.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

import StaticDocumentPage from './StaticDocumentPage'

const DOC: Document = {
  id: 'x', slug: 'impressum', title: 'Impressum',
  lead_text: 'Lead-Text', published: true, locale: 'de',
  created_at: '', updated_at: '',
  sections: [{ number: 1, title: 'Verantwortlich', content: 'Remy Initiative', examples: [] }],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/impressum']}>
        <StaticDocumentPage slug="impressum" page="impressum" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => getDocumentBySlug.mockReset())

describe('StaticDocumentPage', () => {
  it('renders title, lead and sections from the document', async () => {
    getDocumentBySlug.mockResolvedValue(DOC)
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Impressum' })).toBeTruthy()
    expect(screen.getByText('Lead-Text')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Verantwortlich' })).toBeTruthy()
    expect(screen.getByText('Remy Initiative')).toBeTruthy()
  })

  it('uses the document title as the page <title>', async () => {
    getDocumentBySlug.mockResolvedValue(DOC)
    renderPage()
    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelector('title')?.textContent).toBe('Impressum')
  })

  it('renders a not-found state when the document is missing', async () => {
    getDocumentBySlug.mockResolvedValue(null)
    renderPage()
    expect(await screen.findByText('Seite nicht gefunden')).toBeTruthy()
  })
})
