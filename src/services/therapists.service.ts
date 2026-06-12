import { supabase } from '../lib/supabase'
import { therapistDesignationLabel } from '../utils/designationHelpers'
import { formatTherapistPersonName } from '../utils/therapistHelpers'
import type { Therapist, TherapistWithDesignation } from '../types/database.types'

export class TherapistsService {
  // Soft cap so list endpoints stay bounded as the directory grows.
  // Tighten or paginate further if it ever approaches this limit.
  private static readonly LIST_LIMIT = 1000
  private static readonly SELECT_WITH_DESIGNATION = '*, designations(id, slug, label_de, label_fr, label_it)'

  // Deactivated therapists are hidden from public lists but kept for admin.
  // Filtered client-side (lists are bounded by LIST_LIMIT) so queries keep
  // working even before migration 021 adds the is_active column.
  private static excludeInactive(rows: TherapistWithDesignation[]): TherapistWithDesignation[] {
    return rows.filter((t) => t.is_active !== false)
  }

  // Get all therapists; pass includeInactive=true for admin views
  async getTherapists(includeInactive = false): Promise<TherapistWithDesignation[]> {
    console.log('🔧 TherapistsService: Getting all therapists...')

    const { data, error } = await supabase
      .from('therapists')
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(TherapistsService.LIST_LIMIT)

    if (error) {
      console.error('❌ TherapistsService: Error fetching therapists:', error)
      throw error
    }

    console.log('✅ TherapistsService: Fetched therapists:', data?.length || 0, 'records')
    const rows = (data || []) as TherapistWithDesignation[]
    return includeInactive ? rows : TherapistsService.excludeInactive(rows)
  }

  // Search therapists by name, institution, or full_title
  async searchTherapists(searchTerm: string): Promise<TherapistWithDesignation[]> {
    if (!searchTerm.trim()) {
      return this.getTherapists()
    }

    const { data, error } = await supabase
      .from('therapists')
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,institution.ilike.%${searchTerm}%,full_title.ilike.%${searchTerm}%`)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(TherapistsService.LIST_LIMIT)

    if (error) {
      console.error('Error searching therapists:', error)
      throw error
    }

    return TherapistsService.excludeInactive((data || []) as TherapistWithDesignation[])
  }

  // Get therapists by canton
  async getTherapistsByCanton(canton: string): Promise<TherapistWithDesignation[]> {
    const { data, error } = await supabase
      .from('therapists')
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .eq('canton', canton)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .limit(TherapistsService.LIST_LIMIT)

    if (error) {
      console.error('Error fetching therapists by canton:', error)
      throw error
    }

    return TherapistsService.excludeInactive((data || []) as TherapistWithDesignation[])
  }

  // Create a new therapist entry. Institution-only entries pass no personal
  // name and no designation_id; the NOT NULL name columns get ''.
  async createTherapist(therapistData: {
    form_of_address?: string | null
    first_name?: string | null
    last_name?: string | null
    designation_id?: number | null
    full_title?: string | null
    institution?: string | null
    languages?: string | null
    city?: string | null
    canton?: string | null
    gender?: string | null
  }): Promise<TherapistWithDesignation> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw new Error('Authentication failed: ' + authError.message)
    if (!user) throw new Error('User not authenticated')

    const insertData = {
      form_of_address: therapistData.form_of_address?.trim() || '',
      first_name: therapistData.first_name?.trim() || '',
      last_name: therapistData.last_name?.trim() || '',
      institution: therapistData.institution?.trim() || null,
      designation_id: therapistData.designation_id ?? null,
      full_title: therapistData.full_title?.trim() || null,
      languages: therapistData.languages?.trim() || null,
      city: therapistData.city?.trim() || null,
      canton: therapistData.canton || null,
      gender: therapistData.gender || null,
      needs_review: true,
      created_by: user.id
    }

    const { data, error } = await supabase
      .from('therapists')
      .insert([insertData])
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .single()

    if (error) {
      console.error('❌ TherapistsService: Database error:', error)
      throw new Error('Database error: ' + error.message)
    }
    return data as TherapistWithDesignation
  }

  // Update an existing therapist
  async updateTherapist(id: number, updates: Partial<Therapist>): Promise<TherapistWithDesignation> {
    const { data, error } = await supabase
      .from('therapists')
      .update(updates)
      .eq('id', id)
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .single()

    if (error) {
      console.error('Error updating therapist:', error)
      throw error
    }

    return data as TherapistWithDesignation
  }

  // Get a single therapist by ID
  async getTherapist(id: number): Promise<TherapistWithDesignation | null> {
    const { data, error } = await supabase
      .from('therapists')
      .select(TherapistsService.SELECT_WITH_DESIGNATION)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching therapist:', error)
      throw error
    }

    return data as TherapistWithDesignation
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

  // Personal display name; '' for institution-only entries
  formatTherapistName(therapist: TherapistWithDesignation): string {
    return formatTherapistPersonName(therapist)
  }

  // Full display string: "Name (Details)". Institution-only entries use the
  // institution as the name (with the verbatim official designation), so it
  // is not repeated in the details.
  formatTherapistDisplay(therapist: TherapistWithDesignation): string {
    const personName = this.formatTherapistName(therapist)
    const name = personName || therapist.institution || ''
    const details = []

    const label = personName
      ? therapistDesignationLabel(therapist)
      : therapist.full_title || therapistDesignationLabel(therapist)
    if (label) { details.push(label) }

    if (personName && therapist.institution) {
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

  // Dismiss review for a therapist (mark as reviewed)
  async dismissReview(id: number, adminId: string): Promise<void> {
    console.log('🔧 TherapistsService: Dismissing review for therapist ID:', id)

    const { error } = await supabase
      .from('therapists')
      .update({
        needs_review: false,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('❌ TherapistsService: Error dismissing review:', error)
      throw error
    }

    console.log('✅ TherapistsService: Review dismissed successfully')
  }

  // Bulk import therapists
  async bulkImportTherapists(therapists: Array<{
    canton: string | null
    city: string | null
    form_of_address: string
    first_name: string
    last_name: string
    full_title: string
    designation_id: number | null
    needs_review: boolean
    institution: string | null
    services?: string | null
    specialty?: string | null
    languages?: string | null
    gender?: string | null
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
      full_title: t.full_title || null,
      designation_id: t.designation_id,
      services: t.services?.trim() || null,
      specialty: t.specialty?.trim() || null,
      languages: t.languages?.trim() || null,
      city: t.city?.trim() || null,
      canton: t.canton || null,
      gender: t.gender || null,
      needs_review: t.needs_review, // unmatched rows go to the review queue
      created_by: user.id
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