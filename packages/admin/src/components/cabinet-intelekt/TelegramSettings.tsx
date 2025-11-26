'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cabinetIntelektApi, type TelegramSettings as TelegramSettingsType } from '@/lib/api/cabinetIntelektApi';
import { Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TelegramSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<TelegramSettingsType>({
    telegramBotToken: '',
    telegramChatId: '',
    telegramNotificationsEnabled: false,
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
      });
      setSettings({
        telegramBotToken: updated.telegramBotToken || '',
        telegramChatId: updated.telegramChatId || '',
        telegramNotificationsEnabled: updated.telegramNotificationsEnabled,
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

  const handleTest = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Заповніть Bot Token та Chat ID для тестування',
      });
      return;
    }

    try {
      setTesting(true);
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
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Налаштування Telegram</CardTitle>
        <CardDescription>
          Налаштуйте Telegram бот для автоматичної відправки повідомлень про нові заявки на підключення
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

        <div className="space-y-4">
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
              Токен бота, отриманий від @BotFather
            </p>
          </div>

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
              ID чату або каналу, куди будуть надходити повідомлення
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
              Увімкнути сповіщення Telegram
            </Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading || testing}
            className="flex-1"
          >
            {loading ? 'Збереження...' : 'Зберегти'}
          </Button>
          <Button
            onClick={handleTest}
            disabled={loading || testing || !settings.telegramBotToken || !settings.telegramChatId}
            variant="outline"
            className="gap-2"
          >
            {testing ? (
              'Відправка...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Тест
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
