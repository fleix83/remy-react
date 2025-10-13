/**
 * Utility for generating and downloading CSV templates for therapist import
 */

export interface TherapistCSVRow {
  canton: string
  form_of_address: string
  first_name: string
  last_name: string
  designation: string
  short_designation: string
  institution: string
  description: string
}

/**
 * Generate CSV content for therapist import template
 */
export function generateTherapistCSVTemplate(): string {
  const headers = [
    'canton',
    'form_of_address',
    'first_name',
    'last_name',
    'designation',
    'short_designation',
    'institution',
    'description'
  ]

  // Sample data row for reference
  const sampleRow = [
    'ZH',
    'Dr.',
    'Maria',
    'Müller',
    'Psychotherapeut',
    'Psychotherapeut',
    'Klinik am See',
    'Spezialisiert auf Traumatherapie und kognitive Verhaltenstherapie'
  ]

  // Create CSV content
  const csvContent = [
    headers.join(','),
    sampleRow.map(field => `"${field}"`).join(',')
  ].join('\n')

  return csvContent
}

/**
 * Download CSV template file
 */
export function downloadTherapistCSVTemplate(): void {
  const csvContent = generateTherapistCSVTemplate()
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'therapist_import_template.csv')
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Parse CSV headers and validate structure
 */
export function validateCSVHeaders(headers: string[]): { valid: boolean; missing: string[] } {
  const requiredHeaders = [
    'first_name',
    'last_name',
    'designation'
  ]

  const optionalHeaders = [
    'canton',
    'form_of_address',
    'short_designation',
    'institution',
    'description'
  ]

  const allValidHeaders = [...requiredHeaders, ...optionalHeaders]
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())

  // Check for missing required headers
  const missing = requiredHeaders.filter(
    required => !normalizedHeaders.includes(required.toLowerCase())
  )

  // Check if headers contain any valid fields
  const hasValidHeaders = normalizedHeaders.some(header =>
    allValidHeaders.includes(header)
  )

  return {
    valid: missing.length === 0 && hasValidHeaders,
    missing
  }
}
