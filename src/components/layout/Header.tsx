import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { AuthModal } from '../auth/AuthModal'

export function Header() {
  const { user, signOut } = useAuth()
  const { userSubscription, isTrialing, trialDaysRemaining } = useSubscription()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignInClick = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const handleSignUpClick = () => {
    setAuthMode('signup')
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
  }

  return (
    <>
      <header className="glass-nav border-b border-white/10 dark:border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-900 to-accent-700 dark:from-white dark:to-accent-300 bg-clip-text text-transparent">
                  Nurture Hub
                </h1>
              </div>
            </div>

            {/* Navigation & User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Trial Status */}
                  {isTrialing && (
                    <div className="hidden sm:flex items-center">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-warning-100 to-warning-200 dark:from-warning-900/30 dark:to-warning-800/30 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-700">
                        {trialDaysRemaining} days left in trial
                      </span>
                    </div>
                  )}

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center text-sm rounded-xl p-2 hover:bg-primary-100 dark:hover:bg-dark-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-sm font-bold text-white">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="ml-3 text-primary-700 dark:text-primary-300 hidden sm:block font-medium">{user.email}</span>
                      <svg className="ml-2 h-4 w-4 text-primary-400 dark:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-dark-800 rounded-2xl shadow-strong border border-primary-200 dark:border-dark-700 py-2 z-50 backdrop-blur-sm">
                        <div className="px-4 py-3 text-sm border-b border-primary-100 dark:border-dark-700">
                          {userSubscription?.unlimited_access ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                              Unlimited Access
                            </span>
                          ) : (
                            <span className="text-primary-600 dark:text-primary-400 font-medium capitalize">
                              {userSubscription?.plan_type || 'Free Trial'} Plan
                            </span>
                          )}
                        </div>
                        <a
                          href="#"
                          className="flex items-center px-4 py-3 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          </svg>
                          Dashboard
                        </a>
                        <a
                          href="#"
                          className="flex items-center px-4 py-3 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          </svg>
                          Settings
                        </a>
                        <a
                          href="#"
                          className="flex items-center px-4 py-3 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-dark-700 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Billing
                        </a>
                        <div className="border-t border-primary-100 dark:border-dark-700 mt-2">
                          <button
                            onClick={handleSignOut}
                            className="flex items-center w-full text-left px-4 py-3 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSignInClick}
                    className="btn-ghost"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleSignUpClick}
                    className="btn-primary"
                  >
                    Start Free Trial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Close user menu when clicking outside */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}