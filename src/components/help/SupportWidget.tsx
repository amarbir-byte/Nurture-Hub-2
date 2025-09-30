/**
 * Support Widget Component
 *
 * Quick access help widget for contextual support throughout the app
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAnalytics } from '../../lib/analytics'

interface SupportOption {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
}

interface SupportWidgetProps {
  context?: string
  className?: string
}

export const SupportWidget = ({ context = 'general', className = '' }: SupportWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { trackEngagement } = useAnalytics()

  const supportOptions: SupportOption[] = [
    {
      id: 'help-center',
      title: 'Help Center',
      description: 'Browse articles and FAQs',
      icon: '📚',
      action: () => {
        trackEngagement('support_help_center_clicked', { context })
        window.open('/help', '_blank')
        setIsOpen(false)
      }
    },
    {
      id: 'feature-tour',
      title: 'Feature Tour',
      description: 'Take a guided tour',
      icon: '🎯',
      action: () => {
        trackEngagement('support_feature_tour_clicked', { context })
        localStorage.removeItem('featureTourCompleted')
        localStorage.removeItem('featureTourSkipped')
        window.location.reload()
      }
    },
    {
      id: 'quick-start',
      title: 'Quick Start Guide',
      description: 'Step-by-step checklist',
      icon: '🚀',
      action: () => {
        trackEngagement('support_quick_start_clicked', { context })
        localStorage.removeItem('quickStartDismissed')
        window.location.reload()
      }
    },
    {
      id: 'contact-support',
      title: 'Contact Support',
      description: 'Get direct help from our team',
      icon: '💬',
      action: () => {
        trackEngagement('support_contact_clicked', { context })
        setShowContactOptions(true)
      }
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Report issues or suggest features',
      icon: '💡',
      action: () => {
        trackEngagement('support_feedback_clicked', { context })
        // This would trigger the feedback widget
        window.dispatchEvent(new CustomEvent('openFeedbackWidget'))
        setIsOpen(false)
      }
    }
  ]

  const [showContactOptions, setShowContactOptions] = useState(false)

  const contextualHelp = getContextualHelp(context)

  useEffect(() => {
    if (isOpen) {
      trackEngagement('support_widget_opened', { context })
    }
  }, [isOpen, context, trackEngagement])

  const ContactOptions = () => (
    <div className="p-4 border-t border-gray-200">
      <h4 className="font-medium text-gray-900 mb-3">Contact Beta Support</h4>
      <div className="space-y-3">
        <a
          href="https://wa.me/64xxxxxxxxx"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <span className="text-green-600 text-xl">📱</span>
          <div>
            <div className="font-medium text-green-900">WhatsApp</div>
            <div className="text-sm text-green-700">Fastest response (usually within 1 hour)</div>
          </div>
        </a>
        <a
          href="mailto:beta@nurturehub.co.nz"
          className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <span className="text-blue-600 text-xl">✉️</span>
          <div>
            <div className="font-medium text-blue-900">Email Support</div>
            <div className="text-sm text-blue-700">beta@nurturehub.co.nz</div>
          </div>
        </a>
        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
          <span className="text-purple-600 text-xl">💬</span>
          <div>
            <div className="font-medium text-purple-900">Slack Community</div>
            <div className="text-sm text-purple-700">Join beta testers chat</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => setShowContactOptions(false)}
        className="w-full mt-3 text-center text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to support options
      </button>
    </div>
  )

  if (!isOpen) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Get Help"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Contextual Help Tip */}
        {contextualHelp && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 text-lg">💡</span>
              <div>
                <h4 className="font-medium text-yellow-900 text-sm">{contextualHelp.title}</h4>
                <p className="text-yellow-800 text-xs mt-1">{contextualHelp.tip}</p>
                <button
                  onClick={() => {
                    trackEngagement('contextual_tip_dismissed', { context, tip: contextualHelp.title })
                    setShowQuickHelp(false)
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-xs mt-1"
                >
                  Got it ×
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(false)}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Support Menu */}
      <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">How can we help?</h3>
          <p className="text-sm text-gray-600 mt-1">Choose an option below to get assistance</p>
        </div>

        {!showContactOptions ? (
          <div className="p-2">
            {supportOptions.map(option => (
              <button
                key={option.id}
                onClick={option.action}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{option.title}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <ContactOptions />
        )}

        {/* Beta Badge */}
        <div className="bg-blue-50 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🚀</span>
            <span className="text-sm text-blue-800 font-medium">Beta Tester Priority Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Contextual help tips based on current page/context
 */
function getContextualHelp(context: string) {
  const helpTips: Record<string, { title: string; tip: string }> = {
    'contacts': {
      title: 'Import Contacts',
      tip: 'Use the Import button to upload REINZ CSV files or add contacts manually for proximity marketing.'
    },
    'properties': {
      title: 'Add Properties',
      tip: 'Add your listings here to enable proximity marketing and find nearby contacts.'
    },
    'marketing': {
      title: 'Proximity Search',
      tip: 'Select a property and radius to find contacts nearby, then create targeted SMS campaigns.'
    },
    'templates': {
      title: 'SMS Templates',
      tip: 'Customize these templates with your branding and use placeholders for personalization.'
    },
    'campaigns': {
      title: 'Campaign Success',
      tip: 'Include property details, your credentials, and clear next steps for best results.'
    }
  }

  return helpTips[context] || null
}

/**
 * Inline Help Component for specific features
 */
export const InlineHelp = ({
  title,
  content,
  className = ''
}: {
  title: string
  content: string
  className?: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-blue-600">❓</span>
        <span className="text-sm font-medium text-blue-900">{title}</span>
        <svg
          className={`w-4 h-4 text-blue-600 ml-auto transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className="text-sm text-blue-800">{content}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Feature Highlight Component
 */
export const FeatureHighlight = ({
  feature,
  description,
  actionText,
  actionUrl,
  onDismiss
}: {
  feature: string
  description: string
  actionText: string
  actionUrl: string
  onDismiss: () => void
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold mb-1">💡 New Feature: {feature}</h4>
          <p className="text-blue-100 text-sm mb-3">{description}</p>
          <a
            href={actionUrl}
            className="inline-flex items-center gap-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            {actionText} →
          </a>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-200 hover:text-white ml-4"
        >
          ×
        </button>
      </div>
    </div>
  )
}