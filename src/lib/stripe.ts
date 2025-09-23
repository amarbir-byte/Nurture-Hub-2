import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  console.warn('Missing Stripe publishable key. Stripe functionality will be disabled.')
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null

export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    interval: 'month',
    features: [
      '100 contacts',
      '50 campaigns per month',
      'Basic SMS templates',
      'Email support',
      'Property management',
      'Contact CRM'
    ],
    limits: {
      contacts: 100,
      campaigns_per_month: 50,
      templates: 5,
      storage_mb: 100
    },
    stripePriceId: process.env.NODE_ENV === 'production'
      ? 'price_starter_prod'
      : 'price_starter_test',
    popular: false
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 79,
    interval: 'month',
    features: [
      '1,000 contacts',
      '200 campaigns per month',
      'Advanced SMS templates',
      'Priority support',
      'Advanced analytics',
      'Campaign automation',
      'Follow-up reminders'
    ],
    limits: {
      contacts: 1000,
      campaigns_per_month: 200,
      templates: 25,
      storage_mb: 500
    },
    stripePriceId: process.env.NODE_ENV === 'production'
      ? 'price_professional_prod'
      : 'price_professional_test',
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited contacts',
      'Unlimited campaigns',
      'Custom SMS templates',
      'Dedicated support',
      'Advanced integrations',
      'White-label options',
      'API access',
      'Custom reporting'
    ],
    limits: {
      contacts: -1, // -1 means unlimited
      campaigns_per_month: -1,
      templates: -1,
      storage_mb: -1
    },
    stripePriceId: process.env.NODE_ENV === 'production'
      ? 'price_enterprise_prod'
      : 'price_enterprise_test',
    popular: false
  }
} as const

export type PlanId = keyof typeof SUBSCRIPTION_PLANS

// Utility functions for plan limits
export function getPlanLimits(planId: PlanId | null) {
  if (!planId || !SUBSCRIPTION_PLANS[planId]) {
    return SUBSCRIPTION_PLANS.starter.limits
  }
  return SUBSCRIPTION_PLANS[planId].limits
}

export function checkPlanLimit(planId: PlanId | null, feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits, currentUsage: number): boolean {
  const limits = getPlanLimits(planId)
  const limit = limits[feature]

  // -1 means unlimited
  if (limit === -1) return true

  return currentUsage < limit
}

export function getUsagePercentage(planId: PlanId | null, feature: keyof typeof SUBSCRIPTION_PLANS.starter.limits, currentUsage: number): number {
  const limits = getPlanLimits(planId)
  const limit = limits[feature]

  // -1 means unlimited
  if (limit === -1) return 0

  return Math.min((currentUsage / limit) * 100, 100)
}

// Create checkout session
export async function createCheckoutSession(priceId: string, customerId?: string) {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        customerId,
      }),
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const { sessionId } = await response.json()
    return { sessionId, error: null }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return { sessionId: null, error: error as Error }
  }
}

// Create customer portal session
export async function createCustomerPortalSession(customerId: string) {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
      }),
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const { url } = await response.json()
    return { url, error: null }
  } catch (error) {
    console.error('Error creating portal session:', error)
    return { url: null, error: error as Error }
  }
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Check if user has active subscription
export function hasActiveSubscription(subscriptionStatus: string | null): boolean {
  return subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
}

// Check if user is in trial
export function isInTrial(subscriptionStatus: string | null, trialEndDate: string | null): boolean {
  if (subscriptionStatus !== 'trialing' || !trialEndDate) return false

  const trialEnd = new Date(trialEndDate)
  const now = new Date()

  return now < trialEnd
}

// Get days remaining in trial
export function getTrialDaysRemaining(trialEndDate: string | null): number {
  if (!trialEndDate) return 0

  const trialEnd = new Date(trialEndDate)
  const now = new Date()
  const diffTime = trialEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}