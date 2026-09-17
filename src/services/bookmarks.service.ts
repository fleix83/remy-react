import { supabase } from '../lib/supabase'
import type { PostWithRelations } from '../types/database.types'

// Same embed as the profile post lists so bookmarked posts render identically.
const BOOKMARKED_POST_SELECT = `
  created_at,
  posts(
    *,
    users!posts_user_id_fkey(id, username, avatar_url, role, therapist_verified_at),
    categories(id, name_de, name_fr, name_it),
    therapists(id, form_of_address, first_name, last_name, full_title, designation_id, gender, institution, city, canton, designations(id, slug, label_de, label_fr, label_it))
  )
`

export class BookmarksService {
  // Ids of every post the current user has bookmarked (RLS scopes the rows).
  static async getBookmarkedPostIds(): Promise<number[]> {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select('post_id')

    if (error) {
      console.error('Error fetching bookmark ids:', error)
      throw error
    }
    return (data ?? []).map((row) => row.post_id)
  }

  static async addBookmark(userId: string, postId: number): Promise<void> {
    const { error } = await supabase
      .from('post_bookmarks')
      .upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true })

    if (error) {
      console.error('Error adding bookmark:', error)
      throw error
    }
  }

  static async removeBookmark(userId: string, postId: number): Promise<void> {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)

    if (error) {
      console.error('Error removing bookmark:', error)
      throw error
    }
  }

  // Bookmarked posts, newest bookmark first. Posts the user may no longer
  // see (unpublished, banned) come back as null from the join and are dropped.
  static async getBookmarkedPosts(limit: number = 50): Promise<PostWithRelations[]> {
    const { data, error } = await supabase
      .from('post_bookmarks')
      .select(BOOKMARKED_POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching bookmarked posts:', error)
      throw error
    }

    return ((data ?? []) as unknown as { posts: PostWithRelations | null }[])
      .map((row) => row.posts)
      .filter((post): post is PostWithRelations => !!post && post.is_active !== false)
  }
}

export default BookmarksService
