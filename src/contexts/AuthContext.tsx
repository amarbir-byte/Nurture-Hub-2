import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  forceAuthReset: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    console.log('AuthProvider: Starting auth initialization')

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Session error:', error)
          setSession(null)
          setUser(null)
        } else {
          console.log('AuthProvider: Session retrieved', { hasSession: !!session })
          setSession(session)
          setUser(session?.user ?? null)
        }

        setLoading(false)
      } catch (error) {
        if (!mounted) return
        console.error('Error getting session:', error)
        setSession(null)
        setUser(null)
        setLoading(false)
      }
    }

    // Start the session retrieval
    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed:', event, session?.user?.email)

      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Handle user creation asynchronously without blocking auth
      if (event === 'SIGNED_IN' && session?.user) {
        createUserRecordIfNeeded(session.user)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Separate function to handle user record creation without blocking auth flow
  const createUserRecordIfNeeded = async (user: User) => {
    try {
      // Check if user record already exists using maybeSingle to avoid PGRST116 error
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking user existence:', checkError)
        return
      }

      if (!existingUser) {
        console.log('AuthProvider: Creating user record for', user.email)
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 14) // 14-day trial

        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email!,
          subscription_status: 'trialing',
          trial_end_date: trialEndDate.toISOString(),
          unlimited_access: false,
          is_admin: false,
        })

        if (insertError) {
          console.error('Error creating user record:', insertError)
          // If insert fails due to missing policy, show helpful message
          if (insertError.code === '42501' || insertError.code === '403') {
            console.error('🔒 Database Policy Issue: User creation blocked. Please run the 008_fix_user_policies.sql migration in your Supabase dashboard.')
          }
        } else {
          console.log('AuthProvider: User record created successfully for', user.email)
        }
      } else {
        console.log('AuthProvider: User record already exists for', user.email)
      }
    } catch (error) {
      console.error('Error in createUserRecordIfNeeded:', error)
      // Don't throw - this shouldn't block auth flow
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`,
        },
      })
      return { error }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: error as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as AuthError }
    }
  }

  const forceAuthReset = () => {
    console.log('AuthProvider: Force resetting auth state')
    setLoading(false)
    setSession(null)
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_APP_URL}/auth/reset-password`,
      })
      return { error }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: error as AuthError }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    forceAuthReset,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}