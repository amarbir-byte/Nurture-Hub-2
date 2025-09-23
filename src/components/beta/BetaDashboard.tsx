import { useState, useEffect } from 'react'

interface TestScenario {
  id: string
  name: string
  description: string
  estimatedTime: string
  completed: boolean
  feedback?: string
  rating?: number
}

interface BetaProgress {
  daysInTrial: number
  totalDays: number
  scenariosCompleted: number
  totalScenarios: number
  feedbackSubmitted: number
}

export function BetaDashboard() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: 'setup',
      name: 'Initial Setup & Onboarding',
      description: 'Create account, import contacts, add first property, create first template',
      estimatedTime: '15 min',
      completed: false
    },
    {
      id: 'contact-management',
      name: 'Contact Management',
      description: 'Search contacts, add new contact, edit details, track interactions',
      estimatedTime: '20 min',
      completed: false
    },
    {
      id: 'property-management',
      name: 'Property Portfolio',
      description: 'Add properties, edit details, mark as sold, view statistics',
      estimatedTime: '15 min',
      completed: false
    },
    {
      id: 'proximity-campaign',
      name: 'Proximity Marketing Campaign',
      description: 'Create proximity campaign, select radius, customize message, send SMS',
      estimatedTime: '25 min',
      completed: false
    },
    {
      id: 'template-management',
      name: 'Template Management',
      description: 'Create custom templates, use placeholders, test previews',
      estimatedTime: '10 min',
      completed: false
    },
    {
      id: 'subscription-billing',
      name: 'Subscription & Billing',
      description: 'View usage limits, explore pricing plans, test upgrade flow',
      estimatedTime: '10 min',
      completed: false
    }
  ])

  const [progress, setProgress] = useState<BetaProgress>({
    daysInTrial: 1,
    totalDays: 30,
    scenariosCompleted: 0,
    totalScenarios: scenarios.length,
    feedbackSubmitted: 0
  })

  const [dailyGoals, setDailyGoals] = useState([
    { day: 1, goal: 'Complete setup and first campaign', completed: false },
    { day: 2, goal: 'Test contact management and add 10+ contacts', completed: false },
    { day: 3, goal: 'Create 3 marketing campaigns', completed: false },
    { day: 4, goal: 'Test all templates and create custom ones', completed: false },
    { day: 5, goal: 'Use as primary CRM for the day', completed: false },
    { day: 6, goal: 'Test advanced features and workflows', completed: false },
    { day: 7, goal: 'Final feedback and recommendation', completed: false }
  ])

  useEffect(() => {
    // Load progress from localStorage
    const savedScenarios = localStorage.getItem('betaScenarios')
    const savedProgress = localStorage.getItem('betaProgress')
    const savedGoals = localStorage.getItem('betaDailyGoals')

    if (savedScenarios) {
      setScenarios(JSON.parse(savedScenarios))
    }
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress))
    }
    if (savedGoals) {
      setDailyGoals(JSON.parse(savedGoals))
    }
  }, [])

  const markScenarioComplete = (scenarioId: string, rating: number, feedback: string) => {
    const updatedScenarios = scenarios.map(scenario =>
      scenario.id === scenarioId
        ? { ...scenario, completed: true, rating, feedback }
        : scenario
    )
    setScenarios(updatedScenarios)
    localStorage.setItem('betaScenarios', JSON.stringify(updatedScenarios))

    // Update progress
    const completedCount = updatedScenarios.filter(s => s.completed).length
    const updatedProgress = { ...progress, scenariosCompleted: completedCount }
    setProgress(updatedProgress)
    localStorage.setItem('betaProgress', JSON.stringify(updatedProgress))
  }

  const markDailyGoalComplete = (day: number) => {
    const updatedGoals = dailyGoals.map(goal =>
      goal.day === day ? { ...goal, completed: true } : goal
    )
    setDailyGoals(updatedGoals)
    localStorage.setItem('betaDailyGoals', JSON.stringify(updatedGoals))
  }

  const progressPercentage = (progress.scenariosCompleted / progress.totalScenarios) * 100

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Beta Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome Beta Tester! 🎉</h1>
            <p className="opacity-90">
              Day {progress.daysInTrial} of {progress.totalDays} |
              {progress.scenariosCompleted}/{progress.totalScenarios} scenarios completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{Math.round(progressPercentage)}%</div>
            <div className="text-sm opacity-90">Complete</div>
          </div>
        </div>
        <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Today's Goals */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Daily Goals</h2>
        <div className="space-y-3">
          {dailyGoals.slice(0, 3).map(goal => (
            <div key={goal.day} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => markDailyGoalComplete(goal.day)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    goal.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {goal.completed && '✓'}
                </button>
                <span className={goal.completed ? 'line-through text-gray-500' : 'text-gray-900'}>
                  Day {goal.day}: {goal.goal}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test Scenarios</h2>
        <div className="space-y-4">
          {scenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onComplete={markScenarioComplete}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-left transition-colors">
          <div className="text-blue-600 text-2xl mb-2">💬</div>
          <div className="font-medium text-blue-900">Send Feedback</div>
          <div className="text-sm text-blue-700">Share your thoughts</div>
        </button>

        <button className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-4 text-left transition-colors">
          <div className="text-green-600 text-2xl mb-2">📞</div>
          <div className="font-medium text-green-900">Get Help</div>
          <div className="text-sm text-green-700">Contact support</div>
        </button>

        <button className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-4 text-left transition-colors">
          <div className="text-purple-600 text-2xl mb-2">📊</div>
          <div className="font-medium text-purple-900">View Progress</div>
          <div className="text-sm text-purple-700">Detailed analytics</div>
        </button>
      </div>

      {/* Beta Perks Reminder */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">🎁 Beta Tester Perks</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• 30-day extended trial (vs 14-day standard)</li>
          <li>• Direct access to founders for support</li>
          <li>• 50% discount on first year subscription</li>
          <li>• Early access to new features</li>
          <li>• Your feedback shapes the product roadmap</li>
        </ul>
      </div>
    </div>
  )
}

function ScenarioCard({
  scenario,
  onComplete
}: {
  scenario: TestScenario
  onComplete: (id: string, rating: number, feedback: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')

  const handleComplete = () => {
    onComplete(scenario.id, rating, feedback)
    setIsExpanded(false)
  }

  return (
    <div className={`border rounded-lg ${scenario.completed ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              scenario.completed
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {scenario.completed ? '✓' : '○'}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{scenario.name}</h3>
              <p className="text-sm text-gray-600">{scenario.estimatedTime}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {scenario.completed && scenario.rating && (
              <div className="flex text-yellow-400">
                {'⭐'.repeat(scenario.rating)}
              </div>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <p className="text-gray-700 mb-4 mt-4">{scenario.description}</p>

          {!scenario.completed && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate this scenario (1-5 stars)
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any thoughts, issues, or suggestions for this scenario?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <button
                onClick={handleComplete}
                className="btn-primary"
              >
                Mark Complete
              </button>
            </div>
          )}

          {scenario.completed && scenario.feedback && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">{scenario.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}