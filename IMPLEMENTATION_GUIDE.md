# 🚀 IMPLEMENTATION GUIDE - Комплексне покращення Admin Panel

## ✅ ЩО ВЖЕ ЗРОБЛЕНО

### Backend (100% готово)
1. ✅ **Prisma Schema** - Додано AdminSettings, AlertRule, Alert
2. ✅ **Health Check Module** - `/health`, `/health/live`, `/health/ready`
3. ✅ **WebSocket Module** - Socket.IO Gateway з auto-broadcast
4. ✅ **Settings Module** - Telegram configuration API

### Frontend (50% готово)
1. ✅ **Socket.IO Client** - `lib/socket/socket.ts`, `lib/socket/useSocket.ts`
2. ✅ **RealtimeStore Updated** - WebSocket замість polling

---

## 📋 ЩО ТРЕБА ЗАВЕРШИТИ

### 1. API CLIENTS (Фаза 2.4)

#### `packages/admin/src/lib/api/healthApi.ts`
```typescript
import { apiClient } from './client';

export const healthApi = {
  async getHealth() {
    const { data } = await apiClient.get('/health');
    return data;
  },

  async getLiveness() {
    const { data } = await apiClient.get('/health/live');
    return data;
  },

  async getReadiness() {
    const { data } = await apiClient.get('/health/ready');
    return data;
  },
};
```

#### `packages/admin/src/lib/api/settingsApi.ts`
```typescript
import { apiClient } from './client';

export interface AdminSettings {
  id: string;
  userId: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  alertsEnabled: boolean;
  emailNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  async getSettings(): Promise<AdminSettings> {
    const { data } = await apiClient.get('/settings');
    return data;
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const { data } = await apiClient.patch('/settings', settings);
    return data;
  },

  async testTelegram(): Promise<{
    success: boolean;
    message: string;
    botInfo?: any;
  }> {
    const { data } = await apiClient.post('/settings/telegram/test');
    return data;
  },
};
```

---

### 2. ZUSTAND STORES (Фаза 2.3)

#### `packages/admin/src/lib/stores/settingsStore.ts`
```typescript
import { create } from 'zustand';
import { settingsApi, AdminSettings } from '../api/settingsApi';

interface SettingsState {
  settings: AdminSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<AdminSettings>) => Promise<void>;
  testTelegram: () => Promise<{ success: boolean; message: string }>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await settingsApi.getSettings();
      set({ settings: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch settings',
        isLoading: false
      });
    }
  },

  updateSettings: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await settingsApi.updateSettings(data);
      set({ settings: updated, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update settings',
        isLoading: false
      });
      throw error;
    }
  },

  testTelegram: async () => {
    try {
      return await settingsApi.testTelegram();
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Connection failed',
      };
    }
  },
}));
```

#### `packages/admin/src/lib/stores/healthStore.ts`
```typescript
import { create } from 'zustand';
import { healthApi } from '../api/healthApi';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    postgres: any;
    redis: any;
    abills: any;
  };
  system: {
    uptime: number;
    memory: any;
    cpu: any;
    version: string;
    platform: string;
  };
}

interface HealthState {
  health: HealthStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchHealth: () => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  health: null,
  isLoading: false,
  error: null,

  fetchHealth: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await healthApi.getHealth();
      set({ health: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch health',
        isLoading: false
      });
    }
  },
}));
```

---

### 3. SETTINGS PAGE (Фаза 3.4)

