import { stringSimilarity } from 'string-similarity-js'
import { DesignationsService } from './designations.service'
import type { Designation } from '../types/database.types'

/**
 * Service for matching therapist designations to the central designations table
 * Uses fuzzy matching across all 12 language fields to find the best match
 */
export class DesignationMatchingService {
  private designationsService = new DesignationsService()
  private readonly SIMILARITY_THRESHOLD = 0.8 // 80% similarity required
  private designationsCache: Designation[] | null = null

  /**
   * Load designations into cache (call before bulk operations)
   */
  async loadDesignations(): Promise<void> {
    console.log('🔧 DesignationMatching: Loading designations into cache...')
    this.designationsCache = await this.designationsService.getActiveDesignations()
    console.log(`✅ DesignationMatching: Cached ${this.designationsCache.length} designations`)
  }

  /**
   * Clear the designations cache
   */
  clearCache(): void {
    this.designationsCache = null
  }

  /**
   * Find designation by text using fuzzy matching across all 12 fields
   * @param text - The designation text to search for
   * @returns Best matching designation or null if no good match found
   */
  async findDesignationByText(text: string): Promise<Designation | null> {
    if (!text || text.trim() === '') {
      return null
    }

    const normalizedText = text.trim().toLowerCase()

    // Get designations from cache or fetch if not cached
    const designations = this.designationsCache ?? await this.designationsService.getActiveDesignations()

    if (designations.length === 0) {
      return null
    }

    // Track best match
    let bestMatch: { designation: Designation; similarity: number; matchedField: string } | null = null

    // Search through all designations and their 12 fields
    for (const designation of designations) {
      const fields = [
        { key: 'name_de_short_m', value: designation.name_de_short_m },
        { key: 'name_de_short_f', value: designation.name_de_short_f },
        { key: 'name_de_long_m', value: designation.name_de_long_m },
        { key: 'name_de_long_f', value: designation.name_de_long_f },
        { key: 'name_fr_short_m', value: designation.name_fr_short_m },
        { key: 'name_fr_short_f', value: designation.name_fr_short_f },
        { key: 'name_fr_long_m', value: designation.name_fr_long_m },
        { key: 'name_fr_long_f', value: designation.name_fr_long_f },
        { key: 'name_it_short_m', value: designation.name_it_short_m },
        { key: 'name_it_short_f', value: designation.name_it_short_f },
        { key: 'name_it_long_m', value: designation.name_it_long_m },
        { key: 'name_it_long_f', value: designation.name_it_long_f },
      ]

      // Calculate similarity for each non-null field
      for (const field of fields) {
        if (field.value) {
          const normalizedField = field.value.trim().toLowerCase()
          const similarity = stringSimilarity(normalizedText, normalizedField)

          if (similarity > this.SIMILARITY_THRESHOLD) {
            if (!bestMatch || similarity > bestMatch.similarity) {
              bestMatch = {
                designation,
                similarity,
                matchedField: field.key
              }
            }
          }
        }
      }
    }

    if (bestMatch) {
      console.log(
        `✅ DesignationMatching: Found match for "${text}" → designation id=${bestMatch.designation.id} ` +
        `(${bestMatch.matchedField}, ${Math.round(bestMatch.similarity * 100)}% similarity)`
      )
      return bestMatch.designation
    }

    console.log(`⚠️ DesignationMatching: No match found for "${text}" (threshold ${this.SIMILARITY_THRESHOLD})`)
    return null
  }

  /**
   * Detect gender from German designation text
   */
  private detectGender(text: string): 'f' | 'm' {
    const lowerText = text.toLowerCase()

    // Check for feminine forms - look for these words anywhere in the text
    const feminineWords = [
      'psychologin',
      'therapeutin',
      'psychotherapeutin',
      'ärztin',
      'beraterin',
      'pädagogin',
      'fachpsychologin'
    ]

    return feminineWords.some(word => lowerText.includes(word)) ? 'f' : 'm'
  }

