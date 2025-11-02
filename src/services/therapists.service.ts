import { supabase } from '../lib/supabase'
import type { Therapist } from '../types/database.types'

export class TherapistsService {
  // Get all therapists
  async getTherapists(): Promise<Therapist[]> {
    console.log('🔧 TherapistsService: Getting all therapists...')
    
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) {
      console.error('❌ TherapistsService: Error fetching therapists:', error)
      throw error
    }

    console.log('✅ TherapistsService: Fetched therapists:', data?.length || 0, 'records')
    return data || []
  }

  // Search therapists by name, institution, or designation
  async searchTherapists(searchTerm: string): Promise<Therapist[]> {
    if (!searchTerm.trim()) {
      return this.getTherapists()
    }

    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,institution.ilike.%${searchTerm}%,designation.ilike.%${searchTerm}%,short_designation.ilike.%${searchTerm}%`)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error searching therapists:', error)
      throw error
    }

    return data || []
  }

  // Get therapists by canton
  async getTherapistsByCanton(canton: string): Promise<Therapist[]> {
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .eq('canton', canton)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching therapists by canton:', error)
      throw error
    }

    return data || []
  }

  // Create a new therapist
  async createTherapist(therapistData: {
    form_of_address: string
    first_name: string
    last_name: string
    institution?: string
    designation: string
    short_designation?: string
    description?: string
    canton?: string
  }): Promise<Therapist> {
    console.log('🔧 TherapistsService: Creating therapist with data:', therapistData)

    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ TherapistsService: Auth error:', authError)
      throw new Error('Authentication failed: ' + authError.message)
    }

    if (!user) {
      console.error('❌ TherapistsService: No authenticated user')
      throw new Error('User not authenticated')
    }

    console.log('👤 TherapistsService: Authenticated user ID:', user.id)

    const insertData = {
      form_of_address: therapistData.form_of_address,
      first_name: therapistData.first_name.trim(),
      last_name: therapistData.last_name.trim(),
      institution: therapistData.institution?.trim() || null,
      designation: therapistData.designation,
      short_designation: therapistData.short_designation?.trim() || null,
      description: therapistData.description?.trim() || null,
      canton: therapistData.canton || null
    }

    console.log('📤 TherapistsService: Inserting data:', insertData)

    const { data, error } = await supabase
      .from('therapists')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('❌ TherapistsService: Database error:', error)
      console.error('❌ TherapistsService: Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw new Error('Database error: ' + error.message)
    }

    console.log('✅ TherapistsService: Therapist created successfully:', data)
    return data
  }

  // Update an existing therapist
  async updateTherapist(id: number, updates: Partial<Therapist>): Promise<Therapist> {
    const { data, error } = await supabase
      .from('therapists')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating therapist:', error)
      throw error
    }

    return data
  }

  // Get a single therapist by ID
  async getTherapist(id: number): Promise<Therapist | null> {
    const { data, error } = await supabase
      .from('therapists')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching therapist:', error)
      throw error
    }

    return data
  }

  // Delete a therapist
  async deleteTherapist(id: number): Promise<void> {
    console.log('🔧 TherapistsService: Deleting therapist ID:', id)

    const { error } = await supabase
      .from('therapists')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ TherapistsService: Error deleting therapist:', error)
      throw error
    }

    console.log('✅ TherapistsService: Therapist deleted successfully')
  }

  // Format therapist display name
  formatTherapistName(therapist: Therapist): string {
    const nameparts = [
      therapist.form_of_address,
      therapist.first_name,
      therapist.last_name
    ].filter(Boolean)
    
    return nameparts.join(' ')
  }

  // Format therapist display with institution
  formatTherapistDisplay(therapist: Therapist): string {
    const name = this.formatTherapistName(therapist)
    const details = []

    if (therapist.designation) {
      details.push(therapist.designation)
    }

    if (therapist.institution) {
      details.push(therapist.institution)
    }

    if (therapist.canton) {
      details.push(therapist.canton)
    }

    if (details.length > 0) {
      return `${name} (${details.join(', ')})`
    }

    return name
  }

  // Bulk import therapists
  async bulkImportTherapists(therapists: Array<{
    canton: string | null
    form_of_address: string
    first_name: string
    last_name: string
    designation: string
    short_designation: string | null
    institution: string | null
    description: string | null
  }>): Promise<Therapist[]> {
    console.log('🔧 TherapistsService: Bulk importing', therapists.length, 'therapists...')

    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ TherapistsService: Auth error:', authError)
      throw new Error('Authentication failed: ' + authError.message)
    }

    if (!user) {
      console.error('❌ TherapistsService: No authenticated user')
      throw new Error('User not authenticated')
    }

    console.log('👤 TherapistsService: Authenticated user ID:', user.id)

    // Prepare data for insertion
    const insertData = therapists.map(t => ({
      form_of_address: t.form_of_address,
      first_name: t.first_name.trim(),
      last_name: t.last_name.trim(),
      institution: t.institution?.trim() || null,
      designation: t.designation,
      short_designation: t.short_designation?.trim() || null,
      description: t.description?.trim() || null,
      canton: t.canton || null
    }))

    console.log('📤 TherapistsService: Inserting', insertData.length, 'therapist records...')

    // Use upsert to handle potential duplicates in database
    const { data, error } = await supabase
      .from('therapists')
      .insert(insertData)
      .select()

    if (error) {
      console.error('❌ TherapistsService: Database error during bulk import:', error)
      console.error('❌ TherapistsService: Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw new Error('Database error: ' + error.message)
    }

    console.log('✅ TherapistsService: Bulk import successful -', data?.length || 0, 'therapists imported')
    return data || []
  }
}