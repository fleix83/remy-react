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
   * Returns designations with multilingual names (name_de, name_fr, name_it)
   * Sorted alphabetically by German name
   */
  async getActiveDesignations(): Promise<Designation[]> {
    console.log('🔧 DesignationsService: Fetching active designations...')

    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('is_active', true)
      .order('name_de', { ascending: true })

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
      .order('name_de', { ascending: true })

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
   * Format designation name based on language preference
   * @param designation - The designation object
   * @param language - Language code: 'de', 'fr', or 'it' (defaults to 'de')
   */
  formatDesignationName(designation: Designation, language: 'de' | 'fr' | 'it' = 'de'): string {
    switch (language) {
      case 'fr':
        return designation.name_fr || designation.name_de
      case 'it':
        return designation.name_it || designation.name_de
      case 'de':
      default:
        return designation.name_de
    }
  }
}
