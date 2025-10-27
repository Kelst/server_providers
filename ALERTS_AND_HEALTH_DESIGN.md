# Розширена система Health Metrics + Alerts

## Проблеми поточної імплементації

### Health Metrics - занадто скудні:
1. **Database (PostgreSQL)**
   - ❌ Немає connection pool status
   - ❌ Немає database size
   - ❌ Немає slow queries detection
   - ❌ Немає active connections count

2. **Redis**
   - ❌ Немає memory usage
   - ❌ Немає connected clients
   - ❌ Немає hit/miss rate
   - ❌ Немає eviction stats

3. **System**
   - ❌ CPU usage тільки в мікросекундах (не %)
   - ❌ Немає disk space metrics
   - ❌ Немає load average
   - ❌ Немає network I/O

4. **Application**
   - ❌ Немає event loop lag
   - ❌ Немає active HTTP connections
   - ❌ Немає WebSocket connections count
   - ❌ Немає request queue metrics

5. **ABills**
   - ❌ Взагалі не перевіряється (заглушка)
   - ❌ Немає MySQL connection check

### Alerts - система не існує:
- ❌ Немає моніторингу метрик
- ❌ Немає правил алертів
- ❌ Немає автоматичної відправки
- ❌ Немає історії алертів

---

## Повна імплементація: План

### Phase 1: Розширені Health Metrics (Priority: HIGH)

#### 1.1 Enhanced Database Health
```typescript
interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  connections: {
    active: number;
    idle: number;
    max: number;
    waiting: number;
  };
  size: {
    total: string; // "1.2 GB"
    tables: number;
    indexes: string;
  };
  performance: {
    slowQueries: number; // last hour
    avgQueryTime: number;
    transactionsPerSecond: number;
  };
  replication?: {
    lag: number; // seconds
    status: string;
  };
}
```

#### 1.2 Enhanced Redis Health
```typescript
interface RedisHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  memory: {
    used: string; // "45 MB"
    peak: string;
    fragmentation: number;
    evictedKeys: number;
  };
  clients: {
    connected: number;
    blocked: number;
    maxClients: number;
  };
  stats: {
    hitRate: number; // %
    opsPerSec: number;
    keyspace: number; // total keys
  };
  persistence: {
    lastSave: string;
    changesSinceLastSave: number;
  };
}
```

#### 1.3 Enhanced System Health
```typescript
interface SystemHealth {
  uptime: number;
  cpu: {
    usage: number; // % (0-100)
    cores: number;
    loadAverage: [number, number, number]; // 1m, 5m, 15m
    temperature?: number; // if available
  };
  memory: {
    total: number; // bytes
    used: number;
    free: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    path: string;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  process: {
    pid: number;
    ppid: number;
    version: string;
    platform: string;
    openFileDescriptors: number;
    maxFileDescriptors: number;
  };
}
```

#### 1.4 Enhanced Application Health
```typescript
interface ApplicationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  http: {
    activeConnections: number;
    requestsInQueue: number;
    totalRequests: number;
    requestsPerSecond: number;
  };
  websocket: {
    activeConnections: number;
    rooms: number;
    messagesPerSecond: number;
  };
  eventLoop: {
    lag: number; // ms
    utilization: number; // %
  };
  errors: {
    lastHour: number;
    rate: number; // %
    types: Record<string, number>;
  };
  cache: {
    hitRate: number;
    size: number;
  };
}
```

#### 1.5 Real ABills Health Check
```typescript
interface AbillsHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mysql: {
    connected: boolean;
    latency: number;
    version: string;
    uptime: number;
  };
  api: {
    responsive: boolean;
    responseTime: number;
    lastSync: string;
  };
  data: {
    totalUsers: number;
    activeUsers: number;
    lastUpdate: string;
  };
}
```

---

### Phase 2: Alert System Architecture

