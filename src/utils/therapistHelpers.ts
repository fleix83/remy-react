import type { Therapist, TherapistWithDesignation } from '../types/database.types'
import { therapistDesignationLabel } from './designationHelpers'

/**
 * Three kinds of therapist entries:
 * - person:             an individual therapist (no institution)
 * - person_institution: an individual working at an institution (e.g. clinic)
 * - institution:        an institution only, no personal name
 *
 * The type is derived from field presence — an entry with a personal name and
 * an institution IS a person-at-institution, one with only an institution IS
 * an institution. No extra DB column needed; institution-only rows store ''
 * in the NOT NULL name columns.
 */
export type TherapistEntryType = 'person' | 'person_institution' | 'institution'

export function getTherapistEntryType(
  t: Pick<Therapist, 'first_name' | 'last_name' | 'institution'>
): TherapistEntryType {
  const hasName = !!(t.first_name?.trim() || t.last_name?.trim())
  const hasInstitution = !!t.institution?.trim()
  if (hasInstitution) return hasName ? 'person_institution' : 'institution'
  return 'person'
}

/** Personal name ("Anrede Vorname Nachname"); '' for institution-only entries. */
export function formatTherapistPersonName(
  t: Pick<Therapist, 'form_of_address' | 'first_name' | 'last_name'>
): string {
  return [t.form_of_address, t.first_name, t.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * One-line therapist reference shown on posts ("Erfahrung mit …"):
 * - person:             "Frau Dr. Anna Muster, Psychiaterin"
 * - person_institution: "Frau Dr. Anna Muster bei Klinik X, Psychiaterin"
 * - institution:        "Klinik X, Psychiatrische Klinik, Rheinfelden AG"
 */
export function formatTherapistPostLine(
  t: TherapistWithDesignation,
  lang?: string | null
): string {
  const entryType = getTherapistEntryType(t)

  if (entryType === 'institution') {
    // Institutions show their verbatim official designation, not the curated
    // (person-oriented) designation labels.
    const official = t.full_title || therapistDesignationLabel(t, lang)
    const location = [t.city, t.canton].filter(Boolean).join(' ')
    return [t.institution, official, location].filter(Boolean).join(', ')
  }

  const personName = formatTherapistPersonName(t)
  const name = entryType === 'person_institution'
    ? `${personName} bei ${t.institution!.trim()}`
    : personName
  return [name, therapistDesignationLabel(t, lang)].filter(Boolean).join(', ')
}
