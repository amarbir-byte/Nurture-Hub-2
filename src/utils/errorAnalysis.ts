/**
 * Error Analysis Utilities for Monitoring System
 *
 * This utility helps extract and analyze error data from localStorage
 * and provides insights into current error patterns.
 */

export interface StoredError {
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

export class ErrorAnalysis {
  /**
   * Extract all stored errors from localStorage
   */
  static getStoredErrors(): StoredError[] {
    try {
      const stored = localStorage.getItem('pendingErrors') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored errors:', error);
      return [];
    }
  }

  /**
   * Analyze error patterns and categorize them
   */
  static analyzeErrors(errors: StoredError[]) {
    const analysis = {
      total: errors.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byContext: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      recent: [] as StoredError[],
      mostCommon: [] as Array<{ message: string; count: number }>,
      timeDistribution: {} as Record<string, number>
    };

    const messageCount: Record<string, number> = {};
    const now = new Date();

    errors.forEach(error => {
      // Count by severity
      analysis.bySeverity[error.severity]++;

      // Count by context
      analysis.byContext[error.context] = (analysis.byContext[error.context] || 0) + 1;

      // Count by user
      if (error.userId) {
        analysis.byUser[error.userId] = (analysis.byUser[error.userId] || 0) + 1;
      }

      // Count message occurrences
      const message = error.error.message;
      messageCount[message] = (messageCount[message] || 0) + 1;

      // Recent errors (last 24 hours)
      const errorTime = new Date(error.timestamp);
      const hoursAgo = (now.getTime() - errorTime.getTime()) / (1000 * 60 * 60);
      if (hoursAgo <= 24) {
        analysis.recent.push(error);
      }

      // Time distribution (by hour)
      const hour = errorTime.getHours();
      analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
    });

    // Most common errors
    analysis.mostCommon = Object.entries(messageCount)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return analysis;
  }

  /**
   * Generate error report for console output
   */
  static generateReport(): string {
    const errors = this.getStoredErrors();
    const analysis = this.analyzeErrors(errors);

    const report = `
🔍 ERROR MONITORING ANALYSIS REPORT
=====================================

📊 SUMMARY:
- Total Errors: ${analysis.total}
- Critical: ${analysis.bySeverity.critical}
- High: ${analysis.bySeverity.high}
- Medium: ${analysis.bySeverity.medium}
- Low: ${analysis.bySeverity.low}

📈 RECENT ACTIVITY (24h): ${analysis.recent.length} errors

🏷️  TOP ERROR CONTEXTS:
${Object.entries(analysis.byContext)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([context, count]) => `- ${context}: ${count}`)
  .join('\n')}

🚨 MOST COMMON ERRORS:
${analysis.mostCommon.slice(0, 5).map((item, i) =>
  `${i + 1}. ${item.message} (${item.count}x)`
).join('\n')}

👥 USER IMPACT:
- Affected Users: ${Object.keys(analysis.byUser).length}
- Top User: ${Object.entries(analysis.byUser)
  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'} (${Object.entries(analysis.byUser)
  .sort(([,a], [,b]) => b - a)[0]?.[1] || 0} errors)

⏰ TIME DISTRIBUTION:
${Object.entries(analysis.timeDistribution)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 3)
  .map(([hour, count]) => `- ${hour}:00 - ${count} errors`)
  .join('\n')}

💡 RECOMMENDATIONS:
${this.generateRecommendations(analysis)}
`;

    return report;
  }

  /**
   * Generate actionable recommendations based on error analysis
   */
  static generateRecommendations(analysis: any): string {
    const recommendations = [];

    if (analysis.bySeverity.critical > 0) {
      recommendations.push('🔴 URGENT: Fix critical errors immediately');
    }

    if (analysis.bySeverity.high > 5) {
      recommendations.push('🟠 HIGH: Review high-severity errors affecting user experience');
    }

    const topContext = Object.entries(analysis.byContext)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (topContext && (topContext[1] as number) > 3) {
      recommendations.push(`🎯 FOCUS: Address errors in "${topContext[0]}" (${topContext[1]} occurrences)`);
    }

    if (analysis.recent.length > analysis.total * 0.5) {
      recommendations.push('⚡ TRENDING: Recent spike in errors - investigate new changes');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ STABLE: Error levels appear manageable');
    }

    return recommendations.join('\n');
  }

  /**
   * Clear stored errors (use with caution)
   */
  static clearStoredErrors(): void {
    localStorage.removeItem('pendingErrors');
    console.log('✅ Stored errors cleared from localStorage');
  }

  /**
   * Export errors as JSON for external analysis
   */
  static exportErrors(): string {
    const errors = this.getStoredErrors();
    const analysis = this.analyzeErrors(errors);

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      errors,
      analysis
    }, null, 2);
  }
}

// Browser console helper functions
export const monitoringConsole = {
  /**
   * Show error analysis report in console
   */
  report: () => {
    console.log(ErrorAnalysis.generateReport());
  },

  /**
   * Show raw error data
   */
  raw: () => {
    const errors = ErrorAnalysis.getStoredErrors();
    console.table(errors.map(e => ({
      severity: e.severity,
      context: e.context,
      message: e.error.message,
      timestamp: e.timestamp,
      userId: e.userId
    })));
  },

  /**
   * Export error data
   */
  export: () => {
    const data = ErrorAnalysis.exportErrors();
    console.log('Copy the following JSON data:');
    console.log(data);
    return data;
  },

  /**
   * Clear all stored errors
   */
  clear: () => {
    ErrorAnalysis.clearStoredErrors();
  }
};

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).monitoringConsole = monitoringConsole;
}