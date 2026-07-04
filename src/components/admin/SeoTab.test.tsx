// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Keep the test offline: the real service would query Supabase over the network.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

import SeoTab from './SeoTab'
import { DEFAULT_SEO_CONTENT } from '../../types/seo-content.types'

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SeoTab />
    </QueryClientProvider>
  )
}

describe('SeoTab', () => {
  afterEach(cleanup)

  it('shows the meta editor with the default landing title', async () => {
    renderTab()
    const input = await screen.findByDisplayValue(DEFAULT_SEO_CONTENT.pages.landing.title)
    expect(input).toBeTruthy()
  })

  it('switches to the status panel via the rail', async () => {
    renderTab()
    await screen.findByDisplayValue(DEFAULT_SEO_CONTENT.pages.landing.title)
    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    expect(await screen.findByText(/robots\.txt/)).toBeTruthy()
  })
})
