import { useState } from 'react'
import { geocode } from '../../lib/geocoding'

export function GeocodingTest() {
  const [address, setAddress] = useState('53 Rashni Road Flatbush')
  const [result, setResult] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testGeocode = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing geocoding for:', address)
      const coords = await geocode(address)
      console.log('Geocoding result:', coords)
      setResult(coords)
    } catch (err) {
      console.error('Geocoding error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testAddresses = [
    '53 Rashni Road Flatbush',
    '53 Rashni Road, Flatbush, Auckland',
    '10 Castlepoint Avenue Takanini',
    '123 Queen Street Auckland',
    '1 Sky Tower, Auckland',
    '15 Parliament Street Wellington'
  ]

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Geocoding Test (LINZ + MapTiler)</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Test Address:
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter address to test"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {testAddresses.map((testAddr) => (
            <button
              key={testAddr}
              onClick={() => setAddress(testAddr)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {testAddr}
            </button>
          ))}
        </div>

        <button
          onClick={testGeocode}
          disabled={loading || !address.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Testing...' : 'Test Geocoding'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-bold text-green-800 mb-2">Geocoding Result:</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Latitude:</strong> {result.lat}</div>
              <div><strong>Longitude:</strong> {result.lng}</div>
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps?q=${result.lat},${result.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Google Maps →
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Priority:</strong> LINZ (official NZ data) → MapTiler → Mock geocoding</p>
          <p>Check browser console for detailed logging of geocoding attempts.</p>
        </div>
      </div>
    </div>
  )
}