import { supabase } from '../lib/supabase'
import type { Designation } from '../types/database.types'

/**
 * Service for managing professional designations
 * Designations are stored in the database with multilingual support (DE/FR/IT)
 * and can be managed through an admin interface
 */
export class DesignationsService {
  /**
   * Get all active designations from the database
   * Returns designations with 4 variants per language (short/long, masculine/feminine)
   * Sorted by the first available German name field
   */
  async getActiveDesignations(): Promise<Designation[]> {
    console.log('🔧 DesignationsService: Fetching active designations...')

    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ DesignationsService: Error fetching designations:', error)
      throw error
    }

    console.log('✅ DesignationsService: Fetched designations:', data?.length || 0, 'records')
    return data || []
  }

  /**
   * Get all designations (including inactive)
   * Useful for admin interfaces
   */
  async getAllDesignations(): Promise<Designation[]> {
    console.log('🔧 DesignationsService: Fetching all designations...')

    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ DesignationsService: Error fetching all designations:', error)
      throw error
    }

    console.log('✅ DesignationsService: Fetched all designations:', data?.length || 0, 'records')
    return data || []
  }

  /**
   * Get a single designation by ID
   */
  async getDesignation(id: number): Promise<Designation | null> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching designation:', error)
      throw error
    }

    return data
  }

  /**
   * Get the primary display name for a designation (first non-null short masculine name)
   * @param designation - The designation object
   * @param language - Language code: 'de', 'fr', or 'it' (defaults to 'de')
   */
  getDisplayName(designation: Designation, language: 'de' | 'fr' | 'it' = 'de'): string {
    switch (language) {
      case 'fr':
        return designation.name_fr_short_m || designation.name_fr_short_f ||
               designation.name_fr_long_m || designation.name_fr_long_f ||
               designation.name_de_short_m || designation.name_de_short_f || ''
      case 'it':
        return designation.name_it_short_m || designation.name_it_short_f ||
               designation.name_it_long_m || designation.name_it_long_f ||
               designation.name_de_short_m || designation.name_de_short_f || ''
      case 'de':
      default:
        return designation.name_de_short_m || designation.name_de_short_f ||
               designation.name_de_long_m || designation.name_de_long_f || ''
    }
  }

  /**
   * @deprecated Use getDisplayName instead - this method is for backward compatibility
   * Format designation name based on language preference
   * @param designation - The designation object
   * @param language - Language code: 'de', 'fr', or 'it' (defaults to 'de')
   */
  formatDesignationName(designation: Designation, language: 'de' | 'fr' | 'it' = 'de'): string {
    return this.getDisplayName(designation, language)
  }

  /**
   * Get a base designation with all its variants
   * Returns the base designation along with all related variants (gender/form variations)
   */
  async getDesignationWithVariants(baseId: number): Promise<{
    base: Designation
    variants: Designation[]
  } | null> {
    console.log('🔧 DesignationsService: Fetching designation with variants for ID:', baseId)

    // Fetch the base designation
    const base = await this.getDesignation(baseId)
    if (!base) {
      return null
    }

    // Fetch all variants (designations that have this as parent)
    const { data: variants, error } = await supabase
      .from('designations')
      .select('*')
      .eq('parent_id', baseId)
      .order('gender', { ascending: true })
      .order('form', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching variants:', error)
      throw error
    }

    console.log('✅ DesignationsService: Fetched', variants?.length || 0, 'variants')
    return {
      base,
      variants: variants || []
    }
  }

  /**
   * Create a new designation
   * @param designationData - The designation data (without id)
   */
  async createDesignation(designationData: Omit<Designation, 'id' | 'created_at'>): Promise<Designation> {
    console.log('🔧 DesignationsService: Creating new designation:', this.getDisplayName(designationData as Designation))

    const { data, error } = await supabase
      .from('designations')
      .insert([designationData])
      .select()
      .single()

    if (error) {
      console.error('❌ DesignationsService: Error creating designation:', error)
      throw error
    }

    console.log('✅ DesignationsService: Created designation with ID:', data.id)
    return data
  }

  /**
   * Update an existing designation
   * @param id - The designation ID
   * @param updates - Partial designation data to update
   */
  async updateDesignation(
    id: number,
    updates: Partial<Omit<Designation, 'id' | 'created_at'>>
  ): Promise<Designation> {
    console.log('🔧 DesignationsService: Updating designation ID:', id)

    // Update designation record
    const { data, error } = await supabase
      .from('designations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ DesignationsService: Error updating designation:', error)
      throw error
    }

    console.log('✅ DesignationsService: Updated designation')

    // Auto-sync all therapists using this designation
    try {
      await this.syncTherapistsWithDesignation(id, data)
    } catch (syncError) {
      console.error('⚠️ DesignationsService: Error syncing therapists (non-fatal):', syncError)
      // Don't throw - designation update succeeded, sync failure is non-fatal
    }

    return data
  }

  /**
   * Sync all therapists that reference this designation
   * Updates their designation text field with the current display name
   */
  private async syncTherapistsWithDesignation(
    designationId: number,
    designation: Designation
  ): Promise<number> {
    console.log('🔄 DesignationsService: Syncing therapists for designation ID:', designationId)

    // Get display text from updated designation
    const displayText = this.getDisplayName(designation)

    // Find all therapists using this designation
    const { data: therapists, error: fetchError } = await supabase
      .from('therapists')
      .select('id')
      .eq('designation_id', designationId)

    if (fetchError) {
      console.error('❌ DesignationsService: Error fetching therapists:', fetchError)
      throw fetchError
    }

    const therapistCount = therapists?.length || 0

    if (therapistCount === 0) {
      console.log('ℹ️ DesignationsService: No therapists to sync')
      return 0
    }

    // Bulk update therapist designation text
    const { error: updateError } = await supabase
      .from('therapists')
      .update({ designation: displayText })
      .eq('designation_id', designationId)

    if (updateError) {
      console.error('❌ DesignationsService: Error syncing therapists:', updateError)
      throw updateError
    }

    console.log(`✅ DesignationsService: Synced ${therapistCount} therapist record(s)`)
    return therapistCount
  }

  /**
   * Delete a designation
   * If it's a base designation (parent_id = null), all variants are also deleted (CASCADE)
   * @param id - The designation ID to delete
   */
  async deleteDesignation(id: number): Promise<void> {
    console.log('🔧 DesignationsService: Deleting designation ID:', id)

    const { error } = await supabase
      .from('designations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ DesignationsService: Error deleting designation:', error)
      throw error
    }

    console.log('✅ DesignationsService: Deleted designation ID:', id)
  }

  /**
   * Toggle the is_active status of a designation
   * @param id - The designation ID
   * @param isActive - The new active status
   */
  async toggleDesignationStatus(id: number, isActive: boolean): Promise<Designation> {
    return this.updateDesignation(id, { is_active: isActive })
  }

  /**
   * Get all base designations (parent_id = null) with their variant counts
   * Useful for admin list views
   */
  async getBaseDesignationsWithVariantCounts(): Promise<Array<Designation & { variant_count: number }>> {
    console.log('🔧 DesignationsService: Fetching base designations with variant counts...')

    const { data, error } = await supabase
      .from('designations')
      .select(`
        *,
        variants:designations!parent_id(count)
      `)
      .is('parent_id', null)
      .order('name_de', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching base designations:', error)
      throw error
    }

    // Transform the data to include variant_count
    const result = (data || []).map((item: any) => ({
      ...item,
      variant_count: item.variants?.[0]?.count || 0
    }))

    console.log('✅ DesignationsService: Fetched', result.length, 'base designations')
    return result
  }
}
