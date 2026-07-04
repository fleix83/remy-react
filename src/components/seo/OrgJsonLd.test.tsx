// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Pin SITE_URL to the production origin (see SeoHead.test.tsx for context).
vi.mock('../../constants/site', () => ({
  SITE_URL: 'https://remyforum.ch',
}))

import OrgJsonLd from './OrgJsonLd'

describe('OrgJsonLd', () => {
  it('renders valid JSON-LD with Organization and WebSite entities', () => {
    const { container } = render(<OrgJsonLd />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script!.textContent || '')
    expect(data['@context']).toBe('https://schema.org')
    const types = data['@graph'].map((e: { '@type': string }) => e['@type'])
    expect(types).toEqual(['Organization', 'WebSite'])
    for (const entity of data['@graph']) {
      expect(entity.url).toMatch(/^https:\/\//)
    }
  })
})