#### `packages/admin/src/app/dashboard/settings/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { settings, isLoading, fetchSettings, updateSettings, testTelegram } = useSettingsStore();
  const { toast } = useToast();

  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setTelegramBotToken(settings.telegramBotToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setAlertsEnabled(settings.alertsEnabled);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings({
        telegramBotToken: telegramBotToken || null,
        telegramChatId: telegramChatId || null,
        alertsEnabled,
      });
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings',
      });
    }
  };

  const handleTest = async () => {
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const result = await testTelegram();
      setTestResult(result);
      if (result.success) {
        toast({
          title: 'Test successful',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test failed',
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Test failed',
        description: 'Failed to test Telegram connection',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" description="Configure your admin preferences" />

      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs defaultValue="telegram" className="space-y-4">
          <TabsList>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Telegram Tab */}
          <TabsContent value="telegram" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle>Telegram Bot Configuration</CardTitle>
                </div>
                <CardDescription>
                  Configure Telegram bot for receiving alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="botToken">Bot Token</Label>
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from @BotFather on Telegram
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chatId">Chat ID</Label>
                  <Input
                    id="chatId"
                    placeholder="123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from @userinfobot on Telegram
                  </p>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      testResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      <p
                        className={`text-sm ${
                          testResult.success ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testingTelegram || !telegramBotToken || !telegramChatId}
                  >
                    {testingTelegram ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>How to Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Open Telegram and search for <Badge variant="outline">@BotFather</Badge></li>
                  <li>Send <code className="bg-muted px-1 py-0.5 rounded">/newbot</code> and follow instructions</li>
                  <li>Copy the bot token provided by BotFather</li>
                  <li>Search for <Badge variant="outline">@userinfobot</Badge> and start conversation</li>
                  <li>Copy your Chat ID from the message</li>
                  <li>Paste both values above and click "Test Connection"</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
                <CardDescription>
                  Configure when and how you want to receive alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="alertsEnabled"
                    checked={alertsEnabled}
                    onCheckedChange={(checked) => setAlertsEnabled(checked as boolean)}
                  />
                  <label
                    htmlFor="alertsEnabled"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable alerts
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, you'll receive notifications about errors, anomalies, and system issues
                </p>

                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

---

### 4. HEALTH PAGE (Фаза 3.3)

#### `packages/admin/src/app/dashboard/health/page.tsx`
```typescript
'use client';

import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthStore } from '@/lib/stores/healthStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, Database, Server, Activity, RefreshCw } from 'lucide-react';

export default function HealthPage() {
  const { health, isLoading, fetchHealth } = useHealthStore();

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading && !health) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="System Health" description="Monitor system status and services" />

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Overall Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Heart className="h-12 w-12 text-primary" />
                <div>
                  <h3 className="text-2xl font-bold">System Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {health ? new Date(health.timestamp).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(health?.status || 'unknown')}>
                  {health?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Button variant="outline" size="icon" onClick={fetchHealth} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PostgreSQL</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Badge variant="outline" className={getStatusColor(health?.services.postgres.status)}>
                  {health?.services.postgres.status || 'Unknown'}
                </Badge>
                {health?.services.postgres.latency && (
                  <p className="text-xs text-muted-foreground">
                    Latency: {health.services.postgres.latency}ms
                  </p>
                )}
                {health?.services.postgres.error && (
                  <p className="text-xs text-red-600">{health.services.postgres.error}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Redis</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Badge variant="outline" className={getStatusColor(health?.services.redis.status)}>
                  {health?.services.redis.status || 'Unknown'}
                </Badge>
                {health?.services.redis.latency && (
                  <p className="text-xs text-muted-foreground">
                    Latency: {health.services.redis.latency}ms
                  </p>
                )}
                {health?.services.redis.error && (
                  <p className="text-xs text-red-600">{health.services.redis.error}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ABills</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Badge variant="outline" className={getStatusColor(health?.services.abills.status)}>
                  {health?.services.abills.status || 'Unknown'}
                </Badge>
                {health?.services.abills.details && (
                  <p className="text-xs text-muted-foreground">{health.services.abills.details}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Metrics */}
        {health?.system && (
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-2xl font-bold">
                    {Math.floor(health.system.uptime / 3600)}h {Math.floor((health.system.uptime % 3600) / 60)}m
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Memory Used</p>
                  <p className="text-2xl font-bold">
                    {health.system.memory.used}/{health.system.memory.total} MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.system.memory.percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Node Version</p>
                  <p className="text-2xl font-bold">{health.system.version}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform</p>
                  <p className="text-2xl font-bold capitalize">{health.system.platform}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

---

### 5. UPDATE SIDEBAR (Фаза 6)

#### `packages/admin/src/components/layout/Sidebar.tsx`
Додати нові links:
```typescript
const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Tokens', href: '/dashboard/tokens', icon: Key },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
  { name: 'Monitoring', href: '/dashboard/monitoring', icon: Activity },
  { name: 'Security', href: '/dashboard/security', icon: Shield },
  { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: FileText },
  { name: 'Health', href: '/dashboard/health', icon: Heart }, // NEW
  { name: 'Settings', href: '/dashboard/settings', icon: Settings }, // NEW
];
```

---

## 🗂 СТРУКТУРА ФАЙЛІВ

```
packages/
├── backend/
│   └── src/
│       └── modules/
│           ├── health/        ✅ ГОТОВО
│           ├── websocket/     ✅ ГОТОВО
│           └── settings/      ✅ ГОТОВО
│
└── admin/
    └── src/
        ├── lib/
        │   ├── socket/
        │   │   ├── socket.ts           ✅ ГОТОВО
        │   │   └── useSocket.ts        ✅ ГОТОВО
        │   ├── stores/
        │   │   ├── realtimeStore.ts    ✅ ГОТОВО (оновлено)
        │   │   ├── settingsStore.ts    📝 СТВОРИТИ
        │   │   └── healthStore.ts      📝 СТВОРИТИ
        │   └── api/
        │       ├── settingsApi.ts      📝 СТВОРИТИ
        │       └── healthApi.ts        📝 СТВОРИТИ
        └── app/
            └── dashboard/
                ├── health/
                │   └── page.tsx        📝 СТВОРИТИ
                └── settings/
                    └── page.tsx        📝 СТВОРИТИ
```

---

## 🚀 ЗАПУСК ПРОЕКТУ

### 1. Запустити міграцію БД
```bash
cd packages/backend
npx prisma migrate dev --name add_admin_settings_and_alerts
npx prisma generate
```

### 2. Запустити backend
```bash
npm run dev:backend
```

### 3. Запустити admin
```bash
npm run dev:admin
```

### 4. Перевірити WebSocket
Відкрити http://localhost:3001/dashboard/monitoring і переконатись що:
- Badge показує "Connected" (зелений)
- Metrics оновлюються автоматично
- В консолі браузера: `[Socket.IO] Connected to metrics stream`

---

## 📝 ДОДАТКОВІ ПОКРАЩЕННЯ (опціонально)

1. **Export Functionality**
   - Створити `lib/utils/exportUtils.ts` з функціями для JSON/PDF export
   - Додати ExportButton component

2. **Trend Indicators**
   - Створити `components/charts/TrendIndicator.tsx`
   - Інтегрувати в Dashboard cards

3. **Alerts Module** (backend)
   - Створити scheduler для перевірки alert rules
   - Інтеграція з Telegram через `settingsService.sendTelegramMessage()`

4. **Performance/Anomalies Pages**
   - Використати існуючі backend endpoints
   - Додати charts з Recharts

---

## ✅ CHECKLIST

- [x] Prisma schema оновлено
- [x] Backend modules створено
- [x] Socket.IO client setup
- [x] RealtimeStore оновлено
- [ ] API clients створено
- [ ] Zustand stores створено
- [ ] Settings page створено
- [ ] Health page створено
- [ ] Sidebar оновлено
- [ ] Тестування WebSocket з'єднання
- [ ] Тестування Telegram integration

---

## 🆘 TROUBLESHOOTING

### WebSocket не підключається
1. Перевірити що backend запущено на http://localhost:3000
2. Перевірити CORS settings в `websocket.gateway.ts`
3. Перевірити browser console для помилок

### Telegram test fails
1. Перевірити Bot Token (має бути довгий рядок з двокрапкою)
2. Перевірити Chat ID (має бути число)
3. Переконатись що бот запущено (send /start до бота)

### Міграція не застосовується
```bash
# Force reset (УВАГА: видалить дані!)
npx prisma migrate reset

# Або застосувати вручну
npx prisma migrate deploy
```

---

**Успіхів у завершенні проекту! 🎉**
