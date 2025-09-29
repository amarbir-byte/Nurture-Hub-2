/**
 * Error Filters Component
 *
 * Provides filtering controls for the error dashboard
 */

import { useState } from 'react'

interface Filters {
  severity?: string;
  context?: string;
  userId?: string;
  since?: string;
  limit: number;
  offset: number;
}

interface ErrorFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  summary: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    byContext: Record<string, number>;
  };
}

export const ErrorFilters = ({ filters, onFiltersChange, summary }: ErrorFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const timeRanges = [
    { label: 'Last Hour', value: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { label: 'Last 24 Hours', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { label: 'Last 7 Days', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
    { label: 'Last 30 Days', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const severityOptions = [
    { value: '', label: 'All Severities', count: summary.total },
    { value: 'critical', label: 'Critical', count: summary.bySeverity.critical },
    { value: 'high', label: 'High', count: summary.bySeverity.high },
    { value: 'medium', label: 'Medium', count: summary.bySeverity.medium },
    { value: 'low', label: 'Low', count: summary.bySeverity.low },
  ];

  const topContexts = Object.entries(summary.byContext || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  const clearFilters = () => {
    onFiltersChange({
      severity: '',
      context: '',
      userId: '',
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      limit: 50,
      offset: 0
    });
  };

  const hasActiveFilters = filters.severity || filters.context || filters.userId || filters.limit !== 50;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">🔍 Filter Errors</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? '↑ Simple' : '↓ Advanced'}
          </button>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Time Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Range
          </label>
          <select
            value={filters.since || ''}
            onChange={(e) => onFiltersChange({ since: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Severity
          </label>
          <select
            value={filters.severity || ''}
            onChange={(e) => onFiltersChange({ severity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {severityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {option.count > 0 && `(${option.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* Results per page */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Results per page
          </label>
          <select
            value={filters.limit}
            onChange={(e) => onFiltersChange({ limit: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25 errors</option>
            <option value={50}>50 errors</option>
            <option value={100}>100 errors</option>
            <option value={200}>200 errors</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Context Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Error Context
              </label>
              <select
                value={filters.context || ''}
                onChange={(e) => onFiltersChange({ context: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Contexts</option>
                {topContexts.map(([context, count]) => (
                  <option key={context} value={context}>
                    {context} ({count})
                  </option>
                ))}
              </select>
            </div>

            {/* User ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => onFiltersChange({ userId: e.target.value })}
                placeholder="Filter by specific user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Severity Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFiltersChange({ severity: 'critical' })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.severity === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                🔴 Critical ({summary.bySeverity.critical})
              </button>
              <button
                onClick={() => onFiltersChange({ severity: 'high' })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.severity === 'high'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                }`}
              >
                🟠 High ({summary.bySeverity.high})
              </button>
              <button
                onClick={() => onFiltersChange({
                  since: new Date(Date.now() - 60 * 60 * 1000).toISOString()
                })}
                className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                ⏰ Last Hour
              </button>
              <button
                onClick={() => onFiltersChange({ severity: '', context: '', userId: '' })}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {filters.severity && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                Severity: {filters.severity}
              </span>
            )}
            {filters.context && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                Context: {filters.context}
              </span>
            )}
            {filters.userId && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                User: {filters.userId}
              </span>
            )}
            {filters.limit !== 50 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                Limit: {filters.limit}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};