import { useEffect } from 'react'

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return
    }

    const reportPerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')

      const metrics: PerformanceMetric[] = []

      // First Contentful Paint
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
      if (fcp) {
        metrics.push({
          name: 'First Contentful Paint',
          value: fcp.startTime,
          rating: fcp.startTime < 1800 ? 'good' : fcp.startTime < 3000 ? 'needs-improvement' : 'poor'
        })
      }

      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            metrics.push({
              name: 'Largest Contentful Paint',
              value: lastEntry.startTime,
              rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor'
            })
          }
        })
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      }

      // Time to Interactive (approximate)
      if (navigation) {
        const tti = navigation.domComplete - navigation.navigationStart
        metrics.push({
          name: 'Time to Interactive',
          value: tti,
          rating: tti < 3800 ? 'good' : tti < 7300 ? 'needs-improvement' : 'poor'
        })

        // DOM Content Loaded
        const dcl = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        metrics.push({
          name: 'DOM Content Loaded',
          value: dcl,
          rating: dcl < 1600 ? 'good' : dcl < 2500 ? 'needs-improvement' : 'poor'
        })
      }

      // Only log in development
      if (import.meta.env.DEV && metrics.length > 0) {
        console.group('🚀 Performance Metrics')
        metrics.forEach(metric => {
          const icon = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌'
          console.log(`${icon} ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`)
        })
        console.groupEnd()
      }

      // Send to analytics in production (placeholder)
      if (import.meta.env.PROD) {
        // Example: send to your analytics service
        // analytics.track('performance_metrics', { metrics })
      }
    }

    // Report after page load
    if (document.readyState === 'complete') {
      setTimeout(reportPerformance, 0)
    } else {
      window.addEventListener('load', () => {
        setTimeout(reportPerformance, 0)
      })
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (import.meta.env.DEV) {
            console.warn(`⚠️ Long task detected: ${Math.round(entry.duration)}ms`)
          }
        })
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    }

    // Monitor memory usage (Chrome only)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        if (import.meta.env.DEV) {
          console.log(`📊 Memory: ${Math.round(memory.usedJSHeapSize / 1048576)}MB used / ${Math.round(memory.totalJSHeapSize / 1048576)}MB total`)
        }
      }

      const memoryInterval = setInterval(checkMemory, 30000) // Check every 30 seconds
      return () => clearInterval(memoryInterval)
    }
  }, [])

  return null // This component doesn't render anything
}