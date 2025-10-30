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

  // Timeout settings
  const [apiRequestTimeout, setApiRequestTimeout] = useState(30);
  const [databaseQueryTimeout, setDatabaseQueryTimeout] = useState(10);
  const [testingTimeout, setTestingTimeout] = useState(false);
  const [timeoutTestResult, setTimeoutTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setTelegramBotToken(settings.telegramBotToken || '');
      setTelegramChatId(settings.telegramChatId || '');
      setAlertsEnabled(settings.alertsEnabled);
      setApiRequestTimeout(settings.apiRequestTimeout / 1000); // Convert ms to seconds
      setDatabaseQueryTimeout(settings.databaseQueryTimeout / 1000); // Convert ms to seconds
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

  const handleSavePerformance = async () => {
    try {
      await updateSettings({
        apiRequestTimeout: apiRequestTimeout * 1000, // Convert seconds to ms
        databaseQueryTimeout: databaseQueryTimeout * 1000, // Convert seconds to ms
      });
      toast({
        title: 'Performance settings saved',
        description: 'Timeout values have been updated successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save performance settings',
      });
    }
  };

  const handleTestTimeout = async () => {
    const { settingsApi } = await import('@/lib/api/settingsApi');
    setTestingTimeout(true);
    setTimeoutTestResult(null);
    const testDelay = Math.min(apiRequestTimeout + 5, 60); // Test with delay slightly longer than timeout
    try {
      const result = await settingsApi.testTimeout(testDelay);
      setTimeoutTestResult(result);
      toast({
        title: 'Test completed',
        description: result.message,
      });
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setTimeoutTestResult({
          success: false,
          message: `Request timed out after ${apiRequestTimeout}s (expected, tested with ${testDelay}s delay)`,
        });
        toast({
          title: 'Timeout test successful',
          description: `Request correctly timed out after ${apiRequestTimeout}s`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Test failed',
          description: 'Failed to test timeout',
        });
      }
    } finally {
      setTestingTimeout(false);
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
            <TabsTrigger value="performance">Performance</TabsTrigger>
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
                  <li>
                    Open Telegram and search for <Badge variant="outline">@BotFather</Badge>
                  </li>
                  <li>
                    Send <code className="bg-muted px-1 py-0.5 rounded">/newbot</code> and follow
                    instructions
                  </li>
                  <li>Copy the bot token provided by BotFather</li>
                  <li>
                    Search for <Badge variant="outline">@userinfobot</Badge> and start conversation
                  </li>
                  <li>Copy your Chat ID from the message</li>
                  <li>Paste both values above and click &quot;Test Connection&quot;</li>
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
                  When enabled, you&apos;ll receive notifications about errors, anomalies, and
                  system issues
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

          {/* Performance Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance & Timeout Settings</CardTitle>
                <CardDescription>
                  Configure request and database query timeouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiTimeout">API Request Timeout (seconds)</Label>
                  <Input
                    id="apiTimeout"
                    type="number"
                    min="1"
                    max="300"
                    value={apiRequestTimeout}
                    onChange={(e) => setApiRequestTimeout(parseInt(e.target.value) || 30)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time to wait for API responses (1-300 seconds). Default: 30s
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dbTimeout">Database Query Timeout (seconds)</Label>
                  <Input
                    id="dbTimeout"
                    type="number"
                    min="1"
                    max="300"
                    value={databaseQueryTimeout}
                    onChange={(e) => setDatabaseQueryTimeout(parseInt(e.target.value) || 10)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum time to wait for database queries (1-300 seconds). Default: 10s
                  </p>
                </div>

                {timeoutTestResult && (
                  <div
                    className={`p-3 rounded-lg border ${
                      timeoutTestResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        timeoutTestResult.success ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {timeoutTestResult.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSavePerformance} disabled={isLoading}>
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
                    onClick={handleTestTimeout}
                    disabled={testingTimeout}
                  >
                    {testingTimeout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Timeout'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
