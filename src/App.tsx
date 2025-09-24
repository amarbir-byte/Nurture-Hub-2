
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useSubscription } from './contexts/SubscriptionContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { supabase } from './lib/supabase'
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
      <main className="page-container py-20">
        <div className="text-center animate-fade-in">
          <div className="relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-accent-400/20 to-primary-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-primary-400/20 to-accent-600/20 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>
            </div>

            <h1 className="text-5xl font-bold text-primary-900 dark:text-white sm:text-6xl md:text-7xl lg:text-8xl tracking-tight">
              Proximity-Based Marketing for{' '}
              <span className="bg-gradient-to-r from-accent-600 via-accent-700 to-primary-700 bg-clip-text text-transparent">
                Real Estate Agents
              </span>
            </h1>
            <p className="mt-8 max-w-3xl mx-auto text-xl text-primary-600 dark:text-primary-400 leading-relaxed">
              Generate leads with precision targeting. Send SMS campaigns to homeowners within 0.1km
              of your listings. <span className="font-semibold text-accent-600 dark:text-accent-400">50% cheaper than kvCORE</span> with better results.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
              <button className="btn-primary text-lg px-10 py-4 w-full sm:w-auto group">
                <span className="flex items-center justify-center">
                  Start 14-Day Free Trial
                  <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto group">
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-14S7 1.5 7 5s1.5 7 5 7 5-3.5 5-7-1.5-3.5 5-3.5z" />
                  </svg>
                  Watch Demo
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-feature">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Proximity Marketing</h3>
              <p className="text-primary-600 dark:text-primary-400 leading-relaxed">Target homeowners within 0.1km to 5km radius of your listings with precision SMS campaigns.</p>
            </div>

            <div className="card-feature">
              <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-success-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Contact Management</h3>
              <p className="text-primary-600 dark:text-primary-400 leading-relaxed">Full CRM with contact history, follow-up reminders, and smart duplicate detection.</p>
            </div>

            <div className="card-feature">
              <div className="w-16 h-16 bg-gradient-to-br from-warning-500 to-warning-700 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Affordable Pricing</h3>
              <p className="text-primary-600 dark:text-primary-400 leading-relaxed">Start at $29/month vs $500+ for competitors. Same features, better value.</p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-primary-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-primary-600 dark:text-primary-400 mb-12">Choose the plan that fits your business needs</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="card-elevated">
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Starter</h3>
              <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-6">
                $29<span className="text-xl text-primary-500 dark:text-primary-400">/month</span>
              </div>
              <ul className="text-left space-y-3 text-primary-600 dark:text-primary-400 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  100 contacts
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  50 campaigns/month
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic templates
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email support
                </li>
              </ul>
              <button className="w-full btn-secondary">Get Started</button>
            </div>
            <div className="card-elevated border-2 border-accent-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="badge bg-gradient-to-r from-accent-500 to-accent-600 text-white px-4 py-2">Most Popular</span>
              </div>
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Professional</h3>
              <div className="text-4xl font-bold bg-gradient-to-r from-accent-600 to-accent-700 bg-clip-text text-transparent mb-6">
                $79<span className="text-xl text-primary-500 dark:text-primary-400">/month</span>
              </div>
              <ul className="text-left space-y-3 text-primary-600 dark:text-primary-400 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1,000 contacts
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  200 campaigns/month
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced templates
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
              </ul>
              <button className="w-full btn-primary">Get Started</button>
            </div>
            <div className="card-elevated">
              <h3 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">Enterprise</h3>
              <div className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent mb-6">
                $199<span className="text-xl text-primary-500 dark:text-primary-400">/month</span>
              </div>
              <ul className="text-left space-y-3 text-primary-600 dark:text-primary-400 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited contacts
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited campaigns
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom templates
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  White-label options
                </li>
              </ul>
              <button className="w-full btn-secondary">Contact Sales</button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

interface DashboardHomeProps {
  onNavigate?: (page: DashboardPage) => void
}

