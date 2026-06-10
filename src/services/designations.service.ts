import { supabase } from '../lib/supabase'
import type { Designation } from '../types/database.types'

/**
 * CRUD for the curated designations table (slug + DE/FR/IT pair labels +
 * import keywords). The admin panel is the only write path; nothing in the
 * app auto-creates designations.
 */
export class DesignationsService {
  async getActiveDesignations(): Promise<Designation[]> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching designations:', error)
      throw error
    }
    return data || []
  }

  async getAllDesignations(): Promise<Designation[]> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching all designations:', error)
      throw error
    }
    return data || []
  }

  async createDesignation(designationData: Omit<Designation, 'id' | 'created_at'>): Promise<Designation> {
    const { data, error } = await supabase
      .from('designations')
      .insert([designationData])
      .select()
      .single()

    if (error) {
      console.error('❌ DesignationsService: Error creating designation:', error)
      throw error
    }
    return data
  }

  async updateDesignation(
    id: number,
    updates: Partial<Omit<Designation, 'id' | 'created_at'>>
  ): Promise<Designation> {
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
    return data
  }

  async deleteDesignation(id: number): Promise<void> {
    const { error } = await supabase.from('designations').delete().eq('id', id)
    if (error) {
      console.error('❌ DesignationsService: Error deleting designation:', error)
      throw error
    }
  }

  async toggleDesignationStatus(id: number, isActive: boolean): Promise<Designation> {
    return this.updateDesignation(id, { is_active: isActive })
  }
}
