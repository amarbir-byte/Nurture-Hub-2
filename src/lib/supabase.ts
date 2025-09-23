import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Some features may not work.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          stripe_customer_id: string | null
          subscription_status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | null
          plan_type: 'starter' | 'professional' | 'enterprise' | null
          unlimited_access: boolean
          is_admin: boolean
          trial_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          stripe_customer_id?: string | null
          subscription_status?: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | null
          plan_type?: 'starter' | 'professional' | 'enterprise' | null
          unlimited_access?: boolean
          is_admin?: boolean
          trial_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          subscription_status?: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | null
          plan_type?: 'starter' | 'professional' | 'enterprise' | null
          unlimited_access?: boolean
          is_admin?: boolean
          trial_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          user_id: string
          address: string
          status: 'listed' | 'sold'
          price: number | null
          bedrooms: number | null
          property_type: string | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address: string
          status: 'listed' | 'sold'
          price?: number | null
          bedrooms?: number | null
          property_type?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          address?: string
          status?: 'listed' | 'sold'
          price?: number | null
          bedrooms?: number | null
          property_type?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          phone: string | null
          email: string | null
          lat: number | null
          lng: number | null
          last_contact_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          phone?: string | null
          email?: string | null
          lat?: number | null
          lng?: number | null
          last_contact_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          phone?: string | null
          email?: string | null
          lat?: number | null
          lng?: number | null
          last_contact_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          property_id: string
          message: string
          recipients_count: number
          radius: number
          sent_at: string
          campaign_type: 'sms' | 'email'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          message: string
          recipients_count: number
          radius: number
          sent_at?: string
          campaign_type?: 'sms' | 'email'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          message?: string
          recipients_count?: number
          radius?: number
          sent_at?: string
          campaign_type?: 'sms' | 'email'
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          placeholders: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          placeholders?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          placeholders?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      contact_interactions: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          type: 'sms' | 'call' | 'email' | 'note'
          notes: string | null
          follow_up_date: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          type: 'sms' | 'call' | 'email' | 'note'
          notes?: string | null
          follow_up_date?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          type?: 'sms' | 'call' | 'email' | 'note'
          notes?: string | null
          follow_up_date?: string | null
          completed?: boolean
          created_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          feature: string
          count: number
          period_start: string
          period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          count: number
          period_start: string
          period_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          count?: number
          period_start?: string
          period_end?: string
          created_at?: string
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
      [_ in never]: never
    }
  }
}