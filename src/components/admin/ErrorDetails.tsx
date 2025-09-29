/**
 * Error Details Component
 *
 * Shows detailed information about a selected error
 */

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

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

interface ErrorDetailsProps {
  error: ErrorReport | null;
  onClose: () => void;
}

export const ErrorDetails = ({ error, onClose }: ErrorDetailsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stack' | 'metadata' | 'context'>('overview');

  if (!error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Error Selected</h3>
          <p className="text-sm">Click on an error in the list to view details</p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        absolute: format(date, 'PPpp')
      };
    } catch {
      return { relative: 'Unknown time', absolute: 'Unknown time' };
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const parseUserAgent = (userAgent: string) => {
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
                   userAgent.includes('Firefox') ? 'Firefox' :
                   userAgent.includes('Safari') ? 'Safari' :
                   userAgent.includes('Edge') ? 'Edge' : 'Unknown';

    const os = userAgent.includes('Windows') ? 'Windows' :
               userAgent.includes('Mac') ? 'macOS' :
               userAgent.includes('Linux') ? 'Linux' :
               userAgent.includes('Android') ? 'Android' :
               userAgent.includes('iOS') ? 'iOS' : 'Unknown';

    return { browser, os };
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard`);
    });
  };

  const timeInfo = formatTimestamp(error.timestamp);
  const userAgentInfo = parseUserAgent(error.userAgent);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'stack', label: 'Stack Trace', icon: '🔍' },
    { id: 'metadata', label: 'Metadata', icon: '📋' },
    { id: 'context', label: 'Context', icon: '🔧' }
  ] as const;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSeverityIcon(error.severity)}</span>
          <h3 className="text-lg font-medium text-gray-900">Error Details</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg"
          title="Close details"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Severity Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getSeverityColor(error.severity)}`}>
              <span className="font-medium">{error.severity.toUpperCase()} ERROR</span>
            </div>

            {/* Error Message */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Error Message:</h4>
              <div className="bg-gray-50 rounded p-3 border text-sm font-mono break-words">
                {error.error.message}
              </div>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Error ID:</h4>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{error.errorId}</code>
                  <button
                    onClick={() => copyToClipboard(error.errorId, 'Error ID')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">Context:</h4>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{error.context}</span>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">Timestamp:</h4>
                <div className="text-sm">
                  <div>{timeInfo.relative}</div>
                  <div className="text-gray-600">{timeInfo.absolute}</div>
                </div>
              </div>

              {error.userId && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">User ID:</h4>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{error.userId}</code>
                    <button
                      onClick={() => copyToClipboard(error.userId!, 'User ID')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-1">Browser & OS:</h4>
                <div className="text-sm">
                  <div>🌐 {userAgentInfo.browser}</div>
                  <div>💻 {userAgentInfo.os}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stack' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Stack Trace:</h4>
              {(error.error.stack || error.stackTrace) && (
                <button
                  onClick={() => copyToClipboard(error.error.stack || error.stackTrace, 'Stack trace')}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  📋 Copy
                </button>
              )}
            </div>
            <pre className="bg-gray-50 rounded p-3 border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {error.error.stack || error.stackTrace || 'No stack trace available'}
            </pre>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Metadata:</h4>
              {error.metadata && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(error.metadata, null, 2), 'Metadata')}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  📋 Copy JSON
                </button>
              )}
            </div>
            {error.metadata && Object.keys(error.metadata).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(error.metadata).map(([key, value]) => (
                  <div key={key} className="border-b border-gray-200 pb-2 last:border-b-0">
                    <div className="font-medium text-sm text-gray-700">{key}:</div>
                    <div className="text-sm bg-gray-50 rounded p-2 mt-1 font-mono break-words">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No metadata available
              </div>
            )}
          </div>
        )}

        {activeTab === 'context' && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">User Agent:</h4>
              <div className="text-xs bg-gray-50 rounded p-2 border font-mono break-words">
                {error.userAgent}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">URL & Environment:</h4>
              <div className="text-sm space-y-1">
                {error.metadata?.url && (
                  <div>🔗 URL: {error.metadata.url}</div>
                )}
                {error.metadata?.referrer && (
                  <div>↩️ Referrer: {error.metadata.referrer}</div>
                )}
                {error.metadata?.viewport && (
                  <div>📱 Viewport: {error.metadata.viewport}</div>
                )}
              </div>
            </div>

            {error.metadata?.memory && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Memory Usage:</h4>
                <div className="text-xs bg-gray-50 rounded p-2 border">
                  <pre>{JSON.stringify(error.metadata.memory, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Error occurred {timeInfo.relative}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(JSON.stringify(error, null, 2), 'Complete error data')}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📋 Copy All
          </button>
        </div>
      </div>
    </div>
  );
};