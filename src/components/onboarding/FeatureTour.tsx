/**
 * Interactive Feature Tour Component
 *
 * Guided walkthrough of key features for new beta users
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface TourStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: 'top' | 'bottom' | 'left' | 'right'
  highlightClass?: string
  actionText?: string
  actionUrl?: string
}

interface FeatureTourProps {
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
}

export const FeatureTour = ({ isActive, onComplete, onSkip }: FeatureTourProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const tourSteps: TourStep[] = [
    {
      id: 'dashboard',
      title: '🏠 Welcome to Your Dashboard',
      description: 'This is your command center. See your recent activity, quick stats, and navigation to all features.',
      targetSelector: '.dashboard-overview',
      position: 'bottom'
    },
    {
      id: 'contacts',
      title: '👥 Contact Management',
      description: 'Import and manage your contacts here. Upload REINZ CSV files or add contacts manually.',
      targetSelector: 'nav [href="/contacts"]',
      position: 'right',
      actionText: 'Go to Contacts',
      actionUrl: '/contacts'
    },
    {
      id: 'properties',
      title: '🏘️ Property Database',
      description: 'Add your listings and properties. Each property becomes a marketing hub for proximity campaigns.',
      targetSelector: 'nav [href="/properties"]',
      position: 'right',
      actionText: 'Go to Properties',
      actionUrl: '/properties'
    },
    {
      id: 'marketing',
      title: '🎯 Proximity Marketing',
      description: 'This is where the magic happens! Find contacts near your properties and launch targeted campaigns.',
      targetSelector: 'nav [href="/marketing"]',
      position: 'right',
      actionText: 'Try Marketing',
      actionUrl: '/marketing'
    },
    {
      id: 'templates',
      title: '📝 SMS Templates',
      description: 'Professional SMS templates optimized for real estate. Customize and save your own.',
      targetSelector: 'nav [href="/templates"]',
      position: 'right',
      actionText: 'View Templates',
      actionUrl: '/templates'
    },
    {
      id: 'subscription',
      title: '💳 Subscription & Billing',
      description: 'Manage your plan, track usage, and billing. Beta users get special benefits!',
      targetSelector: 'nav [href="/subscription"]',
      position: 'right'
    }
  ]

  useEffect(() => {
    if (isActive) {
      setIsVisible(true)
      // Add overlay class to body
      document.body.classList.add('tour-active')
    } else {
      setIsVisible(false)
      document.body.classList.remove('tour-active')
    }

    return () => {
      document.body.classList.remove('tour-active')
    }
  }, [isActive])

  const currentTourStep = tourSteps[currentStep]

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    localStorage.setItem('featureTourCompleted', 'true')
    localStorage.setItem('featureTourCompletedAt', new Date().toISOString())
    onComplete()
  }

  const skipTour = () => {
    localStorage.setItem('featureTourSkipped', 'true')
    onSkip()
  }

  const navigateToStep = (url: string) => {
    if (url) {
      window.location.href = url
    }
  }

  const getTooltipPosition = () => {
    const position = currentTourStep.position
    switch (position) {
      case 'top':
        return 'bottom-full mb-2'
      case 'bottom':
        return 'top-full mt-2'
      case 'left':
        return 'right-full mr-2'
      case 'right':
        return 'left-full ml-2'
      default:
        return 'top-full mt-2'
    }
  }

  if (!isVisible || !currentTourStep) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 pointer-events-none" />

      {/* Tour Tooltip */}
      <div className="fixed z-50 max-w-sm">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentTourStep.title}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {currentStep + 1} of {tourSteps.length}
              </span>
            </div>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Skip Tour
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">
            {currentTourStep.description}
          </p>

          {/* Action Button */}
          {currentTourStep.actionUrl && (
            <div className="mb-4">
              <button
                onClick={() => navigateToStep(currentTourStep.actionUrl!)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                {currentTourStep.actionText || 'Try it now'} →
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Tooltip Pointer */}
        <div className={`absolute w-3 h-3 bg-white border border-gray-200 transform rotate-45 ${
          currentTourStep.position === 'top' ? 'top-full -mt-2 left-6' :
          currentTourStep.position === 'bottom' ? 'bottom-full -mb-2 left-6' :
          currentTourStep.position === 'left' ? 'left-full -ml-2 top-6' :
          'right-full -mr-2 top-6'
        }`} />
      </div>

      {/* Highlight Target Element */}
      <style>{`
        .tour-active ${currentTourStep.targetSelector} {
          position: relative;
          z-index: 41;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
          border-radius: 8px;
        }
      `}</style>
    </>
  )
}

/**
 * Hook to manage feature tour state
 */
export const useFeatureTour = () => {
  const [shouldShowTour, setShouldShowTour] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is new and hasn't completed tour
    const tourCompleted = localStorage.getItem('featureTourCompleted')
    const tourSkipped = localStorage.getItem('featureTourSkipped')
    const betaOnboardingCompleted = localStorage.getItem('betaOnboardingCompleted')

    // Show tour if:
    // 1. User is authenticated
    // 2. Beta onboarding is completed
    // 3. Feature tour hasn't been completed or skipped
    if (user && betaOnboardingCompleted && !tourCompleted && !tourSkipped) {
      // Delay tour start slightly to allow page to load
      setTimeout(() => setShouldShowTour(true), 1000)
    }
  }, [user])

  const startTour = () => setShouldShowTour(true)
  const completeTour = () => setShouldShowTour(false)
  const skipTour = () => setShouldShowTour(false)

  return {
    shouldShowTour,
    startTour,
    completeTour,
    skipTour
  }
}

/**
 * Tour Progress Component
 * Shows tour progress in settings or help section
 */
export const TourProgress = () => {
  const tourCompleted = localStorage.getItem('featureTourCompleted')
  const tourCompletedAt = localStorage.getItem('featureTourCompletedAt')
  const { startTour } = useFeatureTour()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Feature Tour</h3>
          <p className="text-sm text-gray-600">
            {tourCompleted
              ? `Completed ${new Date(tourCompletedAt || '').toLocaleDateString()}`
              : 'Take a guided tour of key features'
            }
          </p>
        </div>
        <button
          onClick={startTour}
          className="btn-secondary text-sm"
        >
          {tourCompleted ? 'Retake Tour' : 'Start Tour'}
        </button>
      </div>
    </div>
  )
}