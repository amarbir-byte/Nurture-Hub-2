/**
 * Quick Start Guide Component
 *
 * Interactive checklist to help new users get started quickly
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface QuickStartItem {
  id: string
  title: string
  description: string
  action: string
  url: string
  estimatedTime: string
  priority: 'essential' | 'important' | 'optional'
  icon: string
}

export const QuickStartGuide = () => {
  const [completedItems, setCompletedItems] = useState<string[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const { user } = useAuth()

  const quickStartItems: QuickStartItem[] = [
    {
      id: 'import-contacts',
      title: 'Import Your Contacts',
      description: 'Upload your existing contact database from REINZ CSV or add manually',
      action: 'Import Contacts',
      url: '/contacts',
      estimatedTime: '5 min',
      priority: 'essential',
      icon: '👥'
    },
    {
      id: 'add-property',
      title: 'Add Your First Property',
      description: 'Add a current listing or property to start proximity marketing',
      action: 'Add Property',
      url: '/properties',
      estimatedTime: '3 min',
      priority: 'essential',
      icon: '🏠'
    },
    {
      id: 'create-template',
      title: 'Customize SMS Templates',
      description: 'Personalize messaging templates for your brand and style',
      action: 'Edit Templates',
      url: '/templates',
      estimatedTime: '10 min',
      priority: 'important',
      icon: '📝'
    },
    {
      id: 'proximity-search',
      title: 'Try Proximity Marketing',
      description: 'Find contacts near your properties and create targeted campaigns',
      action: 'Start Marketing',
      url: '/marketing',
      estimatedTime: '5 min',
      priority: 'essential',
      icon: '🎯'
    },
    {
      id: 'send-campaign',
      title: 'Send Your First Campaign',
      description: 'Launch a proximity-targeted SMS campaign to nearby contacts',
      action: 'Create Campaign',
      url: '/marketing',
      estimatedTime: '3 min',
      priority: 'important',
      icon: '🚀'
    },
    {
      id: 'setup-profile',
      title: 'Complete Your Profile',
      description: 'Add your business details and preferences for better personalization',
      action: 'Edit Profile',
      url: '/profile',
      estimatedTime: '5 min',
      priority: 'important',
      icon: '⚙️'
    },
    {
      id: 'explore-analytics',
      title: 'Explore Analytics',
      description: 'View campaign performance and contact engagement metrics',
      action: 'View Analytics',
      url: '/analytics',
      estimatedTime: '5 min',
      priority: 'optional',
      icon: '📊'
    }
  ]

  useEffect(() => {
    // Load completed items from localStorage
    const saved = localStorage.getItem('quickStartCompleted')
    if (saved) {
      setCompletedItems(JSON.parse(saved))
    }

    // Check if guide should be minimized
    const minimized = localStorage.getItem('quickStartMinimized')
    if (minimized === 'true') {
      setIsMinimized(true)
    }
  }, [])

  const toggleItemComplete = (itemId: string) => {
    const updated = completedItems.includes(itemId)
      ? completedItems.filter(id => id !== itemId)
      : [...completedItems, itemId]

    setCompletedItems(updated)
    localStorage.setItem('quickStartCompleted', JSON.stringify(updated))
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
    localStorage.setItem('quickStartMinimized', (!isMinimized).toString())
  }

  const dismissGuide = () => {
    localStorage.setItem('quickStartDismissed', 'true')
    setIsMinimized(true)
  }

  const essentialItems = quickStartItems.filter(item => item.priority === 'essential')
  const importantItems = quickStartItems.filter(item => item.priority === 'important')
  const optionalItems = quickStartItems.filter(item => item.priority === 'optional')

  const essentialProgress = essentialItems.filter(item => completedItems.includes(item.id)).length
  const totalProgress = completedItems.length
  const progressPercentage = Math.round((totalProgress / quickStartItems.length) * 100)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'essential': return 'text-red-600 bg-red-50'
      case 'important': return 'text-orange-600 bg-orange-50'
      case 'optional': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={handleMinimize}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quick Start</span>
            <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
              {totalProgress}/{quickStartItems.length}
            </span>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-30 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">🚀 Quick Start Guide</h3>
          <div className="flex gap-1">
            <button
              onClick={handleMinimize}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Minimize"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={dismissGuide}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <span>{totalProgress} of {quickStartItems.length} completed</span>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span>{progressPercentage}%</span>
        </div>

        {essentialProgress < essentialItems.length && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Complete essential items to get started
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="overflow-y-auto max-h-64">
        {/* Essential Items */}
        {essentialItems.length > 0 && (
          <div className="p-3 border-b border-gray-100">
            <h4 className="text-xs font-medium text-red-600 mb-2 uppercase tracking-wide">Essential</h4>
            <div className="space-y-2">
              {essentialItems.map(item => (
                <QuickStartItem
                  key={item.id}
                  item={item}
                  isCompleted={completedItems.includes(item.id)}
                  onToggle={() => toggleItemComplete(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Important Items */}
        {importantItems.length > 0 && (
          <div className="p-3 border-b border-gray-100">
            <h4 className="text-xs font-medium text-orange-600 mb-2 uppercase tracking-wide">Important</h4>
            <div className="space-y-2">
              {importantItems.map(item => (
                <QuickStartItem
                  key={item.id}
                  item={item}
                  isCompleted={completedItems.includes(item.id)}
                  onToggle={() => toggleItemComplete(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Optional Items */}
        {optionalItems.length > 0 && (
          <div className="p-3">
            <h4 className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">Optional</h4>
            <div className="space-y-2">
              {optionalItems.map(item => (
                <QuickStartItem
                  key={item.id}
                  item={item}
                  isCompleted={completedItems.includes(item.id)}
                  onToggle={() => toggleItemComplete(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface QuickStartItemProps {
  item: QuickStartItem
  isCompleted: boolean
  onToggle: () => void
}

const QuickStartItem = ({ item, isCompleted, onToggle }: QuickStartItemProps) => {
  const handleAction = () => {
    if (!isCompleted) {
      window.location.href = item.url
    }
  }

  return (
    <div className={`p-2 rounded border transition-all ${
      isCompleted
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }`}>
      <div className="flex items-start gap-2">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            isCompleted
              ? 'bg-green-600 border-green-600 text-white'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isCompleted && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{item.icon}</span>
            <h5 className={`text-sm font-medium ${isCompleted ? 'text-green-800' : 'text-gray-900'}`}>
              {item.title}
            </h5>
            <span className="text-xs text-gray-500">{item.estimatedTime}</span>
          </div>

          <p className={`text-xs ${isCompleted ? 'text-green-700' : 'text-gray-600'} mb-2`}>
            {item.description}
          </p>

          {!isCompleted && (
            <button
              onClick={handleAction}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {item.action} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}