import type { Therapist } from '../types/database.types'

/**
 * Format therapist information for post titles in "Erfahrung" posts
 * Format: "Title firstname lastname designation, institution (if) and canton"
 */
export function formatTherapistForTitle(therapist: Therapist): string {
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
  
  // Add designation
  if (therapist.designation) {
    descriptionParts.push(therapist.designation)
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
export function getExperiencePostTitle(therapist: Therapist): string {
  return `Erfahrung mit ${formatTherapistForTitle(therapist)}`
}

/**
 * Check if a post should use the therapist-based title
 */
export function shouldUseTherapistTitle(categoryId: number, therapist?: Therapist | null): boolean {
  return categoryId === 1 && !!therapist
}

/**
 * Get the display title for a post (either original title or therapist-based)
 */
export function getPostDisplayTitle(post: { 
  title: string
  category_id: number
  therapists?: Therapist | null 
}): string {
  if (shouldUseTherapistTitle(post.category_id, post.therapists)) {
    return getExperiencePostTitle(post.therapists!)
  }
  return post.title
}