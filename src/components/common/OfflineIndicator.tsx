import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (isOnline && !showOfflineMessage) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      !isOnline ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {!isOnline ? (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>You're offline. Some features may be limited.</span>
          </div>
        </div>
      ) : (
        <div className="bg-green-600 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Connection restored!</span>
          </div>
        </div>
      )}
    </div>
  )
}