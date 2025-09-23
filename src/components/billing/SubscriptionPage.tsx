import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { supabase } from '../../lib/supabase'
import { PricingCards } from './PricingCards'
import { BillingHistory } from './BillingHistory'
import { UsageOverview } from './UsageOverview'

export function SubscriptionPage() {
  const { user } = useAuth()
  const { userSubscription, isTrialing, trialDaysRemaining, usageStats } = useSubscription()
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'history'>('overview')
  const [loading, setLoading] = useState(false)

  const handleCreateCheckoutSession = async (priceId: string, planType: string) => {
    setLoading(true)
    try {
      // In a real app, this would call your backend API to create a Stripe checkout session
      // For demo purposes, we'll just update the subscription status

      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          plan_type: planType,
          trial_end_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)

      if (error) throw error

      alert(`Subscription activated! In production, this would redirect to Stripe checkout for ${planType} plan.`)
      window.location.reload() // Refresh to update subscription context
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error creating checkout session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      // In a real app, this would create a Stripe customer portal session
      alert('In production, this would redirect to Stripe customer portal for billing management.')
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      alert('Error accessing billing portal. Please try again.')
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id)

      if (error) throw error

      alert('Subscription canceled. You can continue using the service until the end of your billing period.')
      window.location.reload()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Error canceling subscription. Please try again.')
    }
  }

  const getCurrentPlanPrice = () => {
    switch (userSubscription?.plan_type) {
      case 'starter':
        return '$29'
      case 'professional':
        return '$79'
      case 'enterprise':
        return '$199'
      default:
        return '$0'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
          <p className="text-gray-600">Manage your subscription, billing, and usage</p>
        </div>
        {userSubscription?.subscription_status === 'active' && (
          <button
            onClick={handleManageBilling}
            className="mt-4 sm:mt-0 btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Billing
          </button>
        )}
      </div>

      {/* Trial Warning */}
      {isTrialing && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Free Trial Ending Soon
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                You have {trialDaysRemaining} days left in your free trial.
                Choose a plan below to continue using Nurture Hub after your trial ends.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => setActiveTab('plans')}
                  className="text-sm font-medium text-yellow-800 underline hover:text-yellow-600"
                >
                  View pricing plans →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription Status */}
      {userSubscription && !isTrialing && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Current Plan</h3>
              <div className="mt-1 flex items-center space-x-4">
                <span className="text-2xl font-bold text-primary-600">
                  {userSubscription.unlimited_access ? 'Unlimited Access' :
                   userSubscription.plan_type ?
                   `${userSubscription.plan_type.charAt(0).toUpperCase() + userSubscription.plan_type.slice(1)} Plan` :
                   'No Active Plan'}
                </span>
                {!userSubscription.unlimited_access && userSubscription.plan_type && (
                  <span className="text-lg text-gray-600">
                    {getCurrentPlanPrice()}/month
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Status: <span className={`font-medium ${
                  userSubscription.subscription_status === 'active' ? 'text-green-600' :
                  userSubscription.subscription_status === 'canceled' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {userSubscription.subscription_status?.charAt(0).toUpperCase() +
                   userSubscription.subscription_status?.slice(1)}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              {userSubscription.subscription_status === 'active' && (
                <>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="btn-secondary"
                  >
                    Change Plan
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Subscription
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Usage Overview', icon: '📊' },
            { id: 'plans', name: 'Pricing Plans', icon: '💳' },
            { id: 'history', name: 'Billing History', icon: '📄' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <UsageOverview
            usageStats={usageStats}
            userSubscription={userSubscription}
            isTrialing={isTrialing}
          />
        )}

        {activeTab === 'plans' && (
          <PricingCards
            currentPlan={userSubscription?.plan_type}
            onSelectPlan={handleCreateCheckoutSession}
            loading={loading}
            isTrialing={isTrialing}
          />
        )}

        {activeTab === 'history' && (
          <BillingHistory
            userSubscription={userSubscription}
          />
        )}
      </div>
    </div>
  )
}