#### 2.1 Alert Types
```typescript
enum AlertType {
  // Performance
  ERROR_RATE_HIGH = 'ERROR_RATE_HIGH',
  RESPONSE_TIME_SLOW = 'RESPONSE_TIME_SLOW',
  REQUESTS_SPIKE = 'REQUESTS_SPIKE',

  // Resources
  CPU_HIGH = 'CPU_HIGH',
  MEMORY_HIGH = 'MEMORY_HIGH',
  DISK_FULL = 'DISK_FULL',

  // Services
  DATABASE_SLOW = 'DATABASE_SLOW',
  DATABASE_CONNECTIONS_HIGH = 'DATABASE_CONNECTIONS_HIGH',
  REDIS_SLOW = 'REDIS_SLOW',
  REDIS_MEMORY_HIGH = 'REDIS_MEMORY_HIGH',

  // Application
  EVENT_LOOP_BLOCKED = 'EVENT_LOOP_BLOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_DOWN = 'SERVICE_DOWN',

  // ABills
  ABILLS_UNREACHABLE = 'ABILLS_UNREACHABLE',
  ABILLS_SYNC_FAILED = 'ABILLS_SYNC_FAILED',

  // Custom
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  CUSTOM = 'CUSTOM',
}

enum Severity {
  INFO = 'INFO',           // Інформаційні
  WARNING = 'WARNING',     // Попередження
  CRITICAL = 'CRITICAL',   // Критичні
  EMERGENCY = 'EMERGENCY', // Екстрені (сервіс падає)
}
```

#### 2.2 Alert Rule Configuration
```typescript
interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description?: string;

  // What to monitor
  type: AlertType;
  metric: string; // "error_rate", "cpu_usage", "response_time"

  // Condition
  threshold: number;
  comparisonOp: '>' | '<' | '>=' | '<=' | '==' | '!=';
  windowMinutes: number; // Check last X minutes

  // Severity
  severity: Severity;

  // Notification settings
  cooldownMinutes: number; // Don't spam (min 5 minutes)
  notifyTelegram: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  webhookUrl?: string;

  // Recovery notification
  notifyOnRecovery: boolean;

  // Status
  isActive: boolean;
  lastTriggered?: Date;
  lastChecked?: Date;

  timestamps: {
    createdAt: Date;
    updatedAt: Date;
  };
}
```

#### 2.3 Alert Record
```typescript
interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;

  // Alert details
  type: AlertType;
  severity: Severity;
  message: string;

  // Metric data
  metric: string;
  currentValue: number;
  threshold: number;

  // Context
  metadata: {
    affected?: string[]; // affected services/endpoints
    duration?: number; // how long the issue exists
    previousValue?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
  };

  // Notification status
  sentAt: Date;
  channels: {
    telegram: boolean;
    email: boolean;
    webhook: boolean;
  };

  // Recovery
  resolved: boolean;
  resolvedAt?: Date;
  recoveryMessage?: string;
}
```

#### 2.4 Alert Service Architecture
```typescript
@Injectable()
class AlertsService {
  // Main monitoring loop (runs every 1-5 minutes)
  @Cron('*/1 * * * *') // Every minute
  async checkAlerts() {
    // 1. Fetch current metrics
    const metrics = await this.collectMetrics();

    // 2. Get all active alert rules
    const rules = await this.getActiveRules();

    // 3. Evaluate each rule
    for (const rule of rules) {
      await this.evaluateRule(rule, metrics);
    }
  }

  // Collect all metrics
  private async collectMetrics() {
    const [health, analytics, realtime] = await Promise.all([
      this.healthService.getEnhancedHealth(),
      this.analyticsService.getDashboardStats(null),
      this.analyticsService.getRealtimeMetrics(null),
    ]);

    return {
      // Performance
      errorRate: analytics.errorRate,
      avgResponseTime: realtime.summary.avgResponseTime,
      requestsPerSecond: realtime.summary.requestsPerSecond,

      // Resources
      cpuUsage: health.system.cpu.usage,
      memoryUsage: health.system.memory.percentage,
      diskUsage: health.system.disk.percentage,

      // Services
      postgresLatency: health.services.postgres.latency,
      redisLatency: health.services.redis.latency,

      // Application
      eventLoopLag: health.application.eventLoop.lag,
      activeConnections: health.application.http.activeConnections,
    };
  }

  // Evaluate a single rule
  private async evaluateRule(rule: AlertRule, metrics: any) {
    const metricValue = metrics[rule.metric];

    // Check if condition is met
    const isTriggered = this.checkCondition(
      metricValue,
      rule.comparisonOp,
      rule.threshold
    );

    if (isTriggered) {
      // Check cooldown (don't spam)
      if (this.isInCooldown(rule)) {
        return;
      }

      // Create alert
      await this.triggerAlert(rule, metricValue, metrics);
    } else {
      // Check if we need to send recovery notification
      await this.checkRecovery(rule, metricValue);
    }
  }

  // Trigger an alert
  private async triggerAlert(rule: AlertRule, value: number, metrics: any) {
    // Create alert record
    const alert = await this.createAlert(rule, value, metrics);

    // Send notifications
    const promises = [];

    if (rule.notifyTelegram) {
      promises.push(this.sendTelegramAlert(alert));
    }

    if (rule.notifyEmail) {
      promises.push(this.sendEmailAlert(alert));
    }

    if (rule.notifyWebhook) {
      promises.push(this.sendWebhookAlert(alert));
    }

    // Real-time broadcast to dashboard
    promises.push(this.broadcastAlert(alert));

    await Promise.allSettled(promises);

    // Update rule last triggered time
    await this.updateRuleTriggered(rule.id);
  }

  // Format Telegram message
  private formatTelegramMessage(alert: Alert): string {
    const emoji = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      CRITICAL: '🔴',
      EMERGENCY: '🚨',
    }[alert.severity];

    return `
