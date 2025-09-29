/**
 * Enterprise Error Monitoring Dashboard
 *
 * Professional error monitoring interface for system administrators
 */

import { useState, useEffect, useCallback } from 'react'
import { ErrorList } from './ErrorList'
import { ErrorFilters } from './ErrorFilters'
import { ErrorDetails } from './ErrorDetails'
import { DashboardStats } from './DashboardStats'

interface ErrorReport {
  error: {
    message: string;
    stack?: string;
  };
  context: string;
  userId?: string;
  userAgent: string;
  timestamp: string;
  stackTrace: string;
  errorId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface DashboardData {
  errors: ErrorReport[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recentTrend: {
      lastHour: number;
      last24Hours: number;
      lastWeek: number;
    };
    byContext: Record<string, number>;
  };
}

interface Filters {
  severity?: string;
  context?: string;
  userId?: string;
  since?: string;
  limit: number;
  offset: number;
}

export const ErrorDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    limit: 50,
    offset: 0,
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/monitoring/errors?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch error dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      offset: 0 // Reset pagination when filters change
    }));
  }, []);

  const handleLoadMore = useCallback(() => {
    if (dashboardData?.pagination.hasMore) {
      setFilters(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  }, [dashboardData?.pagination.hasMore]);

  const clearAllErrors = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all stored errors? This action cannot be undone.')) {
      try {
        localStorage.removeItem('pendingErrors');
        await fetchDashboardData();
        alert('✅ All stored errors cleared successfully');
      } catch (err) {
        alert('❌ Failed to clear errors');
      }
    }
  }, [fetchDashboardData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatus = () => {
    if (!dashboardData?.summary) return { status: 'unknown', color: 'gray' };

    const { critical, high } = dashboardData.summary.bySeverity;

    if (critical > 0) return { status: 'critical', color: 'red' };
    if (high > 5) return { status: 'warning', color: 'orange' };
    if (dashboardData.summary.total > 50) return { status: 'degraded', color: 'yellow' };
    return { status: 'operational', color: 'green' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔍 Error Monitoring Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Enterprise-grade error tracking and analysis</p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-${healthStatus.color}-100 text-${healthStatus.color}-800`}>
            <div className={`w-2 h-2 rounded-full bg-${healthStatus.color}-500`}></div>
            System {healthStatus.status}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⟳' : '↻'} Refresh
            </button>

            <button
              onClick={clearAllErrors}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <DashboardStats
          summary={dashboardData.summary}
          getSeverityColor={getSeverityColor}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-lg">⚠️</span>
            <div>
              <h3 className="font-medium">Dashboard Error</h3>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="text-sm underline hover:no-underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !dashboardData && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-gray-600">Loading error monitoring data...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {dashboardData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters & Error List */}
          <div className="lg:col-span-2 space-y-4">
            <ErrorFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              summary={dashboardData.summary}
            />

            <ErrorList
              errors={dashboardData.errors}
              pagination={dashboardData.pagination}
              selectedError={selectedError}
              onSelectError={setSelectedError}
              onLoadMore={handleLoadMore}
              getSeverityColor={getSeverityColor}
              loading={loading}
            />
          </div>

          {/* Error Details */}
          <div className="lg:col-span-1">
            <ErrorDetails
              error={selectedError}
              onClose={() => setSelectedError(null)}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {dashboardData && !loading && dashboardData.errors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No errors found</h3>
          <p className="text-gray-600">
            {Object.values(filters).some(v => v && v !== '50' && v !== '0')
              ? 'Try adjusting your filters to see more results.'
              : 'Your application is running smoothly!'
            }
          </p>
        </div>
      )}
    </div>
  );
};