import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import type { PlanId } from '../lib/stripe'
import { reportError } from '../lib/monitoring'
import {
  getPlanLimits,
  checkPlanLimit,
  getUsagePercentage,
  hasActiveSubscription,
  isInTrial,
  getTrialDaysRemaining,
  SUBSCRIPTION_PLANS
} from '../lib/stripe'

interface UserSubscription {
  id: string
  email: string
  stripe_customer_id: string | null
  subscription_status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid'
  plan_type: PlanId | null
  unlimited_access: boolean
  is_admin: boolean
  trial_end_date: string | null
  created_at: string
  updated_at: string
}

interface UsageStats {
  contacts: number
  campaigns_this_month: number
  templates: number
  properties: number
  storage_mb: number
}

interface SubscriptionContextType {
  userSubscription: UserSubscription | null
  usageStats: UsageStats | null
  loading: boolean
  hasAccess: boolean
  isTrialing: boolean
  trialDaysRemaining: number
  canUseFeature: (feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits) => boolean
  getFeatureUsage: (feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits) => { used: number; limit: number; percentage: number }
  refreshSubscription: () => Promise<void>
  refreshUsage: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

interface SubscriptionProviderProps {
  children: React.ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user subscription data
  const refreshSubscription = async () => {
    if (!user) {
      setUserSubscription(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 results gracefully

      if (error) {
        reportError(error as Error, 'Subscription fetch failed from Supabase', 'high', { userId: user?.id, step: 'fetchSubscription' })
        setUserSubscription(null)
        return
      }

      setUserSubscription(data)
    } catch (error) {
      reportError(error as Error, 'Subscription fetch failed in try/catch', 'high', { userId: user?.id, step: 'fetchSubscription' })
      setUserSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  // Fetch usage statistics
  const refreshUsage = async () => {
    if (!user) {
      setUsageStats(null)
      return
    }

    try {
      // Get current month start and end
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Fetch counts in parallel
      const [contactsCount, campaignsCount, templatesCount] = await Promise.all([
        // Count contacts
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Count campaigns this month
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),

        // Count templates
        supabase
          .from('templates')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
      ])

      setUsageStats({
        contacts: contactsCount.count || 0,
        campaigns_this_month: campaignsCount.count || 0,
        templates: templatesCount.count || 0,
        properties: 0, // TODO: Add actual properties count
        storage_mb: 0 // TODO: Calculate actual storage usage
      })
    } catch (error) {
      reportError(error as Error, 'Usage statistics fetch failed', 'medium', { userId: user?.id, step: 'fetchUsageStats' })
    }
  }

  // Load data when user changes
  useEffect(() => {
    if (!authLoading) {
      refreshSubscription()
      refreshUsage()
    }
  }, [user, authLoading])

  // Set up real-time subscription to usage changes
  useEffect(() => {
    if (!user) return

    // Subscribe to changes in user's data
    const subscription = supabase
      .channel('user_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `user_id=eq.${user.id}`
        },
        () => refreshUsage()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `user_id=eq.${user.id}`
        },
        () => refreshUsage()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'templates',
          filter: `user_id=eq.${user.id}`
        },
        () => refreshUsage()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        () => refreshSubscription()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  // Computed values
  const hasAccess = userSubscription
    ? userSubscription.unlimited_access ||
      hasActiveSubscription(userSubscription.subscription_status) ||
      isInTrial(userSubscription.subscription_status, userSubscription.trial_end_date)
    : false

  const isTrialing = userSubscription
    ? isInTrial(userSubscription.subscription_status, userSubscription.trial_end_date)
    : false

  const trialDaysRemaining = userSubscription
    ? getTrialDaysRemaining(userSubscription.trial_end_date)
    : 0

  // Feature access functions
  const canUseFeature = (feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits): boolean => {
    if (!userSubscription || !usageStats) return false

    // Unlimited access users can use everything
    if (userSubscription.unlimited_access) return true

    // Check if user has active subscription or trial
    if (!hasAccess) return false

    // Get current usage for the feature
    let currentUsage = 0
    if (feature === 'campaigns_per_month') {
      currentUsage = usageStats.campaigns_this_month || 0
    } else {
      currentUsage = usageStats[feature] || 0
    }

    // Check against plan limits
    return checkPlanLimit(userSubscription.plan_type, feature, currentUsage)
  }

  const getFeatureUsage = (feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits) => {
    let currentUsage = 0
    if (feature === 'campaigns_per_month') {
      currentUsage = usageStats?.campaigns_this_month || 0
    } else {
      currentUsage = usageStats?.[feature] || 0
    }
    const limits = getPlanLimits(userSubscription?.plan_type || null)
    const limit = limits[feature]

    return {
      used: currentUsage,
      limit: limit === -1 ? Infinity : limit,
      percentage: limit === -1 ? 0 : getUsagePercentage(userSubscription?.plan_type || null, feature, currentUsage)
    }
  }

  const value: SubscriptionContextType = {
    userSubscription,
    usageStats,
    loading: loading || authLoading,
    hasAccess,
    isTrialing,
    trialDaysRemaining,
    canUseFeature,
    getFeatureUsage,
    refreshSubscription,
    refreshUsage,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}