${emoji} *${alert.severity} ALERT*

${alert.message}
━━━━━━━━━━━━━━━━━━
*Metric:* ${alert.metric}
*Current:* ${alert.currentValue}
*Threshold:* ${alert.threshold}
*Time:* ${new Date().toLocaleString()}

_Rule: ${alert.ruleName}_
    `.trim();
  }
}
```

#### 2.5 Alert Deduplication & Cooldown
```typescript
// Don't spam the same alert
private isInCooldown(rule: AlertRule): boolean {
  if (!rule.lastTriggered) return false;

  const cooldownMs = rule.cooldownMinutes * 60 * 1000;
  const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();

  return timeSinceLastTrigger < cooldownMs;
}

// Group similar alerts
private async deduplicateAlerts(alerts: Alert[]): Promise<Alert[]> {
  const grouped = new Map<string, Alert[]>();

  for (const alert of alerts) {
    const key = `${alert.type}_${alert.metric}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(alert);
  }

  // Take only the most recent from each group
  return Array.from(grouped.values()).map(group =>
    group.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0]
  );
}
```

#### 2.6 Recovery Notifications
```typescript
private async checkRecovery(rule: AlertRule, currentValue: number) {
  if (!rule.notifyOnRecovery) return;

  // Check if there was a recent unresolved alert for this rule
  const unresolvedAlert = await this.prisma.alert.findFirst({
    where: {
      ruleId: rule.id,
      resolved: false,
      sentAt: {
        gte: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000),
      },
    },
    orderBy: { sentAt: 'desc' },
  });

  if (unresolvedAlert) {
    // Mark as resolved
    await this.prisma.alert.update({
      where: { id: unresolvedAlert.id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        recoveryMessage: `Metric returned to normal: ${currentValue}`,
      },
    });

    // Send recovery notification
    const message = `
✅ *RECOVERED*

${unresolvedAlert.message}
━━━━━━━━━━━━━━━━━━
*Status:* Back to normal
*Current:* ${currentValue}
*Duration:* ${this.formatDuration(unresolvedAlert.sentAt, new Date())}

_Rule: ${rule.name}_
    `.trim();

    await this.settingsService.sendTelegramMessage(rule.userId, message);
  }
}
```

---

### Phase 3: Frontend UI

#### 3.1 Alert Rules Management Page
```typescript
// packages/admin/src/app/dashboard/alerts/rules/page.tsx

Features:
- List all alert rules with status
- Create new rule with wizard:
  * Step 1: Choose metric type (dropdown with categories)
  * Step 2: Set threshold & condition
  * Step 3: Configure notifications
  * Step 4: Review & activate
- Edit existing rules
- Delete rules
- Enable/disable rules (toggle)
- Test rule (trigger manually to test notifications)
- Duplicate rule (copy as template)

UI Components:
- Alert Rule Card with status badge
- Create Rule Wizard (multi-step form)
- Rule Templates (pre-configured common rules)
- Test Alert button
```

#### 3.2 Alerts History Page
```typescript
// packages/admin/src/app/dashboard/alerts/history/page.tsx

