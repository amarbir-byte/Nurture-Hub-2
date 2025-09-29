/**
 * Error List Component
 *
 * Displays a list of errors with selection and pagination
 */

import { formatDistanceToNow } from 'date-fns'

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

interface ErrorListProps {
  errors: ErrorReport[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  selectedError: ErrorReport | null;
  onSelectError: (error: ErrorReport) => void;
  onLoadMore: () => void;
  getSeverityColor: (severity: string) => string;
  loading: boolean;
}

export const ErrorList = ({
  errors,
  pagination,
  selectedError,
  onSelectError,
  onLoadMore,
  getSeverityColor,
  loading
}: ErrorListProps) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message;
  };

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return '🌐 Chrome';
    if (userAgent.includes('Firefox')) return '🦊 Firefox';
    if (userAgent.includes('Safari')) return '🧭 Safari';
    if (userAgent.includes('Edge')) return '📘 Edge';
    return '🌐 Unknown';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          📋 Error Log
        </h3>
        <div className="text-sm text-gray-600">
          Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
        </div>
      </div>

      {/* Error List */}
      <div className="divide-y divide-gray-200">
        {errors.map((error) => (
          <div
            key={error.errorId}
            onClick={() => onSelectError(error)}
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedError?.errorId === error.errorId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Error Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getErrorIcon(error.severity)}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}>
                    {error.severity.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">{error.context}</span>
                </div>

                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {truncateMessage(error.error.message)}
                </h4>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>⏰ {formatTimestamp(error.timestamp)}</span>
                  {error.userId && <span>👤 User: {error.userId.slice(0, 8)}...</span>}
                  <span>{getBrowserInfo(error.userAgent)}</span>
                  <span>🔖 {error.errorId.slice(0, 8)}...</span>
                </div>

                {/* Metadata Preview */}
                {error.metadata && Object.keys(error.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(error.metadata)
                      .filter(([key]) => !key.startsWith('server') && !key.startsWith('client'))
                      .slice(0, 3)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          title={`${key}: ${value}`}
                        >
                          {key}: {String(value).slice(0, 20)}{String(value).length > 20 ? '...' : ''}
                        </span>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(error.errorId);
                    alert('Error ID copied to clipboard');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  title="Copy Error ID"
                >
                  📋
                </button>
                {error.error.stack && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(error.error.stack || '');
                      alert('Stack trace copied to clipboard');
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                    title="Copy Stack Trace"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {errors.length === 0 && !loading && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No errors found</h3>
          <p className="text-sm text-gray-600">
            Try adjusting your filters or time range to see more results.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-4 text-center">
          <div className="animate-spin text-2xl mb-2">⟳</div>
          <p className="text-sm text-gray-600">Loading errors...</p>
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && !loading && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Load More Errors ({pagination.total - pagination.offset - pagination.limit} remaining)
          </button>
        </div>
      )}

      {/* Pagination Info */}
      {errors.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              {errors.length} error{errors.length !== 1 ? 's' : ''} loaded
            </span>
            <span>
              {pagination.hasMore
                ? `${pagination.total - pagination.offset - pagination.limit} more available`
                : 'All errors loaded'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};