function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { isTrialing, trialDaysRemaining } = useSubscription()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    properties: 0,
    contacts: 0,
    campaigns: 0,
    leadsGenerated: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Fetch properties count
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id)

      // Fetch contacts count
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id)

      // Fetch campaigns count
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id)

      // For now, set leads generated to 0 (can be calculated from campaign results later)
      const leadsGenerated = 0

      if (!propertiesError && !contactsError && !campaignsError) {
        setStats({
          properties: propertiesData?.length || 0,
          contacts: contactsData?.length || 0,
          campaigns: campaignsData?.length || 0,
          leadsGenerated
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Nurture Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isTrialing
            ? `You have ${trialDaysRemaining} days left in your free trial.`
            : 'Manage your properties, contacts, and marketing campaigns.'
          }
        </p>
      </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="card-stats">
            <div className="text-xl font-bold text-primary-900 dark:text-white">
              {loading ? '...' : stats.properties}
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">Properties</div>
          </div>

          <div className="card-stats">
            <div className="text-xl font-bold text-primary-900 dark:text-white">
              {loading ? '...' : stats.contacts}
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">Contacts</div>
          </div>

          <div className="card-stats">
            <div className="text-xl font-bold text-primary-900 dark:text-white">
              {loading ? '...' : stats.campaigns}
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">Campaigns</div>
          </div>

          <div className="card-stats">
            <div className="text-xl font-bold text-primary-900 dark:text-white">
              {loading ? '...' : stats.leadsGenerated}
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">Leads Generated</div>
          </div>
        </div>

        {/* Getting started */}
        <div className="card-elevated">
          <h2 className="text-2xl font-bold text-primary-900 dark:text-white mb-8">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-sm font-bold text-white">1</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-bold text-primary-900 dark:text-white mb-1">Add Your Properties</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">Upload your listings and recent sales to start your marketing campaigns.</p>
                <button 
                  onClick={() => onNavigate?.('properties')}
                  className="btn-ghost group flex items-center space-x-2 text-sm"
                >
                  <span>Add properties</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-success-500 to-success-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-sm font-bold text-white">2</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-bold text-primary-900 dark:text-white mb-1">Import Contacts</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">Upload your homeowner database to start proximity marketing.</p>
                <button 
                  onClick={() => onNavigate?.('contacts')}
                  className="btn-ghost group flex items-center space-x-2 text-sm"
                >
                  <span>Import contacts</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-warning-500 to-warning-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-sm font-bold text-white">3</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-bold text-primary-900 dark:text-white mb-1">Create Templates</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">Set up reusable SMS templates for your marketing campaigns.</p>
                <button 
                  onClick={() => onNavigate?.('templates')}
                  className="btn-ghost group flex items-center space-x-2 text-sm"
                >
                  <span>Create templates</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-start group">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <span className="text-sm font-bold text-white">4</span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-bold text-primary-900 dark:text-white mb-1">Launch Campaign</h3>
                <p className="text-sm text-primary-600 dark:text-primary-400 mb-3">Start your first proximity-based SMS marketing campaign.</p>
                <button 
                  onClick={() => onNavigate?.('marketing')}
                  className="btn-ghost group flex items-center space-x-2 text-sm"
                >
                  <span>Start marketing</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
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
        return isBetaTester ? <BetaDashboard /> : <DashboardHome onNavigate={setCurrentPage} />
      case 'admin':
        return <AdminPanel />
      default:
        return <DashboardHome onNavigate={setCurrentPage} />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
      {isBetaTester && <FeedbackWidget />}
    </DashboardLayout>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-500/20 border-t-accent-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-500/20 to-primary-500/20 blur-sm animate-pulse"></div>
          </div>
          <p className="mt-6 text-primary-600 dark:text-primary-400 font-medium">
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <PerformanceMonitor />
      <OfflineIndicator />
      {user ? <Dashboard /> : <LandingPage />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
