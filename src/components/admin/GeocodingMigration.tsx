import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { migrateAllAddresses, MigrationProgress } from '../../utils/migrateGeodata'

interface MigrationState {
  isRunning: boolean
  currentType: 'contacts' | 'properties' | null
  contacts: MigrationProgress
  properties: MigrationProgress
  startTime: number | null
}

export function GeocodingMigration() {
  const { user } = useAuth()
  const [migrationState, setMigrationState] = useState<MigrationState>({
    isRunning: false,
    currentType: null,
    contacts: { total: 0, processed: 0, successful: 0, failed: 0, errors: [] },
    properties: { total: 0, processed: 0, successful: 0, failed: 0, errors: [] },
    startTime: null
  })

  const startMigration = async () => {
    if (!user) {
      alert('Please log in to run migration')
      return
    }

    setMigrationState(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
      contacts: { total: 0, processed: 0, successful: 0, failed: 0, errors: [] },
      properties: { total: 0, processed: 0, successful: 0, failed: 0, errors: [] }
    }))

    try {
      const results = await migrateAllAddresses(user.id, {
        batchSize: 5, // Smaller batches to be conservative with API limits
        delayBetweenBatches: 2000, // 2 second delay between batches
        onProgress: (progress) => {
          // Update UI with progress
          console.log('Migration progress:', progress)
        }
      })

      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        currentType: null,
        contacts: results.contacts,
        properties: results.properties
      }))

    } catch (error) {
      console.error('Migration failed:', error)
      setMigrationState(prev => ({
        ...prev,
        isRunning: false,
        currentType: null
      }))
      alert(`Migration failed: ${error}`)
    }
  }

  const getElapsedTime = () => {
    if (!migrationState.startTime) return ''
    const elapsed = Date.now() - migrationState.startTime
    return `${Math.round(elapsed / 1000)}s`
  }

  const getTotalProgress = () => {
    const totalItems = migrationState.contacts.total + migrationState.properties.total
    const processedItems = migrationState.contacts.processed + migrationState.properties.processed
    if (totalItems === 0) return 0
    return Math.round((processedItems / totalItems) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Address Geocoding Migration
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Migrate existing addresses to use real geocoding for accurate proximity calculations
          </p>
        </div>

        <div className="p-6">
          {/* Migration Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Migration Status</h3>
              {migrationState.isRunning && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                  Running... ({getElapsedTime()})
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {migrationState.isRunning && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getTotalProgress()}%` }}
                ></div>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contacts */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Contacts</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{migrationState.contacts.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processed:</span>
                    <span className="font-medium">{migrationState.contacts.processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Successful:</span>
                    <span className="font-medium text-green-600">{migrationState.contacts.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">{migrationState.contacts.failed}</span>
                  </div>
                </div>
              </div>

              {/* Properties */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Properties</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{migrationState.properties.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processed:</span>
                    <span className="font-medium">{migrationState.properties.processed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Successful:</span>
                    <span className="font-medium text-green-600">{migrationState.properties.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">{migrationState.properties.failed}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Migration Controls */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Start Migration</h4>
              <p className="text-sm text-blue-700">
                This will update all existing addresses with real coordinates using MapTiler API.
                {migrationState.isRunning && ' Migration is currently in progress...'}
              </p>
            </div>
            <button
              onClick={startMigration}
              disabled={migrationState.isRunning}
              className={`
                px-6 py-2 rounded-md font-medium text-sm
                ${migrationState.isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {migrationState.isRunning ? 'Running...' : 'Start Migration'}
            </button>
          </div>

          {/* Errors */}
          {(migrationState.contacts.errors.length > 0 || migrationState.properties.errors.length > 0) && (
            <div className="mt-6">
              <h4 className="font-medium text-red-900 mb-2">Errors</h4>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="space-y-1 text-sm text-red-700">
                  {migrationState.contacts.errors.map((error, index) => (
                    <div key={`contact-${index}`}>[Contacts] {error}</div>
                  ))}
                  {migrationState.properties.errors.map((error, index) => (
                    <div key={`property-${index}`}>[Properties] {error}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Important Notes</h4>
                <div className="mt-1 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>This process uses MapTiler API credits (free tier: 100,000 requests/month)</li>
                    <li>Migration processes in small batches with delays to respect API limits</li>
                    <li>Only addresses without coordinates will be processed by default</li>
                    <li>Make sure you have configured VITE_MAPTILER_API_KEY in your .env file</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}