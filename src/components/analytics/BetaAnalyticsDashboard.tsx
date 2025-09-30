/**
 * Beta Analytics Dashboard
 *
 * Comprehensive analytics dashboard for tracking beta testing metrics
 */

import { useState, useEffect } from 'react'
import { useAnalytics } from '../../lib/analytics'

interface AnalyticsData {
  userEngagement: {
    totalUsers: number
    activeUsers: number
    retentionRate: number
    averageSessionDuration: number
    pageViews: number
  }
  featureAdoption: {
    proximitySearch: number
    contactImport: number
    smsCampaigns: number
    propertyManagement: number
    templateUsage: number
  }
  npsData: {
    score: number
    promoters: number
    passives: number
    detractors: number
    responses: number
  }
  feedbackSummary: {
    totalFeedback: number
    bugReports: number
    featureRequests: number
    generalFeedback: number
    averageResponseTime: number
  }
  technicalMetrics: {
    loadTime: number
    errorRate: number
    uptime: number
    performanceScore: number
  }
}

export const BetaAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const { trackEngagement } = useAnalytics()

  useEffect(() => {
    fetchAnalyticsData()
    trackEngagement('analytics_dashboard_viewed')
  }, [timeRange, trackEngagement])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)

      // In production, this would fetch from your analytics API
      // For now, we'll simulate the data
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockData: AnalyticsData = {
        userEngagement: {
          totalUsers: 8,
          activeUsers: 6,
          retentionRate: 75,
          averageSessionDuration: 1240, // seconds
          pageViews: 342
        },
        featureAdoption: {
          proximitySearch: 87.5,
          contactImport: 100,
          smsCampaigns: 75,
          propertyManagement: 87.5,
          templateUsage: 62.5
        },
        npsData: {
          score: 67,
          promoters: 5,
          passives: 2,
          detractors: 1,
          responses: 8
        },
        feedbackSummary: {
          totalFeedback: 23,
          bugReports: 8,
          featureRequests: 11,
          generalFeedback: 4,
          averageResponseTime: 24 // hours
        },
        technicalMetrics: {
          loadTime: 2.1,
          errorRate: 0.3,
          uptime: 99.8,
          performanceScore: 94
        }
      }

      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">📊 Beta Testing Analytics</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Unable to load analytics data at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Beta Testing Analytics</h1>
          <p className="text-gray-600">Real-time insights into beta testing performance</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="btn-secondary text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Beta Users"
          value={analyticsData.userEngagement.activeUsers}
          total={analyticsData.userEngagement.totalUsers}
          format="fraction"
          trend={{ value: 12.5, direction: 'up' }}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="NPS Score"
          value={analyticsData.npsData.score}
          format="number"
          trend={{ value: 8, direction: 'up' }}
          icon="⭐"
          color="green"
        />
        <MetricCard
          title="Feature Adoption"
          value={85.5}
          format="percentage"
          trend={{ value: 15, direction: 'up' }}
          icon="🎯"
          color="purple"
        />
        <MetricCard
          title="Uptime"
          value={analyticsData.technicalMetrics.uptime}
          format="percentage"
          trend={{ value: 0.2, direction: 'up' }}
          icon="⚡"
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 User Engagement</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="font-medium">{analyticsData.userEngagement.totalUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Users (7d)</span>
              <span className="font-medium">{analyticsData.userEngagement.activeUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retention Rate</span>
              <span className="font-medium">{analyticsData.userEngagement.retentionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Session Duration</span>
              <span className="font-medium">{Math.round(analyticsData.userEngagement.averageSessionDuration / 60)}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Page Views</span>
              <span className="font-medium">{analyticsData.userEngagement.pageViews}</span>
            </div>
          </div>
        </div>

        {/* Feature Adoption */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Feature Adoption</h3>
          <div className="space-y-3">
            {Object.entries(analyticsData.featureAdoption).map(([feature, percentage]) => (
              <div key={feature}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 capitalize">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NPS Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ Net Promoter Score</h3>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-green-600">{analyticsData.npsData.score}</div>
            <div className="text-sm text-gray-500">NPS Score</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Promoters (9-10)</span>
              <span className="font-medium text-green-600">{analyticsData.npsData.promoters}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Passives (7-8)</span>
              <span className="font-medium text-yellow-600">{analyticsData.npsData.passives}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Detractors (0-6)</span>
              <span className="font-medium text-red-600">{analyticsData.npsData.detractors}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Responses</span>
                <span className="font-medium">{analyticsData.npsData.responses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Feedback Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Feedback</span>
              <span className="font-medium">{analyticsData.feedbackSummary.totalFeedback}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bug Reports</span>
              <span className="font-medium text-red-600">{analyticsData.feedbackSummary.bugReports}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Feature Requests</span>
              <span className="font-medium text-blue-600">{analyticsData.feedbackSummary.featureRequests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">General Feedback</span>
              <span className="font-medium text-green-600">{analyticsData.feedbackSummary.generalFeedback}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <span className="font-medium">{analyticsData.feedbackSummary.averageResponseTime}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Technical Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analyticsData.technicalMetrics.loadTime}s</div>
            <div className="text-sm text-gray-500">Avg Load Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analyticsData.technicalMetrics.errorRate}%</div>
            <div className="text-sm text-gray-500">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{analyticsData.technicalMetrics.uptime}%</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{analyticsData.technicalMetrics.performanceScore}</div>
            <div className="text-sm text-gray-500">Performance Score</div>
          </div>
        </div>
      </div>

      {/* Success Criteria Status */}
      <SuccessCriteriaStatus analyticsData={analyticsData} />
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  total?: number
  format: 'number' | 'percentage' | 'fraction'
  trend?: { value: number; direction: 'up' | 'down' }
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const MetricCard = ({ title, value, total, format, trend, icon, color }: MetricCardProps) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  }

  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${value}%`
      case 'fraction':
        return total ? `${value}/${total}` : value.toString()
      default:
        return value.toString()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600">{title}</div>
          <div className="text-xl font-bold text-gray-900">{formatValue()}</div>
          {trend && (
            <div className={`text-xs flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{trend.direction === 'up' ? '↗' : '↘'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SuccessCriteriaStatus = ({ analyticsData }: { analyticsData: AnalyticsData }) => {
  const criteria = [
    {
      name: 'User Engagement',
      target: '>70% weekly active users',
      current: `${Math.round((analyticsData.userEngagement.activeUsers / analyticsData.userEngagement.totalUsers) * 100)}%`,
      met: (analyticsData.userEngagement.activeUsers / analyticsData.userEngagement.totalUsers) > 0.7
    },
    {
      name: 'Feature Adoption',
      target: '>80% use proximity search',
      current: `${analyticsData.featureAdoption.proximitySearch}%`,
      met: analyticsData.featureAdoption.proximitySearch > 80
    },
    {
      name: 'Net Promoter Score',
      target: '>50 NPS score',
      current: analyticsData.npsData.score.toString(),
      met: analyticsData.npsData.score > 50
    },
    {
      name: 'Technical Performance',
      target: '<2s load times',
      current: `${analyticsData.technicalMetrics.loadTime}s`,
      met: analyticsData.technicalMetrics.loadTime < 2
    }
  ]

  const metCriteria = criteria.filter(c => c.met).length
  const successRate = Math.round((metCriteria / criteria.length) * 100)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🎯 Beta Success Criteria</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          successRate >= 75 ? 'bg-green-100 text-green-800' :
          successRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {metCriteria}/{criteria.length} criteria met ({successRate}%)
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => (
          <div key={criterion.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${
                criterion.met ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-sm text-gray-700">{criterion.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">{criterion.target}</span>
              <span className="ml-2 font-medium">{criterion.current}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}