  /**
   * Extract short form (base profession without credentials/titles)
   */
  private extractShortForm(text: string): string {
    // List of base professions to extract
    const baseProfessions = [
      { pattern: /psychotherapeutin/i, short: 'Psychotherapeutin' },
      { pattern: /psychotherapeut/i, short: 'Psychotherapeut' },
      { pattern: /fachpsychologin/i, short: 'Fachpsychologin' },
      { pattern: /fachpsychologe/i, short: 'Fachpsychologe' },
      { pattern: /psychologin/i, short: 'Psychologin' },
      { pattern: /psychologe/i, short: 'Psychologe' },
      { pattern: /ärztin/i, short: 'Ärztin' },
      { pattern: /arzt/i, short: 'Arzt' },
      { pattern: /therapeutin/i, short: 'Therapeutin' },
      { pattern: /therapeut/i, short: 'Therapeut' },
      { pattern: /beraterin/i, short: 'Beraterin' },
      { pattern: /berater/i, short: 'Berater' },
      { pattern: /pädagogin/i, short: 'Pädagogin' },
      { pattern: /pädagoge/i, short: 'Pädagoge' }
    ]

    // Find the first matching profession
    for (const prof of baseProfessions) {
      if (prof.pattern.test(text)) {
        return prof.short
      }
    }

    // Fallback: take first 1-2 words if no pattern matches
    const words = text.split(/\s+/)
    return words.slice(0, Math.min(2, words.length)).join(' ')
  }

  /**
   * Check if this is a long form (has credentials, titles, specializations)
   */
  private isLongForm(text: string): boolean {
    const lowerText = text.toLowerCase()
    const wordCount = text.split(/\s+/).length

    return wordCount > 2 ||
           lowerText.includes('fachpsycholog') ||
           lowerText.includes('eidg. anerkannt') ||
           lowerText.includes('spezialisiert') ||
           lowerText.includes('-') ||
           lowerText.includes('msc') ||
           lowerText.includes('fsp') ||
           lowerText.includes('sbap') ||
           /\b[A-Z]{2,}\b/.test(text) // Has uppercase abbreviations
  }

  /**
   * Find existing designation or create new one
   * @param text - The designation text to match or create
   * @returns designation_id and display_text
   */
  async findOrCreateDesignation(text: string): Promise<{ designation_id: number; display_text: string }> {
    if (!text || text.trim() === '') {
      throw new Error('Designation text cannot be empty')
    }

    const trimmedText = text.trim()

    // Try to find existing designation
    const existingDesignation = await this.findDesignationByText(trimmedText)

    if (existingDesignation) {
      return {
        designation_id: existingDesignation.id,
        display_text: trimmedText // Keep original text from CSV
      }
    }

    // No match found - create new designation
    const gender = this.detectGender(trimmedText)
    const isLong = this.isLongForm(trimmedText)
    const shortForm = this.extractShortForm(trimmedText)

    console.log(`➕ DesignationMatching: Creating new designation for "${trimmedText}"`)
    console.log(`   Gender: ${gender}, Long form: ${isLong}, Short form: "${shortForm}"`)

    // Build designation object with both short and long forms
    const designationData: any = {
      name_de_short_m: null,
      name_de_short_f: null,
      name_de_long_m: null,
      name_de_long_f: null,
      name_fr_short_m: null,
      name_fr_short_f: null,
      name_fr_long_m: null,
      name_fr_long_f: null,
      name_it_short_m: null,
      name_it_short_f: null,
      name_it_long_m: null,
      name_it_long_f: null,
      parent_id: null,
      is_active: true
    }

    // Set short form (always populate this)
    if (gender === 'f') {
      designationData.name_de_short_f = shortForm
    } else {
      designationData.name_de_short_m = shortForm
    }

    // Set long form if this is a long designation
    if (isLong) {
      if (gender === 'f') {
        designationData.name_de_long_f = trimmedText
      } else {
        designationData.name_de_long_m = trimmedText
      }
    }

    const newDesignation = await this.designationsService.createDesignation(designationData)

    // Add to cache if cache is being used
    if (this.designationsCache) {
      this.designationsCache.push(newDesignation)
    }

    console.log(`✅ DesignationMatching: Created designation id=${newDesignation.id}`)

    return {
      designation_id: newDesignation.id,
      display_text: trimmedText
    }
  }

  /**
   * Get display text from designation (first non-null field)
   * Priority: German short → German long → French short → French long → Italian short → Italian long
   * @param designation - The designation object
   * @returns First available non-null designation name
   */
  getDisplayText(designation: Designation): string {
    const fields = [
      designation.name_de_short_m,
      designation.name_de_short_f,
      designation.name_de_long_m,
      designation.name_de_long_f,
      designation.name_fr_short_m,
      designation.name_fr_short_f,
      designation.name_fr_long_m,
      designation.name_fr_long_f,
      designation.name_it_short_m,
      designation.name_it_short_f,
      designation.name_it_long_m,
      designation.name_it_long_f,
    ]

    for (const field of fields) {
      if (field && field.trim() !== '') {
        return field.trim()
      }
    }

    return '' // Fallback (shouldn't happen with valid data)
  }
}
