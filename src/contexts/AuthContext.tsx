import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { reportError } from '../lib/monitoring'

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


    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          reportError(error as Error, 'Authentication session retrieval failed', 'high', { step: 'getInitialSession' })
          setSession(null)
          setUser(null)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }

        setLoading(false)
      } catch (error) {
        if (!mounted) return
        reportError(error as Error, 'Authentication session initialization failed', 'high', { step: 'getInitialSession' })
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
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {

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
        reportError(checkError as Error, 'User existence check failed', 'medium', { userId: user.id, step: 'createUserRecord' })
        return
      }

      if (!existingUser) {
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
          reportError(insertError as Error, 'User record creation failed', 'high', { userId: user.id, email: user.email })
          // If insert fails due to missing policy, show helpful message
          if (insertError.code === '42501' || insertError.code === '403') {
            reportError(insertError as Error, 'Database policy blocking user creation', 'critical', { userId: user.id, email: user.email, code: insertError.code, migration: '008_fix_user_policies.sql' })
          }
        } else {
        }
      } else {
      }
    } catch (error) {
      reportError(error as Error, 'User record creation process failed', 'medium', { userId: user?.id, step: 'createUserRecordIfNeeded' })
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
      reportError(error as Error, 'User registration failed', 'high', { email, step: 'signUp' })
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
      reportError(error as Error, 'User login failed', 'high', { email, step: 'signIn' })
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      reportError(error as Error, 'User logout failed', 'medium', { userId: user?.id, step: 'signOut' })
      return { error: error as AuthError }
    }
  }

  const forceAuthReset = () => {
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
      reportError(error as Error, 'Password reset failed', 'medium', { email, step: 'resetPassword' })
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