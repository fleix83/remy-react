import { supabase } from '../lib/supabase'
import type { Document, DocumentUpdate } from '../types/database.types'

export class DocumentsService {
  /**
   * Get a document by its slug
   */
  async getDocumentBySlug(slug: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()

      if (error) {
        console.error('Error fetching document:', error)
        return null
      }

      return data as Document
    } catch (error) {
      console.error('Error in getDocumentBySlug:', error)
      return null
    }
  }

  /**
   * Get all published documents
   */
  async getPublishedDocuments(): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
        return []
      }

      return (data as Document[]) || []
    } catch (error) {
      console.error('Error in getPublishedDocuments:', error)
      return []
    }
  }

  /**
   * Update a document by ID
   */
  async updateDocument(id: string, updates: DocumentUpdate): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating document:', error)
        return null
      }

      return data as Document
    } catch (error) {
      console.error('Error in updateDocument:', error)
      return null
    }
  }
}
