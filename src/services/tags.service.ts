import { supabase } from '../lib/supabase'
import type { Tag } from '../types/database.types'

export class TagsService {
  // Get all tags for autocomplete (capped to keep payload small)
  async getAllTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })
      .limit(200)

    if (error) {
      console.error('Error fetching tags:', error)
      return []
    }

    return data || []
  }

  // Get tags for a specific post
  async getPostTags(postId: number): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('post_tags')
      .select('tag_id, tags(id, name)')
      .eq('post_id', postId)

    if (error) {
      console.error('Error fetching post tags:', error)
      return []
    }

    // Extract tags from the joined data
    return data?.map(pt => (pt.tags as unknown as Tag)) || []
  }

  // Create a new tag (if it doesn't exist) and return it
  async createTag(name: string): Promise<Tag | null> {
    // Check if tag already exists
    const { data: existing, error: existError } = await supabase
      .from('tags')
      .select('*')
      .ilike('name', name)
      .single()

    if (existError && existError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking existing tag:', existError)
      return null
    }

    if (existing) {
      return existing
    }

    // Create new tag
    const { data, error } = await supabase
      .from('tags')
      .insert([{ name: name.trim() }])
      .select()
      .single()

    if (error) {
      console.error('Error creating tag:', error)
      return null
    }

    return data
  }

  // Add tags to a post (creates tags if they don't exist)
  async addTagsToPost(postId: number, tagNames: string[]): Promise<boolean> {
    try {
      // First, remove existing tags for this post
      await supabase
        .from('post_tags')
        .delete()
        .eq('post_id', postId)

      if (tagNames.length === 0) {
        return true // No tags to add
      }

      // Get or create tags
      const tags: Tag[] = []
      for (const tagName of tagNames) {
        if (tagName.trim()) {
          const tag = await this.createTag(tagName)
          if (tag) {
            tags.push(tag)
          }
        }
      }

      if (tags.length === 0) {
        return true // No valid tags
      }

      // Create post_tags relationships
      const postTags = tags.map(tag => ({
        post_id: postId,
        tag_id: tag.id
      }))

      const { error } = await supabase
        .from('post_tags')
        .insert(postTags)

      if (error) {
        console.error('Error adding tags to post:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in addTagsToPost:', error)
      return false
    }
  }

  // Remove a specific tag from a post
  async removeTagFromPost(postId: number, tagId: number): Promise<boolean> {
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId)
      .eq('tag_id', tagId)

    if (error) {
      console.error('Error removing tag from post:', error)
      return false
    }

    return true
  }

  // Search tags by name (for autocomplete)
  async searchTags(query: string): Promise<Tag[]> {
    if (!query.trim()) {
      return this.getAllTags()
    }

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .ilike('name', `%${query.trim()}%`)
      .order('name', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Error searching tags:', error)
      return []
    }

    return data || []
  }
}
