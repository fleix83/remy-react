export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
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
          is_published: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
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
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
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
          is_published?: boolean | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
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
          id: number
          is_active: boolean | null
          name_de_long_m: string | null
          name_de_long_w: string | null
          name_de_short_m: string | null
          name_de_short_w: string | null
          name_fr_long_m: string | null
          name_fr_long_w: string | null
          name_fr_short_m: string | null
          name_fr_short_w: string | null
          name_it_long_m: string | null
          name_it_long_w: string | null
          name_it_short_m: string | null
          name_it_short_w: string | null
          parent_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name_de_long_m?: string | null
          name_de_long_w?: string | null
          name_de_short_m?: string | null
          name_de_short_w?: string | null
          name_fr_long_m?: string | null
          name_fr_long_w?: string | null
          name_fr_short_m?: string | null
          name_fr_short_w?: string | null
          name_it_long_m?: string | null
          name_it_long_w?: string | null
          name_it_short_m?: string | null
          name_it_short_w?: string | null
          parent_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name_de_long_m?: string | null
          name_de_long_w?: string | null
          name_de_short_m?: string | null
          name_de_short_w?: string | null
          name_fr_long_m?: string | null
          name_fr_long_w?: string | null
          name_fr_short_m?: string | null
          name_fr_short_w?: string | null
          name_it_long_m?: string | null
          name_it_long_w?: string | null
          name_it_short_m?: string | null
          name_it_short_w?: string | null
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
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      access_role: "all" | "user" | "moderator" | "admin"
      moderation_status: "pending" | "approved" | "rejected"
      user_role: "user" | "moderator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_role: ["all", "user", "moderator", "admin"],
      moderation_status: ["pending", "approved", "rejected"],
      user_role: ["user", "moderator", "admin"],
    },
  },
} as const

// Helper types
export type Category = Tables<'categories'>
export type Comment = Tables<'comments'>
export type Designation = Tables<'designations'>
export type Post = Tables<'posts'>
export type Therapist = Tables<'therapists'>
export type User = Tables<'users'>

// Extended types with relations
export interface PostWithRelations extends Post {
  user?: User
  category?: Category
  categories?: Category
  therapist?: Therapist
  comments?: Comment[]
  comment_count?: number
}

export interface CommentWithRelations extends Comment {
  user?: User
  users?: User
  replies?: CommentWithRelations[]
}

export interface MessageWithUser {
  id: number
  content: string
  created_at: string | null
  is_read: boolean | null
  sender_id: string
  receiver_id: string
  sender?: User
  receiver?: User
}

export interface ModerationQueueItem {
  id: number
  content_type: 'post' | 'comment'
  content_id: number
  content: string
  title?: string | null
  created_at: string | null
  user_id: string | null
  moderation_status: string | null
  moderated_by?: string | null
  moderated_at?: string | null
  rejection_reason?: string | null
  // Post-specific fields
  canton?: string
  category_id?: number
  // Comment-specific fields
  post_id?: number
  // Relations
  users?: User
  post?: Post
}
