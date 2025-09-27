/**
 * Quick test to verify LINZ geocoding works
 * Run with: node test-geocoding.js
 */

// Simulate the environment variables
process.env.VITE_LINZ_API_KEY = 'demo'

// Import and test the geocoding functions
import('./src/lib/geocoding.ts').then(async (geocodingModule) => {
  console.log('Testing LINZ geocoding integration...')

  // Test the critical address
  const testAddresses = [
    '53 Rashni Road Flatbush',
    '53 Rashni Road, Flatbush, Auckland',
    '10 Castlepoint Avenue Takanini',
    '123 Queen Street Auckland'
  ]

  for (const address of testAddresses) {
    console.log(`\n--- Testing: "${address}" ---`)
    try {
      const result = await geocodingModule.geocode(address)
      console.log(`Result: lat=${result.lat}, lng=${result.lng}`)
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  console.log('\nTesting complete!')
}).catch(error => {
  console.error('Test failed:', error)
})