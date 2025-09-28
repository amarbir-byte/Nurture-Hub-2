import { useState } from 'react'

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'praise'
  page: string
  rating: number
  message: string
  urgent: boolean
}

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'general',
    page: window.location.pathname,
    rating: 5,
    message: '',
    urgent: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In production, this would send to your feedback API
      console.log('Beta Feedback:', {
        ...feedback,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setIsSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setIsSubmitted(false)
        setFeedback({
          type: 'general',
          page: window.location.pathname,
          rating: 5,
          message: '',
          urgent: false
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const feedbackTypes = [
    { value: 'bug' as const, label: '🐛 Bug Report', color: 'text-red-600' },
    { value: 'feature' as const, label: '💡 Feature Request', color: 'text-blue-600' },
    { value: 'general' as const, label: '💬 General Feedback', color: 'text-gray-600' },
    { value: 'praise' as const, label: '❤️ Something Great', color: 'text-green-600' }
  ]

  return (
    <>
      {/* Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 z-50"
        title="Send Feedback"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h8a2 2 0 002-2V8M9 12h6" />
        </svg>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  🎯 Beta Feedback
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🙏</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Thank you!</h4>
                  <p className="text-gray-600">Your feedback has been sent to our team.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Feedback Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What type of feedback is this?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {feedbackTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFeedback({...feedback, type: type.value})}
                          className={`p-3 text-sm rounded-lg border-2 transition-colors ${
                            feedback.type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={type.color}>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How would you rate this feature/page?
                    </label>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedback({...feedback, rating: star})}
                          className={`text-2xl ${
                            star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tell us more
                    </label>
                    <textarea
                      value={feedback.message}
                      onChange={(e) => setFeedback({...feedback, message: e.target.value})}
                      placeholder="What can we improve? What did you love? Any bugs or issues?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      required
                    />
                  </div>

                  {/* Urgent checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="urgent"
                      checked={feedback.urgent}
                      onChange={(e) => setFeedback({...feedback, urgent: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="urgent" className="text-sm text-gray-700">
                      🚨 This is blocking me from testing (urgent)
                    </label>
                  </div>

                  {/* Current page info */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Current page: {feedback.page}
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !feedback.message}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </form>
              )}

              {/* Beta tester contact info */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  For urgent issues: WhatsApp <strong>+64 xxx xxx xxx</strong><br/>
                  Or email: <strong>beta@nurturehub.app</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}