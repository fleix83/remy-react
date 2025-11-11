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
          is_published: boolean | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          post_id: number
          rejection_reason: string | null
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
          rejection_reason?: string | null
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
          rejection_reason?: string | null
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
    }
    Enums: {
      access_role: "all" | "user" | "moderator" | "admin"
      moderation_status: "pending" | "approved" | "rejected"
      user_role: "user" | "moderator" | "admin"
    }
  }
}

export type Category = Database['public']['Tables']['categories']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Therapist = Database['public']['Tables']['therapists']['Row']
export type Designation = Database['public']['Tables']['designations']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type AccessRole = Database['public']['Enums']['access_role']
export type ModerationStatus = Database['public']['Enums']['moderation_status']
