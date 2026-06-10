import type { Therapist, TherapistWithDesignation } from '../types/database.types'
import { therapistDesignationLabel } from './designationHelpers'

/**
 * Format therapist information for post titles in "Erfahrung" posts
 * Format: "Title firstname lastname designation, institution (if) and canton"
 */
export function formatTherapistForTitle(therapist: TherapistWithDesignation): string {
  const nameParts = []
  
  // Add form of address if available
  if (therapist.form_of_address) {
    nameParts.push(therapist.form_of_address)
  }
  
  // Add first and last name
  nameParts.push(therapist.first_name)
  nameParts.push(therapist.last_name)
  
  const fullName = nameParts.join(' ')
  
  // Build the description parts
  const descriptionParts = []

  // Add designation (curated label when classified, else verbatim full_title)
  const designation = therapistDesignationLabel(therapist)
  if (designation) {
    descriptionParts.push(designation)
  }

  // Add institution if available
  if (therapist.institution) {
    descriptionParts.push(therapist.institution)
  }
  
  // Combine name with description and canton
  let result = fullName
  
  if (descriptionParts.length > 0) {
    result += ` ${descriptionParts.join(', ')}`
  }
  
  // Add canton at the end
  if (therapist.canton) {
    result += ` und ${therapist.canton}`
  }
  
  return result
}

/**
 * Generate the complete title for "Erfahrung" posts
 */
export function getExperiencePostTitle(therapist: TherapistWithDesignation): string {
  return `Erfahrung mit ${formatTherapistForTitle(therapist)}`
}

/**
 * Check if a post should use the therapist-based title
 * @deprecated No longer auto-generating titles. All posts now have regular titles.
 */
export function shouldUseTherapistTitle(_therapist?: Therapist | null): boolean {
  return false // Always return false - no longer auto-generating titles
}

/**
 * Get the display title for a post
 * @deprecated Use post.title directly instead
 */
export function getPostDisplayTitle(post: {
  title: string
  category_id: number
  therapists?: Therapist | null
}): string {
  return post.title
}