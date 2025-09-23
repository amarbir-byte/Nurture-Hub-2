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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary-600">Nurture Hub</h1>
              </div>
            </div>

            {/* Navigation & User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Trial Status */}
                  {isTrialing && (
                    <div className="hidden sm:flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {trialDaysRemaining} days left in trial
                      </span>
                    </div>
                  )}

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="ml-2 text-gray-700 hidden sm:block">{user.email}</span>
                      <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                        <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                          {userSubscription?.unlimited_access ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Unlimited Access
                            </span>
                          ) : (
                            <span className="capitalize">
                              {userSubscription?.plan_type || 'Free Trial'} Plan
                            </span>
                          )}
                        </div>
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Dashboard
                        </a>
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Settings
                        </a>
                        <a
                          href="#"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Billing
                        </a>
                        <div className="border-t border-gray-100">
                          <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
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