import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log environment variable status for debugging
console.log('🔍 Environment Variables Check:', {
  VITE_SUPABASE_URL: supabaseUrl ? '✅ Set' : '❌ Missing',
  VITE_SUPABASE_ANON_KEY: supabaseKey ? '✅ Set' : '❌ Missing',
  VITE_APP_URL: import.meta.env.VITE_APP_URL ? '✅ Set' : '❌ Missing',
  VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing'
})

// Create the supabase client based on environment variables
let supabase: any

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables in Vercel!')
  console.error('Required variables:')
  console.error('- VITE_SUPABASE_URL:', supabaseUrl || 'NOT SET')
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set (hidden)' : 'NOT SET')
  console.error('')
  console.error('🔧 To fix this:')
  console.error('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
  console.error('2. Add these variables for Production, Preview, and Development:')
  console.error('   VITE_SUPABASE_URL=https://your-project-id.supabase.co')
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key')
  console.error('   VITE_APP_URL=https://your-app.vercel.app')
  console.error('3. Redeploy after adding variables')

  // Instead of throwing, create a dummy client to prevent crashes
  // This allows the app to show an error message instead of white screen
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  }
} else {
  // Normal Supabase client creation
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    }
  })
}

// Export the supabase client (either real or dummy)
export { supabase }

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