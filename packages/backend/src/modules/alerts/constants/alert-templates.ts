import { AlertType, Severity } from '@prisma/client';

export interface AlertRuleTemplate {
  name: string;
  description: string;
  type: AlertType;
  metric: string;
  threshold: number;
  comparisonOp: string;
  windowMinutes: number;
  severity: Severity;
  cooldownMinutes: number;
}

export const ALERT_TEMPLATES: AlertRuleTemplate[] = [
  {
    name: 'High Error Rate',
    description: 'Alert when API error rate exceeds 5% for 5 minutes',
    type: AlertType.ERROR_RATE_HIGH,
    metric: 'errorRate',
    threshold: 5,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
  {
    name: 'Very High Error Rate',
    description: 'Emergency alert when error rate exceeds 15%',
    type: AlertType.ERROR_RATE_HIGH,
    metric: 'errorRate',
    threshold: 15,
    comparisonOp: '>',
    windowMinutes: 3,
    severity: Severity.EMERGENCY,
    cooldownMinutes: 10,
  },
  {
    name: 'Slow Response Time',
    description: 'Alert when avg response time exceeds 2 seconds',
    type: AlertType.RESPONSE_TIME_SLOW,
    metric: 'avgResponseTime',
    threshold: 2000,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 10,
  },
  {
    name: 'Very Slow Response',
    description: 'Critical alert when response time exceeds 5 seconds',
    type: AlertType.RESPONSE_TIME_SLOW,
    metric: 'avgResponseTime',
    threshold: 5000,
    comparisonOp: '>',
    windowMinutes: 3,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
  {
    name: 'High CPU Usage',
    description: 'Alert when CPU usage exceeds 80%',
    type: AlertType.CPU_HIGH,
    metric: 'cpuUsage',
    threshold: 80,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
  {
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds 85%',
    type: AlertType.MEMORY_HIGH,
    metric: 'memoryUsage',
    threshold: 85,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
  {
    name: 'Database Slow',
    description: 'Alert when database latency exceeds 500ms',
    type: AlertType.DATABASE_SLOW,
    metric: 'postgresLatency',
    threshold: 500,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 10,
  },
  {
    name: 'Database Connections High',
    description: 'Alert when database connections usage exceeds 80%',
    type: AlertType.DATABASE_CONNECTIONS_HIGH,
    metric: 'databaseConnectionsPercentage',
    threshold: 80,
    comparisonOp: '>',
    windowMinutes: 3,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
];
