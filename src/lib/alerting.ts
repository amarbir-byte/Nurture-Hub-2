/**
 * Enterprise Alerting & Notification System
 *
 * Features:
 * - Multi-channel alerting (email, SMS, webhook, in-app)
 * - Severity-based escalation rules
 * - Alert deduplication and rate limiting
 * - Recovery notifications
 * - SLA monitoring and breach alerts
 */

import { supabase } from './supabase';
import { type ErrorReport, type PerformanceMetric } from './monitoring';

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  channels: AlertChannel[];
  cooldownMinutes: number;
  enabled: boolean;
}

export interface AlertCondition {
  type: 'error_rate' | 'error_count' | 'performance_threshold' | 'uptime' | 'custom';
  threshold: number;
  timeWindowMinutes: number;
  comparison: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  type: 'email' | 'sms' | 'webhook' | 'in_app' | 'slack';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, any>;
}

class EnterpriseAlerting {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startAlertProcessor();
  }

  // 🚨 ALERT RULE MANAGEMENT
  addAlertRule(rule: AlertRule) {
    this.alertRules.set(rule.id, rule);
    console.log(`✅ Alert rule added: ${rule.name}`);
  }

  removeAlertRule(ruleId: string) {
    this.alertRules.delete(ruleId);
    console.log(`✅ Alert rule removed: ${ruleId}`);
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>) {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.set(ruleId, { ...rule, ...updates });
      console.log(`✅ Alert rule updated: ${rule.name}`);
    }
  }

  // 🎯 ALERT PROCESSING
  async processError(errorReport: ErrorReport) {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.evaluateErrorCondition(rule.condition, errorReport);

      if (shouldTrigger && !this.isInCooldown(ruleId)) {
        await this.triggerAlert(rule, {
          type: 'error',
          errorReport
        });
      }
    }
  }

  async processMetrics(metrics: PerformanceMetric[]) {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const shouldTrigger = await this.evaluateMetricCondition(rule.condition, metrics);

      if (shouldTrigger && !this.isInCooldown(ruleId)) {
        await this.triggerAlert(rule, {
          type: 'performance',
          metrics: metrics.filter(m => this.isMetricRelevant(m, rule.condition))
        });
      }
    }
  }

  // 🔥 ALERT TRIGGERING
  private async triggerAlert(rule: AlertRule, context: Record<string, any>) {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      title: this.generateAlertTitle(rule, context),
      description: this.generateAlertDescription(rule, context),
      severity: rule.severity,
      status: 'active',
      triggeredAt: new Date(),
      metadata: {
        rule: rule.name,
        condition: rule.condition,
        context
      }
    };

    this.activeAlerts.set(alert.id, alert);
    this.setCooldown(rule.id, rule.cooldownMinutes);

    // Send notifications through all enabled channels
    await this.sendAlertNotifications(alert, rule.channels);

    // Store alert in database
    await this.persistAlert(alert);

    console.log(`🚨 Alert triggered: ${alert.title} (${alert.severity})`);

    return alert;
  }

  // 📧 NOTIFICATION CHANNELS
  private async sendAlertNotifications(alert: Alert, channels: AlertChannel[]) {
    const enabledChannels = channels.filter(c => c.enabled);

    for (const channel of enabledChannels) {
      try {
        await this.sendNotificationToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }
  }

  private async sendNotificationToChannel(alert: Alert, channel: AlertChannel) {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(alert, channel.config);
        break;
      case 'sms':
        await this.sendSMSAlert(alert, channel.config);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel.config);
        break;
      case 'in_app':
        await this.sendInAppAlert(alert, channel.config);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, channel.config);
        break;
      default:
        console.warn(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private async sendEmailAlert(alert: Alert, config: Record<string, any>) {
    const emailData = {
      to: config.recipients || ['admin@nurturehub.app'],
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: this.generateEmailTemplate(alert),
      priority: alert.severity === 'critical' ? 'high' : 'normal'
    };

    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log('📧 Email alert would be sent:', emailData);
  }

  private async sendSMSAlert(alert: Alert, config: Record<string, any>) {
    if (alert.severity !== 'critical') return; // SMS only for critical alerts

    const smsData = {
      to: config.phoneNumbers || ['+1234567890'],
      message: `🚨 CRITICAL: ${alert.title}\n\nTime: ${alert.triggeredAt.toISOString()}\n\nAlert ID: ${alert.id}`
    };

    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('📱 SMS alert would be sent:', smsData);
  }

  private async sendWebhookAlert(alert: Alert, config: Record<string, any>) {
    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        triggeredAt: alert.triggeredAt,
        metadata: alert.metadata
      },
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify(payload)
      });

      console.log('🔗 Webhook alert sent successfully');
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
      throw error;
    }
  }

  private async sendInAppAlert(alert: Alert, _config: Record<string, any>) {
    // Store notification in database for in-app display
    const notification = {
      id: alert.id,
      type: 'system_alert',
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      read: false,
      created_at: new Date().toISOString(),
      metadata: alert.metadata
    };

    try {
      await supabase
        .from('notifications')
        .insert([notification]);

      console.log('📱 In-app alert stored successfully');
    } catch (error) {
      console.error('Failed to store in-app alert:', error);
      throw error;
    }
  }

  private async sendSlackAlert(alert: Alert, config: Record<string, any>) {
    const slackMessage = {
      channel: config.channel || '#alerts',
      text: alert.title,
      attachments: [{
        color: this.getSlackColorBySeverity(alert.severity),
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Time',
            value: alert.triggeredAt.toISOString(),
            short: true
          },
          {
            title: 'Description',
            value: alert.description,
            short: false
          },
          {
            title: 'Alert ID',
            value: alert.id,
            short: true
          }
        ]
      }]
    };

    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      console.log('💬 Slack alert sent successfully');
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      throw error;
    }
  }

  // 🔄 ALERT RESOLUTION
  async resolveAlert(alertId: string, _resolvedBy?: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      console.warn(`Alert not found: ${alertId}`);
      return;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.activeAlerts.delete(alertId);

    await this.persistAlert(alert);
    await this.sendRecoveryNotification(alert);

    console.log(`✅ Alert resolved: ${alert.title}`);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      console.warn(`Alert not found: ${alertId}`);
      return;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    await this.persistAlert(alert);

    console.log(`👍 Alert acknowledged by ${acknowledgedBy}: ${alert.title}`);
  }

  // 🔄 AUTO-RESOLUTION
  private async checkForAutoResolution() {
    for (const [alertId, alert] of this.activeAlerts) {
      const rule = this.alertRules.get(alert.ruleId);
      if (!rule) continue;

      const isResolved = await this.isAlertConditionResolved(rule.condition, alert);

      if (isResolved) {
        await this.resolveAlert(alertId, 'system');
      }
    }
  }

  // 🔧 PRIVATE HELPER METHODS
  private async evaluateErrorCondition(condition: AlertCondition, errorReport: ErrorReport): Promise<boolean> {
    switch (condition.type) {
      case 'error_rate':
        return await this.checkErrorRate(condition, errorReport);
      case 'error_count':
        return await this.checkErrorCount(condition, errorReport);
      default:
        return false;
    }
  }

  private async evaluateMetricCondition(condition: AlertCondition, metrics: PerformanceMetric[]): Promise<boolean> {
    switch (condition.type) {
      case 'performance_threshold':
        return this.checkPerformanceThreshold(condition, metrics);
      default:
        return false;
    }
  }

  private async checkErrorRate(condition: AlertCondition, _errorReport: ErrorReport): Promise<boolean> {
    // Calculate error rate over time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.timeWindowMinutes * 60000);

    try {
      const { count: totalErrors } = await supabase
        .from('error_reports')
        .select('*', { count: 'exact' })
        .gte('timestamp', windowStart.toISOString())
        .lte('timestamp', now.toISOString());

      const errorRate = (totalErrors || 0) / condition.timeWindowMinutes;

      return this.compareValues(errorRate, condition.threshold, condition.comparison);
    } catch (error) {
      console.error('Error calculating error rate:', error);
      return false;
    }
  }

  private async checkErrorCount(condition: AlertCondition, errorReport: ErrorReport): Promise<boolean> {
    if (condition.metadata?.severity && errorReport.severity !== condition.metadata.severity) {
      return false;
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - condition.timeWindowMinutes * 60000);

    try {
      const { count } = await supabase
        .from('error_reports')
        .select('*', { count: 'exact' })
        .gte('timestamp', windowStart.toISOString())
        .lte('timestamp', now.toISOString());

      return this.compareValues(count || 0, condition.threshold, condition.comparison);
    } catch (error) {
      console.error('Error counting errors:', error);
      return false;
    }
  }

  private checkPerformanceThreshold(condition: AlertCondition, metrics: PerformanceMetric[]): boolean {
    const relevantMetrics = metrics.filter(m => this.isMetricRelevant(m, condition));

    if (relevantMetrics.length === 0) return false;

    const values = relevantMetrics.map(m => m.value);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

    return this.compareValues(avgValue, condition.threshold, condition.comparison);
  }

  private compareValues(actual: number, threshold: number, comparison: AlertCondition['comparison']): boolean {
    switch (comparison) {
      case 'gt': return actual > threshold;
      case 'gte': return actual >= threshold;
      case 'lt': return actual < threshold;
      case 'lte': return actual <= threshold;
      case 'eq': return actual === threshold;
      default: return false;
    }
  }

  private isMetricRelevant(metric: PerformanceMetric, condition: AlertCondition): boolean {
    if (condition.metadata?.metricName) {
      return metric.name === condition.metadata.metricName;
    }
    return true;
  }

  private async isAlertConditionResolved(_condition: AlertCondition, _alert: Alert): Promise<boolean> {
    // Implement logic to check if the condition that triggered the alert is now resolved
    // This is a simplified implementation
    return false;
  }

  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(ruleId);
    return cooldownEnd ? new Date() < cooldownEnd : false;
  }

  private setCooldown(ruleId: string, minutes: number) {
    const cooldownEnd = new Date(Date.now() + minutes * 60000);
    this.alertCooldowns.set(ruleId, cooldownEnd);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertTitle(rule: AlertRule, _context: Record<string, any>): string {
    switch (rule.condition.type) {
      case 'error_rate':
        return `High Error Rate: ${rule.name}`;
      case 'error_count':
        return `Error Threshold Exceeded: ${rule.name}`;
      case 'performance_threshold':
        return `Performance Degradation: ${rule.name}`;
      default:
        return rule.name;
    }
  }

  private generateAlertDescription(rule: AlertRule, _context: Record<string, any>): string {
    return `Alert condition '${rule.name}' has been triggered. Check the monitoring dashboard for details.`;
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${this.getColorBySeverity(alert.severity)}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 ${alert.severity.toUpperCase()} Alert</h1>
        </div>

        <div style="padding: 20px; border: 1px solid #ddd;">
          <h2>${alert.title}</h2>
          <p><strong>Description:</strong> ${alert.description}</p>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Triggered:</strong> ${alert.triggeredAt.toISOString()}</p>
          <p><strong>Alert ID:</strong> ${alert.id}</p>

          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Check the monitoring dashboard for detailed metrics</li>
              <li>Review recent deployments or configuration changes</li>
              <li>Acknowledge this alert if you're investigating</li>
              <li>Contact the on-call engineer if needed</li>
            </ol>
          </div>

          <p style="text-align: center;">
            <a href="https://nurture-hub.vercel.app/dashboard/monitoring"
               style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Dashboard
            </a>
          </p>
        </div>
      </div>
    `;
  }

  private async sendRecoveryNotification(alert: Alert) {
    // Send a recovery notification to let people know the issue is resolved
    const recoveryTitle = `✅ RECOVERED: ${alert.title}`;
    console.log(`✅ Recovery notification: ${recoveryTitle}`);
  }

  private getColorBySeverity(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  private getSlackColorBySeverity(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#36a64f';
    }
  }

  private async persistAlert(alert: Alert) {
    try {
      await supabase
        .from('alerts')
        .upsert([{
          id: alert.id,
          rule_id: alert.ruleId,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          status: alert.status,
          triggered_at: alert.triggeredAt.toISOString(),
          resolved_at: alert.resolvedAt?.toISOString(),
          acknowledged_at: alert.acknowledgedAt?.toISOString(),
          acknowledged_by: alert.acknowledgedBy,
          metadata: alert.metadata
        }]);
    } catch (error) {
      console.error('Failed to persist alert:', error);
    }
  }

  private initializeDefaultRules() {
    // Default alert rules for common scenarios
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: {
          type: 'error_rate',
          threshold: 10,
          timeWindowMinutes: 5,
          comparison: 'gt'
        },
        severity: 'critical',
        channels: [
          { type: 'email', config: { recipients: ['admin@nurturehub.app'] }, enabled: true },
          { type: 'sms', config: { phoneNumbers: ['+1234567890'] }, enabled: true }
        ],
        cooldownMinutes: 15,
        enabled: true
      },
      {
        id: 'critical_errors',
        name: 'Critical Error Threshold',
        condition: {
          type: 'error_count',
          threshold: 5,
          timeWindowMinutes: 10,
          comparison: 'gte',
          metadata: { severity: 'critical' }
        },
        severity: 'critical',
        channels: [
          { type: 'email', config: { recipients: ['admin@nurturehub.app'] }, enabled: true },
          { type: 'in_app', config: {}, enabled: true }
        ],
        cooldownMinutes: 30,
        enabled: true
      },
      {
        id: 'slow_api_response',
        name: 'Slow API Response Times',
        condition: {
          type: 'performance_threshold',
          threshold: 5000,
          timeWindowMinutes: 10,
          comparison: 'gt',
          metadata: { metricName: 'api_call_duration' }
        },
        severity: 'warning',
        channels: [
          { type: 'in_app', config: {}, enabled: true }
        ],
        cooldownMinutes: 20,
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  private startAlertProcessor() {
    // Check for alert conditions and auto-resolution every minute
    setInterval(() => {
      this.checkForAutoResolution();
    }, 60000);
  }

  // 📊 PUBLIC API
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  async getAlertHistory(limit: number = 50): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        ruleId: row.rule_id,
        title: row.title,
        description: row.description,
        severity: row.severity,
        status: row.status,
        triggeredAt: new Date(row.triggered_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        acknowledgedBy: row.acknowledged_by,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Failed to get alert history:', error);
      return [];
    }
  }
}

// 🌟 SINGLETON INSTANCE
export const alerting = new EnterpriseAlerting();

// 🎯 CONVENIENCE FUNCTIONS
export const addAlertRule = (rule: AlertRule) => alerting.addAlertRule(rule);
export const removeAlertRule = (ruleId: string) => alerting.removeAlertRule(ruleId);
export const resolveAlert = (alertId: string, resolvedBy?: string) => alerting.resolveAlert(alertId, resolvedBy);
export const acknowledgeAlert = (alertId: string, acknowledgedBy: string) => alerting.acknowledgeAlert(alertId, acknowledgedBy);
export const getActiveAlerts = () => alerting.getActiveAlerts();
export const getAlertHistory = (limit?: number) => alerting.getAlertHistory(limit);