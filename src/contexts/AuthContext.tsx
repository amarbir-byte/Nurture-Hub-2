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
    let initialLoadingComplete = false
    let mounted = true

    // Set a timeout to prevent infinite loading on initial load only
    const timeoutId = setTimeout(() => {
      if (!initialLoadingComplete && mounted) {
        console.warn('Auth session timeout - stopping loading')
        setLoading(false)
      }
    }, 8000) // 8 second timeout (reduced from 10)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return

      initialLoadingComplete = true
      clearTimeout(timeoutId)

      if (error) {
        console.error('Session error:', error)
        // If there's a session error, clear everything and stop loading
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      if (!mounted) return

      initialLoadingComplete = true
      clearTimeout(timeoutId)
      console.error('Error getting session:', error)

      // Clear auth state on error
      setSession(null)
      setUser(null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)

      // Handle specific auth events
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        // Clear any local storage or cache if needed
      }

      setSession(session)
      setUser(session?.user ?? null)

      // Always set loading to false after any auth state change
      setLoading(false)

      // Mark initial loading as complete
      if (!initialLoadingComplete) {
        initialLoadingComplete = true
        clearTimeout(timeoutId)
      }

      // Handle sign up confirmation
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if user exists in our users table, if not create them
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (!existingUser) {
          // Create user record with trial period
          const trialEndDate = new Date()
          trialEndDate.setDate(trialEndDate.getDate() + 14) // 14-day trial

          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email!,
            subscription_status: 'trialing',
            trial_end_date: trialEndDate.toISOString(),
            unlimited_access: false,
          })
        }
      }
    })

    // Add a periodic check to ensure auth doesn't get stuck
    const authHealthCheck = setInterval(() => {
      if (mounted && loading) {
        console.warn('Auth appears to be stuck in loading state, forcing reset', {
          initialLoadingComplete,
          hasSession: !!session,
          hasUser: !!user
        })
        setLoading(false)
        initialLoadingComplete = true
      }
    }, 10000) // Check every 10 seconds

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      clearInterval(authHealthCheck)
      subscription.unsubscribe()
    }
  }, [])

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
    console.log('Force resetting auth state')
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