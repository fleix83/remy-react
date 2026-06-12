import { supabase } from '../lib/supabase'
import type { Category } from '../types/database.types'

/**
 * CRUD for the categories table (DE/FR/IT names + badge color).
 * The admin panel is the only write path. Categories are never created or
 * deleted from the app — post logic special-cases fixed ids (1 Erfahrung,
 * 4 Rant), so the set of categories is managed via migrations.
 */
export class CategoriesService {
  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('❌ CategoriesService: Error fetching categories:', error)
      throw error
    }
    return data || []
  }

  async updateCategory(
    id: number,
    updates: Partial<Omit<Category, 'id'>>
  ): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ CategoriesService: Error updating category:', error)
      throw error
    }
    return data
  }
}
