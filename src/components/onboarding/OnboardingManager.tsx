/**
 * Onboarding Manager Component
 *
 * Orchestrates the complete onboarding experience for new users
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { BetaOnboarding } from '../beta/BetaOnboarding'
import { FeatureTour, useFeatureTour } from './FeatureTour'
import { QuickStartGuide } from './QuickStartGuide'

type OnboardingPhase = 'beta' | 'tour' | 'quickstart' | 'complete'

export const OnboardingManager = () => {
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase | null>(null)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const { user } = useAuth()
  const { shouldShowTour, completeTour, skipTour } = useFeatureTour()

  useEffect(() => {
    if (!user) {
      setCurrentPhase(null)
      return
    }

    // Check onboarding state
    const betaOnboardingCompleted = localStorage.getItem('betaOnboardingCompleted')
    const featureTourCompleted = localStorage.getItem('featureTourCompleted')
    const featureTourSkipped = localStorage.getItem('featureTourSkipped')
    const quickStartDismissed = localStorage.getItem('quickStartDismissed')

    // Determine current phase
    if (!betaOnboardingCompleted) {
      setCurrentPhase('beta')
    } else if (!featureTourCompleted && !featureTourSkipped) {
      setCurrentPhase('tour')
    } else if (!quickStartDismissed) {
      setCurrentPhase('quickstart')
      setShowQuickStart(true)
    } else {
      setCurrentPhase('complete')
    }
  }, [user])

  const handleBetaOnboardingComplete = () => {
    localStorage.setItem('betaOnboardingCompleted', 'true')
    localStorage.setItem('betaOnboardingCompletedAt', new Date().toISOString())
    setCurrentPhase('tour')
  }

  const handleFeatureTourComplete = () => {
    completeTour()
    setCurrentPhase('quickstart')
    setShowQuickStart(true)
  }

  const handleFeatureTourSkip = () => {
    skipTour()
    setCurrentPhase('quickstart')
    setShowQuickStart(true)
  }

  // const handleQuickStartDismiss = () => {
  //   setShowQuickStart(false)
  //   setCurrentPhase('complete')
  // }

  // Don't render anything if user is not authenticated
  if (!user) return null

  return (
    <>
      {/* Beta Onboarding Modal */}
      {currentPhase === 'beta' && (
        <BetaOnboarding onComplete={handleBetaOnboardingComplete} />
      )}

      {/* Feature Tour */}
      {currentPhase === 'tour' && (
        <FeatureTour
          isActive={shouldShowTour}
          onComplete={handleFeatureTourComplete}
          onSkip={handleFeatureTourSkip}
        />
      )}

      {/* Quick Start Guide */}
      {(currentPhase === 'quickstart' || currentPhase === 'complete') && showQuickStart && (
        <QuickStartGuide />
      )}

      {/* Welcome Banner for Returning Users */}
      {currentPhase === 'complete' && !showQuickStart && (
        <WelcomeBackBanner />
      )}
    </>
  )
}

/**
 * Welcome Back Banner for users who have completed onboarding
 */
const WelcomeBackBanner = () => {
  const [isVisible, setIsVisible] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // Show banner occasionally for returning users
    const lastShown = localStorage.getItem('welcomeBackBannerLastShown')
    const daysSinceLastShown = lastShown
      ? Math.floor((Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24))
      : 7

    // Show banner if it's been more than 3 days since last shown
    if (daysSinceLastShown >= 3) {
      setIsVisible(true)
    }
  }, [])

  const dismissBanner = () => {
    setIsVisible(false)
    localStorage.setItem('welcomeBackBannerLastShown', Date.now().toString())
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <h3 className="font-medium">Welcome back, {user?.user_metadata?.full_name || 'Agent'}!</h3>
              <p className="text-sm text-blue-100">
                Ready to find your next leads? Try proximity marketing or check your campaign performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/marketing"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Start Marketing
            </a>
            <button
              onClick={dismissBanner}
              className="text-blue-200 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage onboarding state across the app
 */
export const useOnboarding = () => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)

  useEffect(() => {
    const betaCompleted = localStorage.getItem('betaOnboardingCompleted')
    const tourCompleted = localStorage.getItem('featureTourCompleted') || localStorage.getItem('featureTourSkipped')

    setIsOnboardingComplete(!!(betaCompleted && tourCompleted))
  }, [])

  const restartOnboarding = () => {
    localStorage.removeItem('betaOnboardingCompleted')
    localStorage.removeItem('featureTourCompleted')
    localStorage.removeItem('featureTourSkipped')
    localStorage.removeItem('quickStartDismissed')
    localStorage.removeItem('quickStartCompleted')
    window.location.reload()
  }

  const getOnboardingProgress = () => {
    const steps = [
      { id: 'beta', completed: !!localStorage.getItem('betaOnboardingCompleted') },
      { id: 'tour', completed: !!(localStorage.getItem('featureTourCompleted') || localStorage.getItem('featureTourSkipped')) },
      { id: 'quickstart', completed: !!localStorage.getItem('quickStartDismissed') }
    ]

    const completedSteps = steps.filter(step => step.completed).length
    return {
      steps,
      completedSteps,
      totalSteps: steps.length,
      percentage: Math.round((completedSteps / steps.length) * 100)
    }
  }

  return {
    isOnboardingComplete,
    restartOnboarding,
    getOnboardingProgress
  }
}

/**
 * Onboarding Status Component for Settings/Help
 */
export const OnboardingStatus = () => {
  const { getOnboardingProgress, restartOnboarding } = useOnboarding()
  const progress = getOnboardingProgress()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Onboarding Progress</h3>
        <span className="text-sm text-gray-500">{progress.percentage}% complete</span>
      </div>

      <div className="space-y-2 mb-4">
        {progress.steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              step.completed ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {step.completed && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
              {step.id === 'beta' && 'Beta Setup'}
              {step.id === 'tour' && 'Feature Tour'}
              {step.id === 'quickstart' && 'Quick Start'}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={restartOnboarding}
        className="btn-secondary text-sm w-full"
      >
        Restart Onboarding
      </button>
    </div>
  )
}