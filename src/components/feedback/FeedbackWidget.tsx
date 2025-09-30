/**
 * Feedback Collection Widget
 *
 * Comprehensive feedback system for beta testing and user input
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useAnalytics, betaAnalytics } from '../../lib/analytics'

type FeedbackType = 'bug' | 'feature_request' | 'general' | 'nps'
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical'

interface FeedbackData {
  type: FeedbackType
  title: string
  description: string
  priority: FeedbackPriority
  rating?: number
  category?: string
  page?: string
  userAgent?: string
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

interface FeedbackWidgetProps {
  trigger?: 'floating' | 'inline' | 'modal'
  defaultType?: FeedbackType
  onSubmit?: (feedback: FeedbackData) => void
}

export const FeedbackWidget = ({
  trigger = 'floating',
  defaultType = 'general',
  onSubmit
}: FeedbackWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(defaultType)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as FeedbackPriority,
    rating: 0,
    category: '',
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { user } = useAuth()
  const { trackEngagement } = useAnalytics()

  const feedbackTypes = [
    { id: 'bug', label: 'Bug Report', icon: '🐛', description: 'Something isn\'t working correctly' },
    { id: 'feature_request', label: 'Feature Request', icon: '💡', description: 'Suggest a new feature or improvement' },
    { id: 'general', label: 'General Feedback', icon: '💬', description: 'Share your thoughts or suggestions' },
    { id: 'nps', label: 'Rate Experience', icon: '⭐', description: 'How likely are you to recommend us?' }
  ]

  const categories = {
    bug: ['UI/UX Issue', 'Performance', 'Data Loss', 'Login Problem', 'Feature Not Working', 'Other'],
    feature_request: ['Contact Management', 'Property Management', 'Marketing Tools', 'SMS Templates', 'Analytics', 'Integration', 'Other'],
    general: ['User Experience', 'Documentation', 'Training', 'Support', 'Pricing', 'Other'],
    nps: ['Overall Experience']
  }

  useEffect(() => {
    if (isOpen) {
      trackEngagement('feedback_widget_opened', { feedback_type: feedbackType })
    }
  }, [isOpen, feedbackType, trackEngagement])

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const feedbackData: FeedbackData = {
      type: feedbackType,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      rating: feedbackType === 'nps' ? formData.rating : undefined,
      category: formData.category,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: user?.id,
      metadata: {
        userEmail: formData.email || user?.email,
        betaUser: true,
        appVersion: '1.0.0-beta'
      }
    }

    try {
      // Submit to backend API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      })

      if (response.ok) {
        // Track successful submission
        betaAnalytics.trackFeedbackSubmission(feedbackType as 'bug' | 'feature_request' | 'general', formData.rating)

        // Call onSubmit callback if provided
        onSubmit?.(feedbackData)

        setSubmitted(true)

        // Reset form after delay
        setTimeout(() => {
          setIsOpen(false)
          setStep(1)
          setSubmitted(false)
          setFormData({
            title: '',
            description: '',
            priority: 'medium',
            rating: 0,
            category: '',
            email: ''
          })
        }, 2000)
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Feedback submission error:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderTrigger = () => {
    if (trigger === 'floating') {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-30"
          title="Send Feedback"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )
    }
    return null
  }

  const renderFeedbackForm = () => {
    if (submitted) {
      return (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you!</h3>
          <p className="text-gray-600">Your feedback has been submitted successfully.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Step 1: Choose Type */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you like to share?</h3>
            <div className="grid grid-cols-1 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setFeedbackType(type.id as FeedbackType)
                    setStep(2)
                  }}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{type.label}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Feedback Form */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-gray-600"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {feedbackTypes.find(t => t.id === feedbackType)?.icon} {feedbackTypes.find(t => t.id === feedbackType)?.label}
              </h3>
            </div>

            <div className="space-y-4">
              {/* NPS Rating */}
              {feedbackType === 'nps' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How likely are you to recommend Nurture Hub to a fellow agent? (0-10)
                  </label>
                  <div className="flex gap-2">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setFormData({ ...formData, rating: i })}
                        className={`w-10 h-10 rounded border text-sm font-medium ${
                          formData.rating === i
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Select category</option>
                  {categories[feedbackType]?.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {feedbackType === 'bug' ? 'Bug Summary' :
                   feedbackType === 'feature_request' ? 'Feature Title' : 'Title'} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  placeholder={
                    feedbackType === 'bug' ? 'Brief description of the issue' :
                    feedbackType === 'feature_request' ? 'What feature would you like?' :
                    'Brief summary of your feedback'
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {feedbackType === 'bug' ? 'Steps to Reproduce' :
                   feedbackType === 'feature_request' ? 'Detailed Description' : 'Details'} *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="input w-full"
                  placeholder={
                    feedbackType === 'bug' ? '1. Go to...\n2. Click on...\n3. Expected vs actual result' :
                    feedbackType === 'feature_request' ? 'Describe the feature and how it would help you' :
                    feedbackType === 'nps' ? 'What influenced your rating? Any specific suggestions?' :
                    'Provide more details about your feedback'
                  }
                />
              </div>

              {/* Priority (for bugs and feature requests) */}
              {(feedbackType === 'bug' || feedbackType === 'feature_request') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as FeedbackPriority })}
                    className="input w-full"
                  >
                    <option value="low">Low - Minor issue or nice-to-have</option>
                    <option value="medium">Medium - Affects workflow but has workaround</option>
                    <option value="high">High - Significantly impacts work</option>
                    <option value="critical">Critical - Blocks essential functionality</option>
                  </select>
                </div>
              )}

              {/* Email (optional) */}
              {!user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (optional - for follow-up)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full"
                    placeholder="your@email.com"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen && trigger === 'floating') {
    return renderTrigger()
  }

  if (!isOpen) return null

  return (
    <>
      {trigger === 'floating' && renderTrigger()}

      {/* Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">💬 Send Feedback</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderFeedbackForm()}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Inline Feedback Component for specific pages/features
 */
export const InlineFeedback = ({
  feature,
  className = ''
}: {
  feature: string
  className?: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">💡</span>
          <span className="text-sm font-medium text-blue-900">
            How is the {feature} feature working for you?
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Give Feedback
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4">
          <FeedbackWidget
            trigger="inline"
            defaultType="general"
            onSubmit={() => setIsExpanded(false)}
          />
        </div>
      )}
    </div>
  )
}