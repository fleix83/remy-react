/**
 * Therapist-specific constants
 * Professional titles and forms of address used in the therapist system
 */

/**
 * Forms of address for therapists
 * Common Swiss professional titles (Frau, Herr, Dr., Prof., etc.)
 *
 * These are hardcoded as they are stable, not multilingual, and rarely change.
 */
export const FORMS_OF_ADDRESS: string[] = [
  'Frau',
  'Herr',
  'Dr.',
  'Dr. med.',
  'Prof.',
  'Prof. Dr.',
  'Prof. Dr. med.'
]

/**
 * NOTE: Professional designations are NOT stored here as constants.
 *
 * Designations are fetched from the `designations` database table, which provides:
 * - Multilingual support (name_de, name_fr, name_it)
 * - Admin interface management (coming soon)
 * - Dynamic addition/removal of designations
 * - Different forms (long/short, gender variations)
 *
 * To fetch designations, use the DesignationsService:
 * ```typescript
 * import { DesignationsService } from '../services/designations.service'
 * const service = new DesignationsService()
 * const designations = await service.getActiveDesignations()
 * ```
 */
