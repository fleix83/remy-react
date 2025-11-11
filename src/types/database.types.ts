export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          access_role: Database["public"]["Enums"]["access_role"] | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          id: number
          is_active: boolean | null
          name_de: string
          name_fr: string | null
          name_it: string | null
        }
        Insert: {
          access_role?: Database["public"]["Enums"]["access_role"] | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: number
          is_active?: boolean | null
          name_de: string
          name_fr?: string | null
          name_it?: string | null
        }
        Update: {
          access_role?: Database["public"]["Enums"]["access_role"] | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: number
          is_active?: boolean | null
          name_de?: string
          name_fr?: string | null
          name_it?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: number
          is_edited: boolean | null
          is_published: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_comment_id: number | null
          post_id: number
          quoted_text: string | null
          rejection_reason: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          is_edited?: boolean | null
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_comment_id?: number | null
          post_id: number
          quoted_text?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          is_edited?: boolean | null
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_comment_id?: number | null
          post_id?: number
          quoted_text?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string | null
          description_de: string | null
          description_fr: string | null
          description_it: string | null
          id: number
          is_active: boolean | null
          name_de_long_f: string | null
          name_de_long_m: string | null
          name_de_short_f: string | null
          name_de_short_m: string | null
          name_fr_long_f: string | null
          name_fr_long_m: string | null
          name_fr_short_f: string | null
          name_fr_short_m: string | null
          name_it_long_f: string | null
          name_it_long_m: string | null
          name_it_short_f: string | null
          name_it_short_m: string | null
          parent_id: number | null
        }
        Insert: {
          created_at?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: number
          is_active?: boolean | null
          name_de_long_f?: string | null
          name_de_long_m?: string | null
          name_de_short_f?: string | null
          name_de_short_m?: string | null
          name_fr_long_f?: string | null
          name_fr_long_m?: string | null
          name_fr_short_f?: string | null
          name_fr_short_m?: string | null
          name_it_long_f?: string | null
          name_it_long_m?: string | null
          name_it_short_f?: string | null
          name_it_short_m?: string | null
          parent_id?: number | null
        }
        Update: {
          created_at?: string | null
          description_de?: string | null
          description_fr?: string | null
          description_it?: string | null
          id?: number
          is_active?: boolean | null
          name_de_long_f?: string | null
          name_de_long_m?: string | null
          name_de_short_f?: string | null
          name_de_short_m?: string | null
          name_fr_long_f?: string | null
          name_fr_long_m?: string | null
          name_fr_short_f?: string | null
          name_fr_short_m?: string | null
          name_it_long_f?: string | null
          name_it_long_m?: string | null
          name_it_short_f?: string | null
          name_it_short_m?: string | null
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: number
          is_read: boolean | null
          post_messages_id: number | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          post_messages_id?: number | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          post_messages_id?: number | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saved: {
        Row: {
          canton: string
          category_id: number
          content: string
          created_at: string | null
          designation: string | null
          id: number
          tags: string | null
          therapist: string | null
          title: string
          user_id: string
        }
        Insert: {
          canton: string
          category_id: number
          content: string
          created_at?: string | null
          designation?: string | null
          id?: number
          tags?: string | null
          therapist?: string | null
          title: string
          user_id: string
        }
        Update: {
          canton?: string
          category_id?: number
          content?: string
          created_at?: string | null
          designation?: string | null
          id?: number
          tags?: string | null
          therapist?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saved_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          canton: string
          category_id: number
          content: string
          created_at: string | null
          designation: string
          id: number
          is_active: boolean | null
          is_banned: boolean | null
          is_deactivated: boolean | null
          is_draft: boolean | null
          is_published: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_id: number | null
          rejection_reason: string | null
          sticky: boolean | null
          tags: string | null
          therapist: string | null
          therapist_id: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canton: string
          category_id: number
          content: string
          created_at?: string | null
          designation: string
          id?: number
          is_active?: boolean | null
          is_banned?: boolean | null
          is_deactivated?: boolean | null
          is_draft?: boolean | null
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_id?: number | null
          rejection_reason?: string | null
          sticky?: boolean | null
          tags?: string | null
          therapist?: string | null
          therapist_id?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canton?: string
          category_id?: number
          content?: string
          created_at?: string | null
          designation?: string
          id?: number
          is_active?: boolean | null
          is_banned?: boolean | null
          is_deactivated?: boolean | null
          is_draft?: boolean | null
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          parent_id?: number | null
          rejection_reason?: string | null
          sticky?: boolean | null
          tags?: string | null
          therapist?: string | null
          therapist_id?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      therapists: {
        Row: {
          canton: string | null
          created_at: string | null
          description: string | null
          designation: string
          designation_id: number | null
          first_name: string
          form_of_address: string
          id: number
          institution: string | null
          last_name: string
          short_designation: string | null
          updated_at: string | null
        }
        Insert: {
          canton?: string | null
          created_at?: string | null
          description?: string | null
          designation: string
          designation_id?: number | null
          first_name: string
          form_of_address: string
          id?: number
          institution?: string | null
          last_name: string
          short_designation?: string | null
          updated_at?: string | null
        }
        Update: {
          canton?: string | null
          created_at?: string | null
          description?: string | null
          designation?: string
          designation_id?: number | null
          first_name?: string
          form_of_address?: string
          id?: number
          institution?: string | null
          last_name?: string
          short_designation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_at: string | null
          blocked_id: string
          blocker_id: string
          id: number
        }
        Insert: {
          blocked_at?: string | null
          blocked_id: string
          blocker_id: string
          id?: number
        }
        Update: {
          blocked_at?: string | null
          blocked_id?: string
          blocker_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          avatar_url: string | null
          background_image_url: string | null
          bio: string | null
          biography: string | null
          created_at: string | null
          default_canton: string | null
          email: string
          id: string
          is_banned: boolean | null
          language_preference: string | null
          messages_active: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          biography?: string | null
          created_at?: string | null
          default_canton?: string | null
          email: string
          id: string
          is_banned?: boolean | null
          language_preference?: string | null
          messages_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          avatar_url?: string | null
          background_image_url?: string | null
          bio?: string | null
          biography?: string | null
          created_at?: string | null
          default_canton?: string | null
          email?: string
          id?: string
          is_banned?: boolean | null
          language_preference?: string | null
          messages_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Enums: {
      access_role: "all" | "user" | "moderator" | "admin"
      moderation_status: "pending" | "approved" | "rejected"
      user_role: "user" | "moderator" | "admin"
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

export type UserRole = Database['public']['Enums']['user_role']
export type AccessRole = Database['public']['Enums']['access_role']
export type ModerationStatus = Database['public']['Enums']['moderation_status']

// Placeholder types for features not yet in database
export type NotificationType = 'comment_reply' | 'post_comment' | 'private_message' | 'post_mention' | 'therapist_review'
export interface Notification {
  id: number
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

// Extended types with relationships
export type PostWithRelations = Post & {
  categories?: Category
  users?: User
  therapists?: Therapist
  comments?: Comment[] | { count: number }[]
  post_tags?: (PostTag & { tags: Tag })[]
  tags?: string[]
  comment_count?: number
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

// Moderation types
export interface ModerationQueueItem {
  id: number
  content_type: 'post' | 'comment'
  content_id: number
  user_id: string
  created_at: string
  content?: string
  title?: string
  canton?: string
  moderation_status?: ModerationStatus
  moderated_by?: string
  moderated_at?: string
  rejection_reason?: string
  post_id?: number
  category_id?: number
  users?: {
    id: string
    username: string
    avatar_url?: string | null
  }
}
