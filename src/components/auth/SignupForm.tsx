import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email!</h2>
        <p className="text-gray-600 mb-6">
          We've sent you a confirmation link at <strong>{email}</strong>.
          Please check your email and click the link to activate your account.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Don't see the email? Check your spam folder or click below to sign in if you already have an account.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="btn-secondary w-full"
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="card-elevated max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-2xl font-bold text-white">N</span>
        </div>
        <h2 className="text-3xl font-bold text-primary-900 dark:text-white">Start Your Free Trial</h2>
        <p className="text-primary-600 dark:text-primary-400 mt-2">
          Join thousands of agents growing their business with proximity marketing
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-700">
          🎉 14-day free trial • No credit card required
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-700 rounded-2xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-error-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-error-700 dark:text-error-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="signup-email" className="form-label">
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            className="input-field"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className="form-label">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            className="input-field"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="form-helper">Must be at least 6 characters long</p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            className="input-field"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-primary-300 dark:border-primary-600 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="terms" className="text-primary-700 dark:text-primary-300 font-medium">
              I agree to the{' '}
              <a href="#" className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors duration-200">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors duration-200">
                Privacy Policy
              </a>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </div>
          ) : (
            'Start Free Trial'
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="btn-secondary w-full"
          >
            Sign in to your account
          </button>
        </div>
      </div>

      {/* Feature highlights */}
      <div className="mt-8 border-t border-primary-200 dark:border-primary-700 pt-6">
        <h3 className="text-sm font-semibold text-primary-900 dark:text-white mb-4">What you'll get:</h3>
        <ul className="space-y-3 text-sm text-primary-600 dark:text-primary-400">
          <li className="flex items-center">
            <div className="w-5 h-5 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">14-day free trial with full access</span>
          </li>
          <li className="flex items-center">
            <div className="w-5 h-5 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">Proximity-based SMS campaigns</span>
          </li>
          <li className="flex items-center">
            <div className="w-5 h-5 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">Complete CRM for real estate agents</span>
          </li>
          <li className="flex items-center">
            <div className="w-5 h-5 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-3 h-3 text-success-600 dark:text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">Cancel anytime, no commitments</span>
          </li>
        </ul>
      </div>
    </div>
  )
}