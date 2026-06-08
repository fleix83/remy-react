import { describe, it, expect } from 'vitest'
import { deepMerge } from './site-content.service'
import { DEFAULT_LANDING_CONTENT } from '../types/landing-content.types'

describe('deepMerge', () => {
  it('returns defaults unchanged when override is an empty object', () => {
    expect(deepMerge(DEFAULT_LANDING_CONTENT, {})).toEqual(DEFAULT_LANDING_CONTENT)
  })

  it('returns defaults when override is null/undefined-ish', () => {
    expect(deepMerge(DEFAULT_LANDING_CONTENT, null)).toEqual(DEFAULT_LANDING_CONTENT)
    expect(deepMerge(DEFAULT_LANDING_CONTENT, undefined)).toEqual(DEFAULT_LANDING_CONTENT)
  })

  it('overrides only the provided nested keys, keeping the rest as defaults', () => {
    const merged = deepMerge(DEFAULT_LANDING_CONTENT, {
      hero: { ctaLabel: 'Mitmachen' },
    })
    expect(merged.hero.ctaLabel).toBe('Mitmachen')
    // Sibling fields untouched
    expect(merged.hero.registerSubmit).toBe(DEFAULT_LANDING_CONTENT.hero.registerSubmit)
    // Other sections untouched
    expect(merged.badges).toEqual(DEFAULT_LANDING_CONTENT.badges)
  })

  it('replaces arrays wholesale (does not element-merge)', () => {
    const merged = deepMerge(DEFAULT_LANDING_CONTENT, {
      features: [{ title: 'A', lead: 'a' }],
      about: { paragraphs: ['only one'] },
    })
    expect(merged.features).toEqual([{ title: 'A', lead: 'a' }])
    expect(merged.about.paragraphs).toEqual(['only one'])
  })

  it('ignores stray keys not present in defaults', () => {
    const merged = deepMerge(DEFAULT_LANDING_CONTENT, {
      hero: { ctaLabel: 'X', bogus: 'nope' },
      legacySection: { foo: 'bar' },
    } as unknown) as typeof DEFAULT_LANDING_CONTENT
    expect((merged.hero as unknown as Record<string, unknown>).bogus).toBeUndefined()
    expect((merged as unknown as Record<string, unknown>).legacySection).toBeUndefined()
  })

  it('does not mutate the defaults object', () => {
    const snapshot = JSON.parse(JSON.stringify(DEFAULT_LANDING_CONTENT))
    deepMerge(DEFAULT_LANDING_CONTENT, { hero: { ctaLabel: 'changed' } })
    expect(DEFAULT_LANDING_CONTENT).toEqual(snapshot)
  })
})
