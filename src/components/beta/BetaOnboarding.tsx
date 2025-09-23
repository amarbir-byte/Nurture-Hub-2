import { useState } from 'react'

interface BetaOnboardingProps {
  onComplete: () => void
}

export function BetaOnboarding({ onComplete }: BetaOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [userProfile, setUserProfile] = useState({
    experience: '',
    currentCrm: '',
    teamSize: '',
    marketType: '',
    marketingBudget: '',
    painPoints: [] as string[]
  })

  const steps = [
    {
      title: "Welcome to Nurture Hub Beta! 🎉",
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl">🏠</div>
          <h2 className="text-2xl font-bold text-gray-900">Thank you for being a beta tester!</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            You're helping us build the future of real estate marketing. Your feedback will shape
            how agents market properties with precision proximity targeting.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Beta Benefits:</strong> 30-day extended trial, direct access to founders,
              early access to new features, and 50% discount on first year subscription!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Tell us about your experience",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How long have you been in real estate?
            </label>
            <select
              className="input w-full"
              value={userProfile.experience}
              onChange={(e) => setUserProfile({...userProfile, experience: e.target.value})}
            >
              <option value="">Select experience level</option>
              <option value="0-1">Less than 1 year</option>
              <option value="1-2">1-2 years</option>
              <option value="2-5">2-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What CRM do you currently use?
            </label>
            <select
              className="input w-full"
              value={userProfile.currentCrm}
              onChange={(e) => setUserProfile({...userProfile, currentCrm: e.target.value})}
            >
              <option value="">Select current CRM</option>
              <option value="kvcore">kvCORE</option>
              <option value="top-producer">Top Producer</option>
              <option value="chime">Chime</option>
              <option value="follow-up-boss">Follow Up Boss</option>
              <option value="wise-agent">Wise Agent</option>
              <option value="excel">Excel/Spreadsheets</option>
              <option value="none">No CRM currently</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team size
            </label>
            <select
              className="input w-full"
              value={userProfile.teamSize}
              onChange={(e) => setUserProfile({...userProfile, teamSize: e.target.value})}
            >
              <option value="">Select team size</option>
              <option value="solo">Solo agent</option>
              <option value="2-3">2-3 people</option>
              <option value="4-10">4-10 people</option>
              <option value="10+">10+ people</option>
            </select>
          </div>
        </div>
      )
    },
    {
      title: "Your market and goals",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What type of market do you work in?
            </label>
            <select
              className="input w-full"
              value={userProfile.marketType}
              onChange={(e) => setUserProfile({...userProfile, marketType: e.target.value})}
            >
              <option value="">Select market type</option>
              <option value="urban">Urban (city center)</option>
              <option value="suburban">Suburban</option>
              <option value="rural">Rural</option>
              <option value="mixed">Mixed urban/suburban</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly marketing budget
            </label>
            <select
              className="input w-full"
              value={userProfile.marketingBudget}
              onChange={(e) => setUserProfile({...userProfile, marketingBudget: e.target.value})}
            >
              <option value="">Select budget range</option>
              <option value="0-100">$0-100</option>
              <option value="100-300">$100-300</option>
              <option value="300-500">$300-500</option>
              <option value="500-1000">$500-1000</option>
              <option value="1000+">$1000+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are your biggest challenges with current tools? (Select all that apply)
            </label>
            <div className="space-y-2">
              {[
                'Too expensive',
                'Too complicated',
                'Poor mobile experience',
                'Limited targeting options',
                'Bad customer support',
                'Missing key features',
                'Integration issues'
              ].map((painPoint) => (
                <label key={painPoint} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userProfile.painPoints.includes(painPoint)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserProfile({
                          ...userProfile,
                          painPoints: [...userProfile.painPoints, painPoint]
                        })
                      } else {
                        setUserProfile({
                          ...userProfile,
                          painPoints: userProfile.painPoints.filter(p => p !== painPoint)
                        })
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{painPoint}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Beta testing roadmap",
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">What to expect in the next 7 days:</h3>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Day 1-2: Setup & First Impressions</h4>
                <p className="text-sm text-gray-600">Import your contacts, add properties, create templates. We'll check in daily.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Day 3-5: Marketing Campaigns</h4>
                <p className="text-sm text-gray-600">Test proximity marketing. Send campaigns to contacts near your listings.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Day 6-7: Full Workflow</h4>
                <p className="text-sm text-gray-600">Use as your primary CRM. Track interactions, manage follow-ups.</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">📞 Direct Support</h4>
            <p className="text-sm text-green-700">
              You have direct access to our founders. Any questions or issues?
              WhatsApp us at <strong>+64 xxx xxx xxx</strong> or email <strong>beta@nurturehub.app</strong>
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">🎯 Your Feedback Matters</h4>
            <p className="text-sm text-yellow-700">
              Every feature, button, and workflow can be improved based on your input.
              Don't hesitate to share even small suggestions!
            </p>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Save profile data and complete onboarding
      localStorage.setItem('betaUserProfile', JSON.stringify(userProfile))
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepComplete = () => {
    switch (currentStep) {
      case 0: return true
      case 1: return userProfile.experience && userProfile.currentCrm && userProfile.teamSize
      case 2: return userProfile.marketType && userProfile.marketingBudget
      case 3: return true
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / steps.length) * 100)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900 mb-6">
              {steps[currentStep].title}
            </h1>
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepComplete()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length - 1 ? 'Start Testing!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}