/**
 * Dashboard Statistics Component
 *
 * Displays key error monitoring metrics and trends
 */

import { useMemo } from 'react'

interface DashboardStatsProps {
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
  };
  getSeverityColor: (severity: string) => string;
}

export const DashboardStats = ({ summary, getSeverityColor }: DashboardStatsProps) => {
  const stats = useMemo(() => {
    const { total, bySeverity, recentTrend } = summary;

    // Calculate trends
    const hourlyRate = recentTrend.lastHour;
    const dailyRate = recentTrend.last24Hours;

    // Calculate percentages
    const criticalPercent = total > 0 ? (bySeverity.critical / total) * 100 : 0;
    const highPercent = total > 0 ? (bySeverity.high / total) * 100 : 0;

    // Determine trend direction
    const getTrend = (current: number, previous: number) => {
      if (current > previous) return { direction: 'up', color: 'text-red-600', icon: '↗️' };
      if (current < previous) return { direction: 'down', color: 'text-green-600', icon: '↘️' };
      return { direction: 'stable', color: 'text-gray-600', icon: '→' };
    };

    const hourlyTrend = getTrend(hourlyRate, Math.max(1, dailyRate / 24));

    return {
      total,
      bySeverity,
      recentTrend,
      criticalPercent: Math.round(criticalPercent),
      highPercent: Math.round(highPercent),
      hourlyRate,
      dailyRate,
      hourlyTrend
    };
  }, [summary]);

  const StatCard = ({ title, value, subtitle, trend, color = 'text-gray-900' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { direction: string; color: string; icon: string };
    color?: string;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={`text-right ${trend.color}`}>
            <div className="text-lg">{trend.icon}</div>
            <p className="text-xs font-medium">{trend.direction}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Errors */}
      <StatCard
        title="Total Errors (24h)"
        value={stats.total}
        subtitle={`${stats.hourlyRate} in last hour`}
        trend={stats.hourlyTrend}
        color={stats.total > 100 ? 'text-red-600' : stats.total > 50 ? 'text-orange-600' : 'text-green-600'}
      />

      {/* Critical Errors */}
      <StatCard
        title="Critical Errors"
        value={stats.bySeverity.critical}
        subtitle={`${stats.criticalPercent}% of total`}
        color={stats.bySeverity.critical > 0 ? 'text-red-600' : 'text-green-600'}
      />

      {/* High Priority Errors */}
      <StatCard
        title="High Priority"
        value={stats.bySeverity.high}
        subtitle={`${stats.highPercent}% of total`}
        color={stats.bySeverity.high > 10 ? 'text-orange-600' : 'text-green-600'}
      />

      {/* Error Rate */}
      <StatCard
        title="Error Rate"
        value={`${Math.round(stats.hourlyRate)}/${Math.round(stats.dailyRate / 24)}`}
        subtitle="per hour (avg)"
        color={stats.hourlyRate > 5 ? 'text-red-600' : stats.hourlyRate > 2 ? 'text-orange-600' : 'text-green-600'}
      />

      {/* Severity Breakdown */}
      <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Error Severity Distribution</h3>

        <div className="space-y-3">
          {Object.entries(stats.bySeverity).map(([severity, count]) => {
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

            return (
              <div key={severity} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
                    {severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium">{count}</span>
                </div>

                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      severity === 'critical' ? 'bg-red-500' :
                      severity === 'high' ? 'bg-orange-500' :
                      severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                  />
                </div>

                <span className="text-sm text-gray-600 min-w-[50px] text-right">
                  {Math.round(percentage)}%
                </span>
              </div>
            );
          })}
        </div>

        {stats.total === 0 && (
          <div className="text-center py-6 text-gray-500">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-sm">No errors in the selected time period!</p>
          </div>
        )}
      </div>

      {/* Trend Analysis */}
      <div className="md:col-span-2 lg:col-span-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Trend Analysis</h3>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.recentTrend.lastHour}</p>
            <p className="text-xs text-gray-600">Last Hour</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.recentTrend.last24Hours}</p>
            <p className="text-xs text-gray-600">Last 24 Hours</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.recentTrend.lastWeek}</p>
            <p className="text-xs text-gray-600">Last Week</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">System Status:</span>
            <span className={`font-medium ${
              stats.bySeverity.critical > 0 ? 'text-red-600' :
              stats.bySeverity.high > 5 ? 'text-orange-600' :
              stats.total > 50 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {stats.bySeverity.critical > 0 ? '🔴 Critical Issues Detected' :
               stats.bySeverity.high > 5 ? '🟠 High Error Volume' :
               stats.total > 50 ? '🟡 Elevated Error Rate' :
               '🟢 System Operating Normally'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};