Features:
- List all triggered alerts (paginated)
- Filter by:
  * Severity (INFO, WARNING, CRITICAL, EMERGENCY)
  * Type (ERROR_RATE, CPU_HIGH, etc.)
  * Date range
  * Resolved/Unresolved
- Alert details modal with full context
- Acknowledge alert
- Manually resolve alert
- Export alerts to CSV/JSON

UI Components:
- Alert Card with severity color
- Timeline view
- Filter sidebar
- Alert details modal
- Statistics cards (total alerts, by severity)
```

#### 3.3 Alert Rule Templates
```typescript
const ALERT_TEMPLATES: AlertRuleTemplate[] = [
  {
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    type: AlertType.ERROR_RATE_HIGH,
    metric: 'errorRate',
    threshold: 5,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.CRITICAL,
    cooldownMinutes: 15,
  },
  {
    name: 'Slow Response Time',
    description: 'Alert when avg response time > 2 seconds',
    type: AlertType.RESPONSE_TIME_SLOW,
    metric: 'avgResponseTime',
    threshold: 2000,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 10,
  },
  {
    name: 'High CPU Usage',
    description: 'Alert when CPU usage > 80%',
    type: AlertType.CPU_HIGH,
    metric: 'cpuUsage',
    threshold: 80,
    comparisonOp: '>',
    windowMinutes: 3,
    severity: Severity.CRITICAL,
    cooldownMinutes: 20,
  },
  {
    name: 'High Memory Usage',
    description: 'Alert when memory usage > 85%',
    type: AlertType.MEMORY_HIGH,
    metric: 'memoryUsage',
    threshold: 85,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.CRITICAL,
    cooldownMinutes: 20,
  },
  {
    name: 'Disk Almost Full',
    description: 'Alert when disk usage > 90%',
    type: AlertType.DISK_FULL,
    metric: 'diskUsage',
    threshold: 90,
    comparisonOp: '>',
    windowMinutes: 10,
    severity: Severity.EMERGENCY,
    cooldownMinutes: 60,
  },
  {
    name: 'Database Slow',
    description: 'Alert when DB latency > 500ms',
    type: AlertType.DATABASE_SLOW,
    metric: 'postgresLatency',
    threshold: 500,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 15,
  },
  {
    name: 'Redis Slow',
    description: 'Alert when Redis latency > 100ms',
    type: AlertType.REDIS_SLOW,
    metric: 'redisLatency',
    threshold: 100,
    comparisonOp: '>',
    windowMinutes: 5,
    severity: Severity.WARNING,
    cooldownMinutes: 15,
  },
  {
    name: 'Event Loop Blocked',
    description: 'Alert when event loop lag > 100ms',
    type: AlertType.EVENT_LOOP_BLOCKED,
    metric: 'eventLoopLag',
    threshold: 100,
    comparisonOp: '>',
    windowMinutes: 3,
    severity: Severity.CRITICAL,
    cooldownMinutes: 10,
  },
];
```

---

### Phase 4: Implementation Priority

**Must Have (MVP):**
1. ✅ Enhanced Health Service з детальними метриками
2. ✅ Alerts Service з cron job моніторингу
3. ✅ AlertRules CRUD endpoints
4. ✅ Telegram notifications
5. ✅ Alert Rules UI (create/edit/delete)
6. ✅ Alerts History UI
7. ✅ Template rules для швидкого старту

**Should Have:**
- Recovery notifications
- Alert deduplication
- Alert statistics dashboard
- Email notifications
- Webhook notifications

**Nice to Have:**
- Custom alert types
- Alert grouping
- Alert escalation (if not acknowledged)
- Machine learning anomaly detection
- Performance predictions

---

## Приклад Telegram алертів

### Critical Alert
```
🔴 CRITICAL ALERT

High Error Rate Detected
━━━━━━━━━━━━━━━━━━
Metric: error_rate
Current: 8.5%
Threshold: 5%
Duration: Last 5 minutes

Affected endpoints:
• POST /api/billing/payment
• GET /api/users/:id

Time: 2025-10-27 15:30:42

Rule: API Error Rate Monitor
```

### Recovery
```
✅ RECOVERED

High Error Rate Detected
━━━━━━━━━━━━━━━━━━
Status: Back to normal
Current: 2.1%
Duration: 23 minutes

Rule: API Error Rate Monitor
```

### Info Alert
```
ℹ️ INFO

