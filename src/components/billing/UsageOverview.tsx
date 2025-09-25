// import { useSubscription } from '../../contexts/SubscriptionContext' // This import is not needed as data is passed via props

interface UsageStats {
  contacts: number
  campaigns_this_month: number
  templates: number
  properties: number
  storage_mb: number
}

interface UserSubscription {
  id: string
  subscription_status: string
  plan_type: string | null
  unlimited_access: boolean
  trial_end_date: string | null
}

interface UsageOverviewProps {
  usageStats: UsageStats | null
  userSubscription: UserSubscription | null
  isTrialing: boolean
}

export function UsageOverview({ usageStats, userSubscription, isTrialing }: UsageOverviewProps) {
  const getPlanLimits = () => {
    if (userSubscription?.unlimited_access) {
      return {
        contacts: 'Unlimited',
        campaigns: 'Unlimited',
        templates: 'Unlimited',
        properties: 'Unlimited'
      }
    }

    switch (userSubscription?.plan_type) {
      case 'starter':
        return {
          contacts: 100,
          campaigns: 50,
          templates: 'Unlimited',
          properties: 'Unlimited'
        }
      case 'professional':
        return {
          contacts: 1000,
          campaigns: 200,
          templates: 'Unlimited',
          properties: 'Unlimited'
        }
      case 'enterprise':
        return {
          contacts: 'Unlimited',
          campaigns: 'Unlimited',
          templates: 'Unlimited',
          properties: 'Unlimited'
        }
      default:
        // Trial limits
        return {
          contacts: 25,
          campaigns: 10,
          templates: 'Unlimited',
          properties: 'Unlimited'
        }
    }
  }

  const limits = getPlanLimits()

  const getUsagePercentage = (used: number, limit: string | number): number => {
    if (typeof limit === 'string') return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getUsageStatus = (percentage: number): { color: string; text: string } => {
    if (percentage >= 100) return { color: 'text-red-600', text: 'Limit reached' }
    if (percentage >= 90) return { color: 'text-red-600', text: 'Near limit' }
    if (percentage >= 75) return { color: 'text-yellow-600', text: 'High usage' }
    return { color: 'text-green-600', text: 'Good' }
  }

  const formatLimit = (limit: string | number): string => {
    return typeof limit === 'string' ? limit : limit.toLocaleString()
  }

  const usageItems = [
    {
      name: 'Contacts',
      used: usageStats?.contacts || 0,
      limit: limits.contacts,
      icon: '👥',
      description: 'Total contacts in your database'
    },
    {
      name: 'Campaigns',
      used: usageStats?.campaigns_this_month || 0,
      limit: limits.campaigns,
      icon: '📢',
      description: 'SMS campaigns sent this month'
    },
    {
      name: 'Templates',
      used: usageStats?.templates || 0,
      limit: limits.templates,
      icon: '📝',
      description: 'SMS templates created'
    },
    {
      name: 'Properties',
      used: usageStats?.properties || 0,
      limit: limits.properties,
      icon: '🏠',
      description: 'Properties in your portfolio'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Current Plan Summary */}
      <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 dark:border-primary-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-primary-900 dark:text-white">
              {userSubscription?.unlimited_access ? 'Unlimited Access' :
               isTrialing ? 'Free Trial' :
               userSubscription?.plan_type ?
               `${userSubscription.plan_type.charAt(0).toUpperCase() + userSubscription.plan_type.slice(1)} Plan` :
               'No Active Plan'}
            </h3>
            <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
              {userSubscription?.unlimited_access ? 'All features included with no limits' :
               isTrialing ? 'Explore all features with trial limits' :
               'Your current subscription plan and usage'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-bold text-primary-900 dark:text-white">
              {userSubscription?.unlimited_access ? '∞' :
               isTrialing ? 'Trial' :
               userSubscription?.plan_type === 'starter' ? '$29' :
               userSubscription?.plan_type === 'professional' ? '$79' :
               userSubscription?.plan_type === 'enterprise' ? '$199' : '$0'}
            </div>
            {!userSubscription?.unlimited_access && userSubscription?.plan_type && (
              <div className="text-sm text-primary-700 dark:text-primary-300">/month</div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Breakdown */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Usage Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {usageItems.map((item) => {
            const percentage = getUsagePercentage(item.used, item.limit)
            const status = getUsageStatus(percentage)

            return (
              <div key={item.name} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-primary-300">{item.description}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.used.toLocaleString()} / {formatLimit(item.limit)}
                    </span>
                  </div>
                </div>

                {typeof item.limit === 'number' && (
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}

                {typeof item.limit === 'string' && (
                  <div className="text-xs text-gray-500 dark:text-primary-400 mt-1">
                    No limits on this feature
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upgrade Suggestions */}
      {(isTrialing || userSubscription?.plan_type === 'starter') && (
        <div className="card bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {isTrialing ? 'Upgrade to Continue' : 'Consider Upgrading'}
              </h3>
              <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {isTrialing ? (
                  <p>
                    Your trial limits are designed to help you explore Nurture Hub.
                    Upgrade to a paid plan to unlock higher limits and continue growing your business.
                  </p>
                ) : (
                  <p>
                    You're on the Starter plan. Consider upgrading to Professional for 10x more contacts
                    and campaigns, plus advanced features like campaign analytics and priority support.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <button className="text-sm font-medium text-blue-800 underline hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200">
                  View upgrade options →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="card">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">💡 Usage Tips</h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-primary-300">
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Campaign limits reset monthly. Plan your marketing activities accordingly.
            </span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Use templates to speed up campaign creation and maintain consistent messaging.
            </span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Organize contacts with tags to create more targeted campaigns.
            </span>
          </div>
          <div className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Consider upgrading before hitting limits to avoid interruptions to your marketing.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}