import type { ParseResult, ParseError } from 'papaparse'
import { validateCSVHeaders, type TherapistCSVRow } from '../utils/therapist-csv-template'
import type { Therapist, Designation } from '../types/database.types'
import { DesignationsService } from './designations.service'
import { matchDesignation } from '../utils/designationHelpers'

export interface ImportResult {
  success: boolean
  imported: number
  needsReview: number
  skipped: number
  errors: ImportError[]
  importedTherapists: Therapist[]
}

export interface ImportError {
  row: number
  data: Partial<TherapistCSVRow>
  error: string
}

interface ParsedTherapist {
  canton: string | null
  city: string | null
  form_of_address: string
  first_name: string
  last_name: string
  full_title: string
  designation_id: number | null
  needs_review: boolean
  institution: string | null
  services: string | null
  specialty: string | null
  languages: string | null
  gender: string | null
}

/**
 * Service for importing therapists from CSV files
 */
export class TherapistImportService {
  /**
   * Parse CSV file. papaparse is dynamically imported so it stays out of the
   * main bundle until a user actually triggers a CSV import.
   */
  async parseCSV(file: File): Promise<ParseResult<TherapistCSVRow>> {
    const { default: Papa } = await import('papaparse')
    return new Promise((resolve, reject) => {
      Papa.parse<TherapistCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: (results: ParseResult<TherapistCSVRow>) => resolve(results),
        error: (error: Error) => reject(error)
      })
    })
  }

  /**
   * Validate CSV structure and data
   */
  validateCSV(parseResult: ParseResult<TherapistCSVRow>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if file has data
    if (!parseResult.data || parseResult.data.length === 0) {
      errors.push('CSV file is empty or has no valid data rows')
      return { valid: false, errors }
    }

    // Validate headers
    const headers = Object.keys(parseResult.data[0] || {})
    const headerValidation = validateCSVHeaders(headers)

    if (!headerValidation.valid) {
      if (headerValidation.missing.length > 0) {
        errors.push(`Missing required columns: ${headerValidation.missing.join(', ')}`)
      } else {
        errors.push('CSV does not contain valid column headers')
      }
    }

    // Check for parsing errors
    if (parseResult.errors && parseResult.errors.length > 0) {
      parseResult.errors.forEach((error: ParseError) => {
        errors.push(`Row ${error.row}: ${error.message}`)
      })
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate individual row data
   */
  validateRow(row: any): { valid: boolean; error?: string } {
    const requiredFields = ['first_name', 'last_name', 'designation']

    for (const field of requiredFields) {
      if (!row[field] || String(row[field]).trim() === '') {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        }
      }
    }

    // Validate first_name and last_name length
    if (String(row.first_name).trim().length > 50) {
      return { valid: false, error: 'first_name exceeds 50 characters' }
    }

    if (String(row.last_name).trim().length > 50) {
      return { valid: false, error: 'last_name exceeds 50 characters' }
    }

    // Validate form_of_address length (increased to 50 from 10)
    if (row.form_of_address && String(row.form_of_address).trim().length > 50) {
      return { valid: false, error: 'form_of_address exceeds 50 characters' }
    }

    // Validate designation length (scraped full titles are long)
    if (String(row.designation).trim().length > 255) {
      return { valid: false, error: 'designation exceeds 255 characters' }
    }

    // Validate canton format (2 characters)
    if (row.canton && String(row.canton).trim().length > 2) {
      return { valid: false, error: 'canton must be 2 characters (e.g., ZH, BE)' }
    }

    // Validate institution length (255 characters max)
    if (row.institution && String(row.institution).trim().length > 255) {
      return { valid: false, error: 'institution exceeds 255 characters' }
    }

    return { valid: true }
  }

  /**
   * Detect gender from designation text
   * Returns 'm' (masculine), 'f' (feminine), or null
   */
  private detectGender(designationText: string): string | null {
    const lowerText = designationText.toLowerCase()

    // Check for feminine forms
    const feminineWords = [
      'psychologin',
      'therapeutin',
      'psychotherapeutin',
      'ärztin',
      'beraterin',
      'pädagogin',
      'fachpsychologin'
    ]

    if (feminineWords.some(word => lowerText.includes(word))) {
      return 'f'
    }

    // Check for masculine forms (to be explicit)
    const masculineWords = [
      'psychologe',
      'therapeut',
      'psychotherapeut',
      'arzt',
      'berater',
      'pädagoge',
      'fachpsychologe',
      'psychiater'
    ]

    if (masculineWords.some(word => lowerText.includes(word))) {
      return 'm'
    }

    // Default to masculine if no clear gender marker
    return 'm'
  }

  /**
   * Count non-empty fields in a therapist record
   */
  countCompleteFields(therapist: ParsedTherapist): number {
    let count = 0

    if (therapist.canton) count++
    if (therapist.form_of_address) count++
    if (therapist.first_name) count++
    if (therapist.last_name) count++
    if (therapist.full_title) count++
    if (therapist.gender) count++
    if (therapist.institution) count++
    if (therapist.services) count++
    if (therapist.specialty) count++
    if (therapist.languages) count++
    if (therapist.city) count++

    return count
  }

  /**
   * Create duplicate key for comparison
   */
  getDuplicateKey(therapist: ParsedTherapist): string {
    const firstName = therapist.first_name.trim().toLowerCase()
    const lastName = therapist.last_name.trim().toLowerCase()
    const canton = (therapist.canton || '').trim().toLowerCase()
    return `${firstName}|${lastName}|${canton}`
  }

  /**
   * Parse and normalize therapist data from a CSV row.
   * The scraped title is stored verbatim in full_title; the curated designation
   * is assigned by keyword matching. Unmatched rows are flagged for review.
   */
  parseTherapist(row: any, designations: Designation[]): ParsedTherapist {
    const fullTitle = row.designation?.trim() || ''
    const detectedGender = fullTitle ? this.detectGender(fullTitle) : null
    const designationId = fullTitle ? matchDesignation(fullTitle, designations) : null
    // The gender filter only knows 'm'/'f' — normalize CSV input (single letters
    // or German words) and fall back to keyword detection for anything else.
    const csvGender = row.gender?.trim().toLowerCase()
    const gender = csvGender === 'm' || csvGender === 'männlich' || csvGender === 'mann' ? 'm'
      : csvGender === 'f' || csvGender === 'w' || csvGender === 'weiblich' || csvGender === 'frau' ? 'f'
      : detectedGender

    return {
      canton: row.canton?.trim() || null,
      city: row.city?.trim() || null,
      form_of_address: row.form_of_address?.trim() || '',
      first_name: row.first_name?.trim() || '',
      last_name: row.last_name?.trim() || '',
      full_title: fullTitle,
      designation_id: designationId,
      needs_review: designationId === null,
      institution: row.institution?.trim() || null,
      services: row.services?.trim() || null,
      // The therapists table has no description column — the CSV's free-text
      // description maps to the specialty column.
      specialty: row.description?.trim() || null,
      languages: row.languages?.trim() || null,
      gender
    }
  }

  /**
   * Process CSV data and handle duplicates
   */
  async processTherapists(data: any[], designations: Designation[]): Promise<{ therapists: ParsedTherapist[]; errors: ImportError[] }> {
    const therapistMap = new Map<string, { therapist: ParsedTherapist; rowIndex: number }>()
    const errors: ImportError[] = []

    for (let index = 0; index < data.length; index++) {
      const row = data[index]
      const rowIndex = index + 2 // +2 because of 0-based index and header row

      // Validate row
      const validation = this.validateRow(row)
      if (!validation.valid) {
        errors.push({
          row: rowIndex,
          data: row,
          error: validation.error || 'Invalid row data'
        })
        continue
      }

      // Parse therapist data
      const therapist = this.parseTherapist(row, designations)

      // Check for duplicates
      const duplicateKey = this.getDuplicateKey(therapist)

      if (therapistMap.has(duplicateKey)) {
        // Compare completeness
        const existing = therapistMap.get(duplicateKey)!
        const existingComplete = this.countCompleteFields(existing.therapist)
        const newComplete = this.countCompleteFields(therapist)

        // Keep the more complete one
        if (newComplete > existingComplete) {
          console.log(
            `🔄 Replacing duplicate therapist "${therapist.first_name} ${therapist.last_name}" ` +
            `(row ${existing.rowIndex} -> row ${rowIndex}) - new entry has more complete data ` +
            `(${newComplete} fields vs ${existingComplete} fields)`
          )
          therapistMap.set(duplicateKey, { therapist, rowIndex })
        } else {
          console.log(
            `⏭️ Skipping duplicate therapist "${therapist.first_name} ${therapist.last_name}" ` +
            `at row ${rowIndex} - existing entry at row ${existing.rowIndex} has more complete data ` +
            `(${existingComplete} fields vs ${newComplete} fields)`
          )
        }
      } else {
        therapistMap.set(duplicateKey, { therapist, rowIndex })
      }
    }

    const therapists = Array.from(therapistMap.values()).map((item) => item.therapist)

    console.log(
      `📊 Processed ${data.length} rows: ` +
      `${therapists.length} unique therapists, ` +
      `${data.length - therapists.length} duplicates handled, ` +
      `${errors.length} errors`
    )

    return { therapists, errors }
  }

  /**
   * Import therapists from CSV file
   */
  async importFromCSV(
    file: File,
    bulkImportFn: (therapists: ParsedTherapist[]) => Promise<Therapist[]>
  ): Promise<ImportResult> {
    try {
      console.log('📂 Parsing CSV file:', file.name)

      // Parse CSV
      const parseResult = await this.parseCSV(file)

      // Validate CSV structure
      const validation = this.validateCSV(parseResult)
      if (!validation.valid) {
        return {
          success: false,
          imported: 0,
          needsReview: 0,
          skipped: 0,
          errors: validation.errors.map((error) => ({
            row: 0,
            data: {},
            error
          })),
          importedTherapists: []
        }
      }

      // Load the curated designations once for keyword classification
      const designations = await new DesignationsService().getActiveDesignations()
      const { therapists, errors } = await this.processTherapists(parseResult.data, designations)

      if (therapists.length === 0) {
        return {
          success: false,
          imported: 0,
          needsReview: 0,
          skipped: 0,
          errors: errors.length > 0 ? errors : [{
            row: 0,
            data: {},
            error: 'No valid therapist data found in CSV'
          }],
          importedTherapists: []
        }
      }

      // Import to database
      console.log(`💾 Importing ${therapists.length} therapists to database...`)
      const importedTherapists = await bulkImportFn(therapists)

      const originalCount = parseResult.data.length
      const skippedDuplicates = originalCount - therapists.length

      console.log(
        `✅ Import complete: ${importedTherapists.length} imported, ` +
        `${skippedDuplicates} duplicates skipped, ` +
        `${errors.length} errors`
      )

      return {
        success: true,
        imported: importedTherapists.length,
        needsReview: importedTherapists.filter(t => t.needs_review === true).length,
        skipped: skippedDuplicates,
        errors,
        importedTherapists
      }
    } catch (error) {
      console.error('❌ CSV import error:', error)
      return {
        success: false,
        imported: 0,
        needsReview: 0,
        skipped: 0,
        errors: [{
          row: 0,
          data: {},
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }],
        importedTherapists: []
      }
    }
  }
}
