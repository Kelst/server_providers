'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cabinetIntelektApi, type TelegramSettings as TelegramSettingsType } from '@/lib/api/cabinetIntelektApi';
import { Send, AlertCircle, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TelegramSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingAppeals, setTestingAppeals] = useState(false);
  const [settings, setSettings] = useState<TelegramSettingsType>({
    telegramBotToken: '',
    telegramChatId: '',
    telegramNotificationsEnabled: false,
    appealsTelegramChatId: '',
    appealsTelegramEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await cabinetIntelektApi.getTelegramSettings();
      setSettings({
        telegramBotToken: data.telegramBotToken || '',
        telegramChatId: data.telegramChatId || '',
        telegramNotificationsEnabled: data.telegramNotificationsEnabled,
        appealsTelegramChatId: data.appealsTelegramChatId || '',
        appealsTelegramEnabled: data.appealsTelegramEnabled,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося завантажити налаштування',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updated = await cabinetIntelektApi.updateTelegramSettings({
        telegramBotToken: settings.telegramBotToken || undefined,
        telegramChatId: settings.telegramChatId || undefined,
        telegramNotificationsEnabled: settings.telegramNotificationsEnabled,
        appealsTelegramChatId: settings.appealsTelegramChatId || undefined,
        appealsTelegramEnabled: settings.appealsTelegramEnabled,
      });
      setSettings({
        telegramBotToken: updated.telegramBotToken || '',
        telegramChatId: updated.telegramChatId || '',
        telegramNotificationsEnabled: updated.telegramNotificationsEnabled,
        appealsTelegramChatId: updated.appealsTelegramChatId || '',
        appealsTelegramEnabled: updated.appealsTelegramEnabled,
      });
      toast({
        title: 'Успішно',
        description: 'Налаштування Telegram збережено',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося зберегти налаштування',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Заповніть Bot Token та Chat ID для тестування',
      });
      return;
    }

    try {
      setTestingConnection(true);
      const result = await cabinetIntelektApi.testTelegramSettings({
        botToken: settings.telegramBotToken,
        chatId: settings.telegramChatId,
      });

      toast({
        title: result.success ? 'Успішно' : 'Помилка',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося відправити тестове повідомлення',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestAppeals = async () => {
    if (!settings.telegramBotToken || !settings.appealsTelegramChatId) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Заповніть Bot Token та Chat ID для звернень для тестування',
      });
      return;
    }

    try {
      setTestingAppeals(true);
      const result = await cabinetIntelektApi.testAppealsSettings({
        botToken: settings.telegramBotToken,
        chatId: settings.appealsTelegramChatId,
      });

      toast({
        title: result.success ? 'Успішно' : 'Помилка',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: error?.response?.data?.message || 'Не вдалося відправити тестове повідомлення',
      });
    } finally {
      setTestingAppeals(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Налаштування Telegram бота</CardTitle>
          <CardDescription>
            Налаштуйте Telegram бот для автоматичної відправки повідомлень
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Як налаштувати:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Створіть бота через @BotFather в Telegram</li>
                  <li>Отримайте Bot Token від @BotFather</li>
                  <li>Додайте бота в чат/канал, куди потрібно отримувати повідомлення</li>
                  <li>Отримайте Chat ID через @userinfobot або @getidsbot</li>
                  <li>Введіть дані нижче та збережіть</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input
              id="botToken"
              type="password"
              placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyz"
              value={settings.telegramBotToken || ''}
              onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Токен бота, отриманий від @BotFather. Використовується для всіх сповіщень.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Requests Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Заявки на підключення
          </CardTitle>
          <CardDescription>
            Налаштування чату для отримання нових заявок на підключення
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              type="text"
              placeholder="-1001234567890 або 1234567890"
              value={settings.telegramChatId || ''}
              onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              ID чату або каналу для заявок на підключення
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="notificationsEnabled"
              checked={settings.telegramNotificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, telegramNotificationsEnabled: checked })}
              disabled={loading}
            />
            <Label htmlFor="notificationsEnabled" className="cursor-pointer">
              Увімкнути сповіщення про заявки
            </Label>
          </div>

          <Button
            onClick={handleTestConnection}
            disabled={loading || testingConnection || !settings.telegramBotToken || !settings.telegramChatId}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {testingConnection ? (
              'Відправка...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Тестове повідомлення
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Appeals Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Звернення абонентів
          </CardTitle>
          <CardDescription>
            Налаштування окремого чату для отримання звернень від абонентів
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Звернення абонентів не зберігаються в базі даних - вони відправляються напряму в Telegram.
              Це дозволяє швидко реагувати на запити клієнтів.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="appealsChatId">Chat ID для звернень</Label>
            <Input
              id="appealsChatId"
              type="text"
              placeholder="-1001234567890 або 1234567890"
              value={settings.appealsTelegramChatId || ''}
              onChange={(e) => setSettings({ ...settings, appealsTelegramChatId: e.target.value })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              ID окремого чату або каналу для звернень абонентів
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="appealsEnabled"
              checked={settings.appealsTelegramEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, appealsTelegramEnabled: checked })}
              disabled={loading}
            />
            <Label htmlFor="appealsEnabled" className="cursor-pointer">
              Увімкнути прийом звернень
            </Label>
          </div>

          <Button
            onClick={handleTestAppeals}
            disabled={loading || testingAppeals || !settings.telegramBotToken || !settings.appealsTelegramChatId}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {testingAppeals ? (
              'Відправка...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Тестове повідомлення
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading || testingConnection || testingAppeals}
          size="lg"
        >
          {loading ? 'Збереження...' : 'Зберегти всі налаштування'}
        </Button>
      </div>
    </div>
  );
}
