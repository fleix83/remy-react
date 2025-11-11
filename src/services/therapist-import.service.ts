import Papa from 'papaparse'
import { validateCSVHeaders, type TherapistCSVRow } from '../utils/therapist-csv-template'
import type { Therapist } from '../types/database.types'
import { DesignationMatchingService } from './designation-matching.service'

export interface ImportResult {
  success: boolean
  imported: number
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
  form_of_address: string
  first_name: string
  last_name: string
  designation: string
  designation_id: number | null
  short_designation: string | null
  institution: string | null
  description: string | null
}

/**
 * Service for importing therapists from CSV files
 */
export class TherapistImportService {
  private designationMatchingService = new DesignationMatchingService()

  /**
   * Parse CSV file
   */
  async parseCSV(file: File): Promise<Papa.ParseResult<TherapistCSVRow>> {
    return new Promise((resolve, reject) => {
      Papa.parse<TherapistCSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: (results: Papa.ParseResult<TherapistCSVRow>) => resolve(results),
        error: (error: Error) => reject(error)
      })
    })
  }

  /**
   * Validate CSV structure and data
   */
  validateCSV(parseResult: Papa.ParseResult<TherapistCSVRow>): { valid: boolean; errors: string[] } {
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
      parseResult.errors.forEach((error: Papa.ParseError) => {
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

    // Validate designation length
    if (String(row.designation).trim().length > 50) {
      return { valid: false, error: 'designation exceeds 50 characters' }
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
   * Count non-empty fields in a therapist record
   */
  countCompleteFields(therapist: ParsedTherapist): number {
    let count = 0

    if (therapist.canton) count++
    if (therapist.form_of_address) count++
    if (therapist.first_name) count++
    if (therapist.last_name) count++
    if (therapist.designation) count++
    if (therapist.short_designation) count++
    if (therapist.institution) count++
    if (therapist.description) count++

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
   * Parse and normalize therapist data from CSV row
   * Now async to support designation matching
   */
  async parseTherapist(row: any): Promise<ParsedTherapist> {
    const designationText = row.designation?.trim() || ''

    // Match designation to existing or create new one
    let designationMatch: { designation_id: number; display_text: string } | null = null

    if (designationText) {
      try {
        designationMatch = await this.designationMatchingService.findOrCreateDesignation(designationText)
      } catch (error) {
        console.error('Error matching designation:', error)
        // Continue without designation_id if matching fails
      }
    }

    return {
      canton: row.canton?.trim() || null,
      form_of_address: row.form_of_address?.trim() || '',
      first_name: row.first_name?.trim() || '',
      last_name: row.last_name?.trim() || '',
      designation: designationMatch?.display_text || designationText,
      designation_id: designationMatch?.designation_id || null,
      short_designation: row.short_designation?.trim() || null,
      institution: row.institution?.trim() || null,
      description: row.description?.trim() || null
    }
  }

  /**
   * Process CSV data and handle duplicates
   * Now async to support designation matching
   */
  async processTherapists(data: any[]): Promise<{ therapists: ParsedTherapist[]; errors: ImportError[] }> {
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

      // Parse therapist data (now async)
      const therapist = await this.parseTherapist(row)

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
          skipped: 0,
          errors: validation.errors.map((error) => ({
            row: 0,
            data: {},
            error
          })),
          importedTherapists: []
        }
      }

      // Load designations into cache before processing to avoid repeated API calls
      console.log('🔧 TherapistImport: Pre-loading designations cache...')
      await this.designationMatchingService.loadDesignations()

      // Process therapists and handle duplicates (now async)
      const { therapists, errors } = await this.processTherapists(parseResult.data)

      // Clear cache after processing
      this.designationMatchingService.clearCache()

      if (therapists.length === 0) {
        return {
          success: false,
          imported: 0,
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
        skipped: skippedDuplicates,
        errors,
        importedTherapists
      }
    } catch (error) {
      console.error('❌ CSV import error:', error)
      return {
        success: false,
        imported: 0,
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
