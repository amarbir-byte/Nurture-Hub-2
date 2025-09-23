import { useSubscription } from '../contexts/SubscriptionContext'

interface UsageLimits {
  contacts: number | 'unlimited'
  campaigns: number | 'unlimited'
  templates: number | 'unlimited'
  properties: number | 'unlimited'
}

interface UsageCheck {
  allowed: boolean
  remaining: number | 'unlimited'
  limitReached: boolean
  warningThreshold: boolean // true if usage > 80%
}

export function useUsageLimits() {
  const { userSubscription, usageStats, isTrialing } = useSubscription()

  const getLimits = (): UsageLimits => {
    if (userSubscription?.unlimited_access) {
      return {
        contacts: 'unlimited',
        campaigns: 'unlimited',
        templates: 'unlimited',
        properties: 'unlimited'
      }
    }

    switch (userSubscription?.plan_type) {
      case 'starter':
        return {
          contacts: 100,
          campaigns: 50,
          templates: 'unlimited',
          properties: 'unlimited'
        }
      case 'professional':
        return {
          contacts: 1000,
          campaigns: 200,
          templates: 'unlimited',
          properties: 'unlimited'
        }
      case 'enterprise':
        return {
          contacts: 'unlimited',
          campaigns: 'unlimited',
          templates: 'unlimited',
          properties: 'unlimited'
        }
      default:
        // Trial limits
        return {
          contacts: 25,
          campaigns: 10,
          templates: 'unlimited',
          properties: 'unlimited'
        }
    }
  }

  const checkUsage = (feature: keyof UsageLimits): UsageCheck => {
    const limits = getLimits()
    const limit = limits[feature]

    if (limit === 'unlimited') {
      return {
        allowed: true,
        remaining: 'unlimited',
        limitReached: false,
        warningThreshold: false
      }
    }

    const usageKey = feature === 'campaigns' ? 'campaigns_this_month' : feature as keyof typeof usageStats
    const used = usageStats?.[usageKey] || 0
    const remaining = Math.max(0, limit - used)
    const limitReached = used >= limit
    const warningThreshold = used >= (limit * 0.8)

    return {
      allowed: !limitReached,
      remaining,
      limitReached,
      warningThreshold
    }
  }

  const canAddContact = (): UsageCheck => {
    return checkUsage('contacts')
  }

  const canCreateCampaign = (): UsageCheck => {
    return checkUsage('campaigns')
  }

  const canCreateTemplate = (): UsageCheck => {
    return checkUsage('templates')
  }

  const canAddProperty = (): UsageCheck => {
    return checkUsage('properties')
  }

  const getUpgradeMessage = (feature: keyof UsageLimits): string => {
    if (isTrialing) {
      return `You've reached your trial limit for ${feature}. Upgrade to a paid plan to continue.`
    }

    const currentPlan = userSubscription?.plan_type || 'trial'

    switch (feature) {
      case 'contacts':
        if (currentPlan === 'starter') {
          return 'Upgrade to Professional for 1,000 contacts or Enterprise for unlimited contacts.'
        }
        return 'Upgrade to Enterprise for unlimited contacts.'

      case 'campaigns':
        if (currentPlan === 'starter') {
          return 'Upgrade to Professional for 200 campaigns/month or Enterprise for unlimited campaigns.'
        }
        return 'Upgrade to Enterprise for unlimited campaigns.'

      default:
        return 'Upgrade your plan to increase limits and unlock more features.'
    }
  }

  return {
    limits: getLimits(),
    canAddContact,
    canCreateCampaign,
    canCreateTemplate,
    canAddProperty,
    getUpgradeMessage,
    checkUsage,
    isTrialing,
    currentPlan: userSubscription?.plan_type || 'trial'
  }
}