Traffic Spike Detected
━━━━━━━━━━━━━━━━━━
Metric: requests_per_second
Current: 150 req/s
Normal: 45 req/s
Time: 2025-10-27 15:30:42

Rule: Traffic Monitor
```

---

## Технічні деталі

### Database Changes (Prisma Schema)
```prisma
// Already exists, but needs updates:
model AlertRule {
  id                String     @id @default(uuid())
  userId            String     @map("user_id")
  name              String
  description       String?
  type              AlertType
  metric            String
  threshold         Float
  comparisonOp      String     @map("comparison_op") @db.VarChar(5)
  windowMinutes     Int        @map("window_minutes") @default(5)
  severity          Severity
  cooldownMinutes   Int        @map("cooldown_minutes") @default(15)
  notifyTelegram    Boolean    @default(true) @map("notify_telegram")
  notifyEmail       Boolean    @default(false) @map("notify_email")
  notifyWebhook     Boolean    @default(false) @map("notify_webhook")
  webhookUrl        String?    @map("webhook_url")
  notifyOnRecovery  Boolean    @default(true) @map("notify_on_recovery")
  isActive          Boolean    @default(true) @map("is_active")
  lastTriggered     DateTime?  @map("last_triggered")
  lastChecked       DateTime?  @map("last_checked")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts            Alert[]

  @@map("alert_rules")
}

model Alert {
  id                String     @id @default(uuid())
  ruleId            String     @map("rule_id")
  ruleName          String     @map("rule_name")
  type              AlertType
  severity          Severity
  message           String     @db.Text
  metric            String
  currentValue      Float      @map("current_value")
  threshold         Float
  metadata          Json?
  sentAt            DateTime   @default(now()) @map("sent_at")
  channelTelegram   Boolean    @default(false) @map("channel_telegram")
  channelEmail      Boolean    @default(false) @map("channel_email")
  channelWebhook    Boolean    @default(false) @map("channel_webhook")
  resolved          Boolean    @default(false)
  resolvedAt        DateTime?  @map("resolved_at")
  recoveryMessage   String?    @map("recovery_message") @db.Text
  acknowledgedBy    String?    @map("acknowledged_by")
  acknowledgedAt    DateTime?  @map("acknowledged_at")
  rule              AlertRule  @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@index([ruleId])
  @@index([sentAt])
  @@index([resolved])
  @@map("alerts")
}

enum AlertType {
  ERROR_RATE_HIGH
  RESPONSE_TIME_SLOW
  REQUESTS_SPIKE
  CPU_HIGH
  MEMORY_HIGH
  DISK_FULL
  DATABASE_SLOW
  DATABASE_CONNECTIONS_HIGH
  REDIS_SLOW
  REDIS_MEMORY_HIGH
  EVENT_LOOP_BLOCKED
  RATE_LIMIT_EXCEEDED
  SERVICE_DOWN
  ABILLS_UNREACHABLE
  ABILLS_SYNC_FAILED
  ANOMALY_DETECTED
  CUSTOM
}

enum Severity {
  INFO
  WARNING
  CRITICAL
  EMERGENCY
}
```

### NPM Packages Required
```json
{
  "systeminformation": "^5.22.0", // System metrics (CPU, disk, network)
  "pidusage": "^3.0.2",           // Process CPU usage
  "event-loop-stats": "^1.4.1",   // Event loop monitoring
  "axios": "^1.6.0"               // Already installed (webhooks)
}
```

---

## Estimates

**Development Time:**
- Phase 1 (Enhanced Health): 4-6 hours
- Phase 2 (Alert System Backend): 6-8 hours
- Phase 3 (Frontend UI): 6-8 hours
- Testing & Refinement: 3-4 hours

**Total:** 19-26 hours

**MVP можна зробити за:** 12-15 hours (тільки Must Have features)

---

## Питання для вас:

1. **Почати з Phase 1 (Enhanced Health Metrics)?** Це фундамент для всього
2. **Які алерти найважливіші?** (Error rate, CPU, Memory, Database?)
3. **Чи потрібні Email notifications?** (окрім Telegram)
4. **Чи потрібні Webhooks?** (для інтеграції з Slack, Discord, etc.)
5. **Cooldown default?** (скільки хвилин між однаковими алертами? 15-30 хв?)

Скажіть з чого почати, і я імплементую покроково! 🚀
