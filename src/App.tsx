
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useSubscription } from './contexts/SubscriptionContext'
import { Header } from './components/layout/Header'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { PropertiesPage } from './components/properties/PropertiesPage'
import { ContactsPage } from './components/contacts/ContactsPage'
import { TemplatesPage } from './components/templates/TemplatesPage'
import { MarketingPage } from './components/marketing/MarketingPage'
import { SubscriptionPage } from './components/billing/SubscriptionPage'
import { AdminPanel } from './components/admin/AdminPanel'
import { OfflineIndicator } from './components/common/OfflineIndicator'
import { PerformanceMonitor } from './components/common/PerformanceMonitor'
import { FeedbackWidget } from './components/beta/FeedbackWidget'
import { BetaDashboard } from './components/beta/BetaDashboard'
import { ensureTablesExist } from './utils/databaseInit'

type DashboardPage = 'dashboard' | 'properties' | 'contacts' | 'marketing' | 'templates' | 'settings' | 'beta' | 'admin'

function LandingPage() {
  return (
    <>
      <Header />
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Proximity-Based Marketing for{' '}
            <span className="text-primary-600">Real Estate Agents</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Generate leads with precision targeting. Send SMS campaigns to homeowners within 0.1km
            of your listings. 50% cheaper than kvCORE with better results.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button className="btn-primary text-lg px-8 py-3 w-full sm:w-auto">
              Start 14-Day Free Trial
            </button>
            <button className="btn-secondary text-lg px-8 py-3 w-full sm:w-auto">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Proximity Marketing</h3>
              <p className="text-gray-600">Target homeowners within 0.1km to 5km radius of your listings with precision SMS campaigns.</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Management</h3>
              <p className="text-gray-600">Full CRM with contact history, follow-up reminders, and smart duplicate detection.</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Affordable Pricing</h3>
              <p className="text-gray-600">Start at $29/month vs $500+ for competitors. Same features, better value.</p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Simple, Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Starter</h3>
              <div className="text-3xl font-bold text-primary-600 mb-4">$29<span className="text-lg text-gray-600">/month</span></div>
              <ul className="text-left space-y-2 text-gray-600">
                <li>• 100 contacts</li>
                <li>• 50 campaigns/month</li>
                <li>• Basic templates</li>
                <li>• Email support</li>
              </ul>
            </div>
            <div className="card border-2 border-primary-500">
              <span className="badge bg-primary-100 text-primary-800 mb-2">Most Popular</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional</h3>
              <div className="text-3xl font-bold text-primary-600 mb-4">$79<span className="text-lg text-gray-600">/month</span></div>
              <ul className="text-left space-y-2 text-gray-600">
                <li>• 1,000 contacts</li>
                <li>• 200 campaigns/month</li>
                <li>• Advanced templates</li>
                <li>• Priority support</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-3xl font-bold text-primary-600 mb-4">$199<span className="text-lg text-gray-600">/month</span></div>
              <ul className="text-left space-y-2 text-gray-600">
                <li>• Unlimited contacts</li>
                <li>• Unlimited campaigns</li>
                <li>• Custom templates</li>
                <li>• White-label options</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function DashboardHome() {
  const { isTrialing, trialDaysRemaining } = useSubscription()

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Nurture Hub</h1>
        <p className="text-gray-600">
          {isTrialing
            ? `You have ${trialDaysRemaining} days left in your free trial.`
            : 'Manage your properties, contacts, and marketing campaigns.'
          }
        </p>
      </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Properties</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Contacts</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Campaigns</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Leads Generated</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting started */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">1</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Add Your Properties</h3>
                <p className="text-sm text-gray-500">Upload your listings and recent sales to start your marketing campaigns.</p>
                <button className="mt-2 text-sm text-primary-600 hover:text-primary-500">
                  Add properties →
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">2</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Import Contacts</h3>
                <p className="text-sm text-gray-500">Upload your homeowner database to start proximity marketing.</p>
                <button className="mt-2 text-sm text-primary-600 hover:text-primary-500">
                  Import contacts →
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">3</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Create Templates</h3>
                <p className="text-sm text-gray-500">Set up reusable SMS templates for your marketing campaigns.</p>
                <button className="mt-2 text-sm text-primary-600 hover:text-primary-500">
                  Create templates →
                </button>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">4</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Launch Campaign</h3>
                <p className="text-sm text-gray-500">Start your first proximity-based SMS marketing campaign.</p>
                <button className="mt-2 text-sm text-primary-600 hover:text-primary-500">
                  Start marketing →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
}

function Dashboard() {
  const [currentPage, setCurrentPage] = useState<DashboardPage>('dashboard')
  const { userSubscription } = useSubscription()

  // Initialize database tables on component mount
  useEffect(() => {
    ensureTablesExist()
  }, [])

  // Check if user is beta tester (extended trial)
  const isBetaTester = userSubscription?.trial_end_date &&
    new Date(userSubscription.trial_end_date) > new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // More than 20 days trial

  const renderPage = () => {
    switch (currentPage) {
      case 'properties':
        return <PropertiesPage />
      case 'contacts':
        return <ContactsPage />
      case 'marketing':
        return <MarketingPage />
      case 'templates':
        return <TemplatesPage />
      case 'settings':
        return <SubscriptionPage />
      case 'beta':
        return isBetaTester ? <BetaDashboard /> : <DashboardHome />
      case 'admin':
        return <AdminPanel />
      default:
        return <DashboardHome />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      {isBetaTester && <FeedbackWidget />}
    </DashboardLayout>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PerformanceMonitor />
      <OfflineIndicator />
      {user ? <Dashboard /> : <LandingPage />}
    </div>
  )
}

export default App
