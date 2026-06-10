import { describe, it, expect } from 'vitest'
import { matchDesignation, getDesignationLabel, therapistDesignationLabel } from './designationHelpers'

const matchSet = [
  { id: 1, keywords: 'FMH, Psychiat, psychiatre', sort_order: 10 },
  { id: 2, keywords: 'FSP, Psycholog', sort_order: 20 },
  { id: 3, keywords: 'Psychotherapeut', sort_order: 30 },
  { id: 4, keywords: 'Klinik', sort_order: 40 },
  { id: 6, keywords: null, sort_order: 60 }
]

describe('matchDesignation', () => {
  it('matches a simple keyword case-insensitively', () => {
    expect(matchDesignation('eidg. anerkannter PSYCHOTHERAPEUT', matchSet)).toBe(3)
  })

  it('prefers lower sort_order when multiple designations match', () => {
    // contains both "Psychiat" (10) and "Psychotherapeut" (30)
    expect(matchDesignation('Facharzt für Psychiatrie und Psychotherapie FMH', matchSet)).toBe(1)
  })

  it('matches FSP titles to psychologe before psychotherapeut', () => {
    expect(matchDesignation('Fachpsychologin für Psychotherapie FSP', matchSet)).toBe(2)
  })

  it('returns null when nothing matches', () => {
    expect(matchDesignation('Heilpraktiker', matchSet)).toBeNull()
  })

  it('ignores empty/null keyword lists and blank entries', () => {
    expect(matchDesignation('whatever', [{ id: 9, keywords: ' , ,', sort_order: 1 }])).toBeNull()
  })

  it('does not mutate the input array order', () => {
    const input = [...matchSet].reverse()
    matchDesignation('Klinik am See', input)
    expect(input[0].id).toBe(6)
  })

  it('returns null for an empty title string', () => {
    expect(matchDesignation('', matchSet)).toBeNull()
  })
})

const labels = { id: 1, slug: 'psychiater', label_de: 'Psychiater:in', label_fr: 'Psychiatre', label_it: 'Psichiatra' }

describe('getDesignationLabel', () => {
  it('returns the German label by default', () => {
    expect(getDesignationLabel(labels)).toBe('Psychiater:in')
  })
  it('returns the requested language', () => {
    expect(getDesignationLabel(labels, 'fr')).toBe('Psychiatre')
    expect(getDesignationLabel(labels, 'it')).toBe('Psichiatra')
  })
  it('falls back to German when the language label is empty', () => {
    expect(getDesignationLabel({ ...labels, label_fr: '' }, 'fr')).toBe('Psychiater:in')
  })
  it('normalizes unknown languages to German', () => {
    expect(getDesignationLabel(labels, 'en')).toBe('Psychiater:in')
    expect(getDesignationLabel(labels, null)).toBe('Psychiater:in')
  })
})

describe('therapistDesignationLabel', () => {
  it('uses the curated label when the relation is embedded', () => {
    expect(therapistDesignationLabel({ full_title: 'Facharzt FMH', designations: labels })).toBe('Psychiater:in')
  })
  it('forwards the language to the label lookup', () => {
    expect(therapistDesignationLabel({ full_title: 'Facharzt FMH', designations: labels }, 'fr')).toBe('Psychiatre')
  })
  it('falls back to full_title for unclassified therapists', () => {
    expect(therapistDesignationLabel({ full_title: 'Facharzt FMH', designations: null })).toBe('Facharzt FMH')
  })
  it('returns empty string when nothing is available', () => {
    expect(therapistDesignationLabel({ full_title: null })).toBe('')
  })
})
