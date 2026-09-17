import { describe, it, expect } from 'vitest'
import { TherapistImportService } from './therapist-import.service'
import type { Designation } from '../types/database.types'

const designation = (id: number, slug: string, keywords: string | null, sort_order: number): Designation => ({
  id,
  slug,
  label_de: slug,
  label_fr: '',
  label_it: '',
  keywords,
  sort_order,
  is_active: true,
  created_at: null
})

const designations = [
  designation(1, 'psychiater', 'FMH, Psychiat, psychiatre, psichiatr', 10),
  designation(2, 'psychologe', 'FSP, Psycholog, psychologue, psicolog', 20),
  designation(3, 'psychotherapeut', 'Psychotherapeut, Psychotherapie, psychothérapeute, psicoterapeut', 30)
]

const service = new TherapistImportService()

// Row shape as produced by the real scraper CSV (place_therapists.csv)
const csvRow = {
  canton: 'ZH',
  city: 'Zürich',
  form_of_address: 'Dr. med.',
  first_name: 'Mona',
  last_name: 'Beispiel',
  designation: 'Psychiatrie und Psychotherapie FMH',
  short_designation: '',
  institution: '',
  services: 'Einzeltherapie und Paartherapie bei Angststörungen',
  description: 'Schwerpunkt kognitive Verhaltenstherapie',
  languages: 'Deutsch, Englisch',
  gender: 'weiblich'
}

describe('parseTherapist', () => {
  it('maps the scraper CSV columns onto existing therapist columns', () => {
    const parsed = service.parseTherapist(csvRow, designations)
    expect(parsed.full_title).toBe('Psychiatrie und Psychotherapie FMH')
    expect(parsed.services).toBe('Einzeltherapie und Paartherapie bei Angststörungen')
    // therapists has no description column — CSV description maps to specialty
    expect(parsed.specialty).toBe('Schwerpunkt kognitive Verhaltenstherapie')
    expect(parsed).not.toHaveProperty('description')
  })

  it('classifies via keywords and clears the review flag on a match', () => {
    const parsed = service.parseTherapist(csvRow, designations)
    expect(parsed.designation_id).toBe(1) // FMH/Psychiat wins by sort_order
    expect(parsed.needs_review).toBe(false)
  })

  it('flags unmatched titles for review', () => {
    const parsed = service.parseTherapist({ ...csvRow, designation: 'Heilpraktiker' }, designations)
    expect(parsed.designation_id).toBeNull()
    expect(parsed.needs_review).toBe(true)
  })

  it.each([
    ['weiblich', 'f'],
    ['männlich', 'm'],
    ['w', 'f'],
    ['F', 'f'],
    ['M', 'm'],
    ['Frau', 'f']
  ])('normalizes CSV gender %s to %s', (input, expected) => {
    const parsed = service.parseTherapist({ ...csvRow, gender: input }, designations)
    expect(parsed.gender).toBe(expected)
  })

  it('falls back to keyword detection when the gender column is empty or unknown', () => {
    const parsed = service.parseTherapist(
      { ...csvRow, gender: '', designation: 'Fachpsychologin für Psychotherapie FSP' },
      designations
    )
    expect(parsed.gender).toBe('f') // detectGender: "fachpsychologin"
  })
})

describe('getDuplicateKey', () => {
  it('ignores casing and surrounding/doubled whitespace', () => {
    const a = service.getDuplicateKey({ first_name: 'Mona', last_name: 'Beispiel', canton: 'ZH', institution: null })
    const b = service.getDuplicateKey({ first_name: '  mona ', last_name: 'BEISPIEL', canton: 'zh ', institution: null })
    expect(a).toBe(b)
    const c = service.getDuplicateKey({ first_name: '', last_name: '', canton: 'ZH', institution: 'Klinik  Am   See' })
    const d = service.getDuplicateKey({ first_name: '', last_name: '', canton: 'ZH', institution: 'klinik am see' })
    expect(c).toBe(d)
    expect(c.startsWith('inst:')).toBe(true)
  })

  it('treats the same person in another canton as a different entry', () => {
    const zh = service.getDuplicateKey({ first_name: 'Mona', last_name: 'Beispiel', canton: 'ZH', institution: null })
    const be = service.getDuplicateKey({ first_name: 'Mona', last_name: 'Beispiel', canton: 'BE', institution: null })
    expect(zh).not.toBe(be)
  })
})

describe('filterAgainstExisting', () => {
  const parsed = [
    service.parseTherapist(csvRow, designations),
    service.parseTherapist({ ...csvRow, first_name: 'Egon', last_name: 'Freud' }, designations),
    service.parseTherapist({ ...csvRow, first_name: '', last_name: '', institution: 'Klinik Am See' }, designations)
  ]

  it('skips rows whose identity already exists in the database, never updating them', () => {
    const existing = [
      // same person, different casing/whitespace and richer data in the DB
      { first_name: ' mona', last_name: 'beispiel ', canton: 'ZH', institution: null },
      { first_name: '', last_name: '', canton: 'zh', institution: 'KLINIK AM SEE' }
    ]
    const { therapists, skipped } = service.filterAgainstExisting(parsed, existing)
    expect(skipped).toBe(2)
    expect(therapists.map((t) => t.last_name)).toEqual(['Freud'])
  })

  it('keeps everything when the database has no matching rows', () => {
    const existing = [{ first_name: 'Mona', last_name: 'Beispiel', canton: 'BE', institution: null }]
    const { therapists, skipped } = service.filterAgainstExisting(parsed, existing)
    expect(skipped).toBe(0)
    expect(therapists).toHaveLength(3)
  })
})
