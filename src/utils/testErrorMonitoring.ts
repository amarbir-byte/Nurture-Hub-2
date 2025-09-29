/**
 * Test Error Monitoring System
 *
 * Utility to test the end-to-end error monitoring flow
 */

import { reportError } from '../lib/monitoring'

export const testErrorMonitoring = async () => {
  console.log('🧪 Testing Error Monitoring System...')

  try {
    // Test 1: Report a medium priority error
    await reportError(
      new Error('Test error from monitoring system'),
      'Error Monitoring Test',
      'medium',
      {
        testType: 'end-to-end',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    )
    console.log('✅ Test 1: Medium priority error reported')

    // Test 2: Report a high priority error
    await reportError(
      new Error('High priority test error with stack trace'),
      'Critical System Test',
      'high',
      {
        testType: 'high-priority',
        component: 'testErrorMonitoring',
        action: 'validateSystem',
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : undefined
      }
    )
    console.log('✅ Test 2: High priority error reported')

    // Test 3: Report a critical error
    await reportError(
      new Error('CRITICAL: System failure simulation'),
      'Critical Alert Test',
      'critical',
      {
        testType: 'critical-alert',
        severity: 'critical',
        immediate: true,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    )
    console.log('✅ Test 3: Critical error reported')

    console.log('🎉 All error monitoring tests completed successfully!')
    console.log('📊 Check the Admin Panel > Error Monitoring tab to see results')

    return true
  } catch (error) {
    console.error('❌ Error monitoring test failed:', error)
    return false
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testErrorMonitoring = testErrorMonitoring
}