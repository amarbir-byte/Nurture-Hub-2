interface PricingCardsProps {
  currentPlan?: string
  onSelectPlan: (priceId: string, planType: string) => void
  loading: boolean
  isTrialing: boolean
}

const plans = [
  {
    name: 'Starter',
    planType: 'starter',
    price: 29,
    priceId: 'price_starter_monthly',
    description: 'Perfect for individual agents getting started',
    features: [
      '100 contacts',
      '50 campaigns per month',
      'Basic SMS templates',
      'Property management',
      'Email support',
      'Mobile app access'
    ],
    popular: false,
    color: 'blue'
  },
  {
    name: 'Professional',
    planType: 'professional',
    price: 79,
    priceId: 'price_professional_monthly',
    description: 'Best for growing real estate businesses',
    features: [
      '1,000 contacts',
      '200 campaigns per month',
      'Advanced SMS templates',
      'CSV import/export',
      'Campaign analytics',
      'Priority support',
      'Custom branding'
    ],
    popular: true,
    color: 'primary'
  },
  {
    name: 'Enterprise',
    planType: 'enterprise',
    price: 199,
    priceId: 'price_enterprise_monthly',
    description: 'For teams and large agencies',
    features: [
      'Unlimited contacts',
      'Unlimited campaigns',
      'Custom templates',
      'White-label options',
      'API access',
      '24/7 phone support',
      'Dedicated account manager',
      'Custom integrations'
    ],
    popular: false,
    color: 'purple'
  }
]

export function PricingCards({ currentPlan, onSelectPlan, loading, isTrialing }: PricingCardsProps) {
  const getButtonText = (planType: string) => {
    if (loading) return 'Processing...'
    if (currentPlan === planType) return 'Current Plan'
    if (isTrialing) return 'Start Free Trial'
    return 'Upgrade Now'
  }

  const getButtonDisabled = (planType: string) => {
    return loading || currentPlan === planType
  }

  const getCardClassName = (plan: any) => {
    let baseClass = "card relative"

    if (plan.popular) {
      baseClass += " border-2 border-primary-500 shadow-lg"
    }

    if (currentPlan === plan.planType) {
      baseClass += " bg-gray-50 border-gray-300"
    }

    return baseClass
  }

  const getButtonClassName = (plan: any) => {
    if (currentPlan === plan.planType) {
      return "w-full btn-ghost cursor-not-allowed"
    }

    if (plan.popular) {
      return "w-full btn-primary"
    }

    return "w-full btn-secondary"
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="mt-4 text-lg text-gray-600">
          Select the perfect plan for your real estate business. All plans include our core proximity marketing features.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <div className="bg-gray-100 p-1 rounded-lg">
            <div className="bg-white px-3 py-1 rounded text-sm font-medium text-gray-900">
              Monthly billing
            </div>
          </div>
          <span className="ml-4 text-sm text-gray-500">
            Save 20% with annual billing (coming soon)
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.planType} className={getCardClassName(plan)}>
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge bg-primary-600 text-white px-4 py-1">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center pb-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-lg text-gray-600">/month</span>
              </div>
            </div>

            {/* Features List */}
            <div className="py-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                onClick={() => onSelectPlan(plan.priceId, plan.planType)}
                disabled={getButtonDisabled(plan.planType)}
                className={getButtonClassName(plan)}
              >
                {getButtonText(plan.planType)}
              </button>
            </div>

            {/* Current Plan Indicator */}
            {currentPlan === plan.planType && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ Active
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Enterprise Contact */}
      <div className="card bg-gray-50 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Need something custom?</h3>
        <p className="text-gray-600 mb-4">
          Contact us for enterprise solutions, custom integrations, or volume discounts.
        </p>
        <button className="btn-secondary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Sales
        </button>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 text-center">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Can I change my plan anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately,
              and you'll be charged prorata for the remaining billing period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">What happens to my data if I cancel?</h4>
            <p className="text-sm text-gray-600">
              Your data remains accessible for 30 days after cancellation. You can export your
              contacts, properties, and campaign history during this period.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Do you offer annual discounts?</h4>
            <p className="text-sm text-gray-600">
              Yes! Annual subscriptions save you 20% compared to monthly billing.
              Contact us to switch to annual billing for your current plan.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Is there a setup fee?</h4>
            <p className="text-sm text-gray-600">
              No setup fees. All plans include onboarding support, data import assistance,
              and access to our knowledge base and video tutorials.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}