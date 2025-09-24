import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useTheme } from '../../contexts/ThemeContext'

type DashboardPage = 'dashboard' | 'properties' | 'contacts' | 'marketing' | 'templates' | 'settings' | 'beta' | 'admin'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage: DashboardPage
  onNavigate: (page: DashboardPage) => void
}

const getNavigationItems = (isAdmin: boolean) => {
  const baseItems = [
    { name: 'Dashboard', page: 'dashboard' as DashboardPage, icon: 'dashboard' },
    { name: 'Properties', page: 'properties' as DashboardPage, icon: 'properties' },
    { name: 'Contacts', page: 'contacts' as DashboardPage, icon: 'contacts' },
    { name: 'Marketing', page: 'marketing' as DashboardPage, icon: 'marketing' },
    { name: 'Templates', page: 'templates' as DashboardPage, icon: 'templates' },
    { name: 'Settings', page: 'settings' as DashboardPage, icon: 'settings' },
  ]

  if (isAdmin) {
    baseItems.push({ name: 'Admin', page: 'admin' as DashboardPage, icon: 'admin' })
  }

  return baseItems
}

function NavIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'dashboard':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8 7 4-4 4 4" />
        </svg>
      )
    case 'properties':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m0 0h6m0 0h3a1 1 0 0 0 1-1V10M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
        </svg>
      )
    case 'contacts':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case 'marketing':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'templates':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'settings':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'admin':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    default:
      return null
  }
}

export function DashboardLayout({ children, currentPage, onNavigate }: DashboardLayoutProps) {
  const { user, signOut } = useAuth()
  const { userSubscription, isTrialing, trialDaysRemaining, usageStats } = useSubscription()
  const { toggleTheme, actualTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = userSubscription?.is_admin || false
  const navigationItems = getNavigationItems(isAdmin)

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (sidebarOpen) {
      // Disable body scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable body scroll
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to ensure scroll is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-dark-950/50 dark:bg-dark-950/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 glass-nav transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-all duration-300 ease-smooth lg:transition-none`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-8 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-900 to-accent-700 dark:from-white dark:to-accent-300 bg-clip-text text-transparent">
              Nurture Hub
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-dark-800 transition-all duration-200"
              title={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {actualTheme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Close Button (Mobile) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-dark-800 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Trial status */}
        {isTrialing && (
          <div className="p-6 border-b border-white/10 dark:border-white/5">
            <div className="bg-gradient-to-r from-warning-500/10 to-warning-600/10 dark:from-warning-400/10 dark:to-warning-500/10 border border-warning-200/50 dark:border-warning-600/50 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-warning-400 to-warning-600 rounded-xl flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warning-700 dark:text-warning-300">
                    <span className="font-bold">{trialDaysRemaining} days</span> left in trial
                  </p>
                  <button className="mt-2 text-xs font-medium text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 transition-colors">
                    Upgrade to Pro →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-6 py-8 space-y-2">
          {navigationItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => {
                onNavigate(item.page)
                setSidebarOpen(false) // Close mobile sidebar when navigating
              }}
              className={`nav-link w-full animate-enter-stagger ${
                currentPage === item.page
                  ? 'nav-link-active'
                  : 'nav-link-inactive'
              }`}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <NavIcon icon={item.icon} />
              <span className="ml-3 font-semibold">{item.name}</span>
              {currentPage === item.page && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* Usage stats */}
        {usageStats && (
          <div className="p-6 border-t border-white/10 dark:border-white/5">
            <h3 className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wider mb-4">
              Usage This Month
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Contacts', value: usageStats.contacts, icon: '👥', color: 'from-accent-500 to-accent-600' },
                { label: 'Campaigns', value: usageStats.campaigns_this_month, icon: '📢', color: 'from-primary-500 to-primary-600' },
                { label: 'Templates', value: usageStats.templates, icon: '📝', color: 'from-success-500 to-success-600' },
              ].map((stat, index) => (
                <div key={stat.label} className="animate-enter-stagger" style={{animationDelay: `${(index + 5) * 0.1}s`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center text-sm`}>
                        {stat.icon}
                      </div>
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{stat.label}</span>
                    </div>
                    <span className="text-lg font-bold text-primary-900 dark:text-white">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User menu */}
        <div className="p-6 border-t border-white/10 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 border-2 border-white dark:border-dark-900 rounded-full"></div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-900 dark:text-white truncate">
                {user?.email}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="badge badge-primary">
                  {userSubscription?.unlimited_access ? 'Unlimited Access' :
                   userSubscription?.plan_type ? `${userSubscription.plan_type} Plan` : 'Free Trial'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-primary-500 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-dark-800 hover:text-error-600 dark:hover:text-error-400 transition-all duration-200"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-72 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden glass-nav px-6 py-4 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-dark-800 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Mobile theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-dark-800 transition-all duration-200"
              title={`Switch to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {actualTheme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-8 animate-fade-in overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}