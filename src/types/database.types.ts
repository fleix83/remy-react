export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          avatar: string | null
          biography: string | null
          registration_date: string
          avatar_url: string | null
          bio: string | null
          role: 'user' | 'moderator' | 'admin'
          is_banned: boolean
          default_canton: string | null
          language_preference: string
          messages_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          avatar?: string | null
          biography?: string | null
          registration_date?: string
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'moderator' | 'admin'
          is_banned?: boolean
          default_canton?: string | null
          language_preference?: string
          messages_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          avatar?: string | null
          biography?: string | null
          registration_date?: string
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'moderator' | 'admin'
          is_banned?: boolean
          default_canton?: string | null
          language_preference?: string
          messages_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name_de: string
          name_fr: string | null
          name_it: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          is_active: boolean
          is_activ: boolean
          access_role: 'all' | 'user' | 'moderator' | 'admin'
        }
        Insert: {
          id?: number
          name_de: string
          name_fr?: string | null
          name_it?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          is_active?: boolean
          is_activ?: boolean
          access_role?: 'all' | 'user' | 'moderator' | 'admin'
        }
        Update: {
          id?: number
          name_de?: string
          name_fr?: string | null
          name_it?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          is_active?: boolean
          is_activ?: boolean
          access_role?: 'all' | 'user' | 'moderator' | 'admin'
        }
      }
      posts: {
        Row: {
          id: number
          user_id: string
          category_id: number
          title: string
          content: string
          created_at: string
          updated_at: string
          parent_id: number | null
          canton: string
          therapist: string | null
          designation: string
          tags: string | null
          is_published: boolean
          is_active: boolean
          is_banned: boolean
          is_deactivated: boolean
          therapist_id: number | null
          sticky: boolean
        }
        Insert: {
          id?: number
          user_id: string
          category_id: number
          title?: string
          content: string
          created_at?: string
          updated_at?: string
          parent_id?: number | null
          canton: string
          therapist?: string | null
          designation: string
          tags?: string | null
          is_published?: boolean
          is_active?: boolean
          is_banned?: boolean
          is_deactivated?: boolean
          therapist_id?: number | null
          sticky?: boolean
        }
        Update: {
          id?: number
          user_id?: string
          category_id?: number
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
          parent_id?: number | null
          canton?: string
          therapist?: string | null
          designation?: string
          tags?: string | null
          is_published?: boolean
          is_active?: boolean
          is_banned?: boolean
          is_deactivated?: boolean
          therapist_id?: number | null
          sticky?: boolean
        }
      }
      therapists: {
        Row: {
          id: number
          form_of_address: string
          first_name: string
          last_name: string
          institution: string | null
          designation: string
          description: string | null
          canton: string | null
          created_at: string
          designation_id: number | null
        }
        Insert: {
          id?: number
          form_of_address: string
          first_name: string
          last_name: string
          institution?: string | null
          designation: string
          description?: string | null
          canton?: string | null
          created_at?: string
          designation_id?: number | null
        }
        Update: {
          id?: number
          form_of_address?: string
          first_name?: string
          last_name?: string
          institution?: string | null
          designation?: string
          description?: string | null
          canton?: string | null
          created_at?: string
          designation_id?: number | null
        }
      }
      comments: {
        Row: {
          id: number
          post_id: number
          user_id: string | null
          content: string
          parent_comment_id: number | null
          is_edited: boolean
          is_active: boolean
          is_banned: boolean
          quoted_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          post_id: number
          user_id?: string | null
          content: string
          parent_comment_id?: number | null
          is_edited?: boolean
          is_active?: boolean
          is_banned?: boolean
          quoted_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          post_id?: number
          user_id?: string | null
          content?: string
          parent_comment_id?: number | null
          is_edited?: boolean
          is_active?: boolean
          is_banned?: boolean
          quoted_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: number
          sender_id: string
          receiver_id: string
          content: string
          created_at: string
          is_read: boolean
          post_messages_id: number | null
        }
        Insert: {
          id?: number
          sender_id: string
          receiver_id: string
          content: string
          created_at?: string
          is_read?: boolean
          post_messages_id?: number | null
        }
        Update: {
          id?: number
          sender_id?: string
          receiver_id?: string
          content?: string
          created_at?: string
          is_read?: boolean
          post_messages_id?: number | null
        }
      }
      post_saved: {
        Row: {
          id: number
          user_id: string
          category_id: number
          canton: string
          therapist: string | null
          designation: string | null
          title: string
          content: string
          tags: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          category_id: number
          canton: string
          therapist?: string | null
          designation?: string | null
          title: string
          content: string
          tags?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          category_id?: number
          canton?: string
          therapist?: string | null
          designation?: string | null
          title?: string
          content?: string
          tags?: string | null
          created_at?: string
        }
      }
      designations: {
        Row: {
          id: number
          name_de: string
          name_fr: string
          name_it: string
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          is_active: boolean
        }
        Insert: {
          id?: number
          name_de: string
          name_fr: string
          name_it: string
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          is_active?: boolean
        }
        Update: {
          id?: number
          name_de?: string
          name_fr?: string
          name_it?: string
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          is_active?: boolean
        }
      }
      tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      post_tags: {
        Row: {
          post_id: number
          tag_id: number
        }
        Insert: {
          post_id: number
          tag_id: number
        }
        Update: {
          post_id?: number
          tag_id?: number
        }
      }
      user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          blocked_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          blocked_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          blocked_at?: string
        }
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          type: 'comment_reply' | 'post_comment' | 'private_message' | 'post_mention' | 'therapist_review'
          title: string
          message: string
          related_post_id: number | null
          related_comment_id: number | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          type: 'comment_reply' | 'post_comment' | 'private_message' | 'post_mention' | 'therapist_review'
          title: string
          message: string
          related_post_id?: number | null
          related_comment_id?: number | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          type?: 'comment_reply' | 'post_comment' | 'private_message' | 'post_mention' | 'therapist_review'
          title?: string
          message?: string
          related_post_id?: number | null
          related_comment_id?: number | null
          is_read?: boolean
          created_at?: string
        }
      }
      post_drafts: {
        Row: {
          id: number
          user_id: string
          category_id: number | null
          title: string
          content: string
          canton: string | null
          therapist_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          category_id?: number | null
          title: string
          content: string
          canton?: string | null
          therapist_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          category_id?: number | null
          title?: string
          content?: string
          canton?: string | null
          therapist_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'moderator' | 'admin'
      access_role: 'all' | 'user' | 'moderator' | 'admin'
      notification_type: 'comment_reply' | 'post_comment' | 'private_message' | 'post_mention' | 'therapist_review'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use in components
export type User = Database['public']['Tables']['users']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Therapist = Database['public']['Tables']['therapists']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type PostSaved = Database['public']['Tables']['post_saved']['Row']
export type Designation = Database['public']['Tables']['designations']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type PostTag = Database['public']['Tables']['post_tags']['Row']
export type UserBlock = Database['public']['Tables']['user_blocks']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type PostDraft = Database['public']['Tables']['post_drafts']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type AccessRole = Database['public']['Enums']['access_role']
export type NotificationType = Database['public']['Enums']['notification_type']

// Extended types with relationships
export type PostWithRelations = Post & {
  categories?: Category
  users?: User
  therapists?: Therapist
  comments?: Comment[]
  post_tags?: (PostTag & { tags: Tag })[]
}

export type CommentWithUser = Comment & {
  users?: User
}

export type CommentWithRelations = Comment & {
  users?: User
  replies?: CommentWithRelations[]
}

export type TherapistWithPosts = Therapist & {
  posts?: (Post & { users?: User })[]
}