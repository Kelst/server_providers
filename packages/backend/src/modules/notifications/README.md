# Notifications Module

Модуль для відправки повідомлень через Telegram з автоматичним fallback на SMS (TurboSMS).
Всі спроби відправки логуються в PostgreSQL.

## Можливості

- Відправка через Telegram Bot API
- Автоматичний fallback на SMS при помилці Telegram
- Підтримка 4 провайдерів: Opticom, Veles, Opensvit, Intelekt
- Повне логування всіх спроб відправки в PostgreSQL
- Статистика відправок по провайдерам

## Архітектура

```
notifications/
├── dto/
│   └── send-notification.dto.ts      # DTO для запитів/відповідей
├── enums/
│   ├── provider.enum.ts              # Провайдери (Opticom, Veles, ...)
│   ├── notification-type.enum.ts     # Тип (TELEGRAM, SMS)
│   └── notification-status.enum.ts   # Статус (PENDING, SENT, FAILED, FALLBACK)
├── notifications.service.ts          # Головний сервіс з fallback логікою
├── telegram.service.ts               # Telegram Bot API
├── sms.service.ts                    # TurboSMS API
└── notifications.module.ts           # NestJS модуль
```

## Налаштування

### 1. Environment Variables

Додайте в `.env`:

```env
# Telegram Bot API URLs
TELEGRAM_API_OPTICOM=https://api.telegram.org/bot<YOUR_BOT_TOKEN>
TELEGRAM_API_VELES=https://api.telegram.org/bot<YOUR_BOT_TOKEN>
TELEGRAM_API_OPENSVIT=https://api.telegram.org/bot<YOUR_BOT_TOKEN>
TELEGRAM_API_INTELEKT=https://api.telegram.org/bot<YOUR_BOT_TOKEN>

# TurboSMS Configuration
TURBOSMS_URL=https://api.turbosms.ua/message/send.json
TURBOSMS_TOKEN_OPTICOM=your_token_here
TURBOSMS_TOKEN_VELES=your_token_here
TURBOSMS_TOKEN_OPENSVIT=your_token_here
TURBOSMS_TOKEN_INTELEKT=your_token_here

# SMS Sender Names
SMS_SENDER_OPTICOM=OpticomPlus
SMS_SENDER_VELES=VelesISP
SMS_SENDER_OPENSVIT=Opensvit
SMS_SENDER_INTELEKT=INTELEKT
```

### 2. Імпорт модуля

У вашому модулі (наприклад, `billing.module.ts`):

```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  // ...
})
export class BillingModule {}
```

## Використання

### Основний приклад

```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationProvider } from '../notifications/enums/provider.enum';

@Injectable()
export class YourService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async sendVerificationCode(uid: number, code: string) {
    const result = await this.notificationsService.sendNotification({
      provider: NotificationProvider.OPTICOM,
      chatId: '123456789',           // Telegram chat ID
      phoneNumber: '+380501234567',  // Fallback phone number
      message: `Ваш код підтвердження: ${code}`,
      uid: uid,
      metadata: {
        action: 'verification_code',
        timestamp: new Date().toISOString(),
      },
    });

    if (result.success) {
      console.log(`Sent via ${result.sentVia}`);
    }

    return result;
  }
}
```

### Відправка лише через Telegram (без SMS fallback)

```typescript
await this.notificationsService.sendNotification({
  provider: NotificationProvider.VELES,
  chatId: '987654321',
  message: 'Ваш платіж успішно оброблено',
  uid: 12345,
});
```

### Відправка лише через SMS

```typescript
await this.notificationsService.sendNotification({
  provider: NotificationProvider.INTELEKT,
  phoneNumber: '+380671234567',
  message: 'Ваш кредит активовано на 5 днів',
  uid: 67890,
});
```

### Отримання історії повідомлень користувача

```typescript
const logs = await this.notificationsService.getNotificationLogs(uid, 50);
// Повертає останні 50 записів для користувача
```

### Отримання статистики

```typescript
// Загальна статистика
const stats = await this.notificationsService.getNotificationStats();
// { total: 1000, sent: 850, failed: 50, fallback: 100, successRate: 95 }

// Статистика по провайдеру
const opticomStats = await this.notificationsService.getNotificationStats(
  NotificationProvider.OPTICOM
);
```

## Логіка Fallback

1. **Спроба Telegram** (якщо надано `chatId`):
   - Успіх → статус `SENT`, sentVia: `telegram`
   - Помилка → переходить до кроку 2

2. **Спроба SMS** (якщо надано `phoneNumber`):
   - Успіх → статус `FALLBACK`, sentVia: `sms`
   - Помилка → статус `FAILED`

3. **Логування**:
   - Всі спроби логуються в таблицю `notification_logs`
   - Зберігається responseData від API
   - Зберігається errorMessage при помилках

## DTO

### SendNotificationDto

```typescript
{
  provider: NotificationProvider;    // Required: Opticom | Veles | Opensvit | Intelekt
  chatId?: string;                   // Optional: Telegram chat ID
  phoneNumber?: string;              // Optional: Phone number для SMS
  message: string;                   // Required: Текст повідомлення
  uid?: number;                      // Optional: User ID для зв'язку
  metadata?: Record<string, any>;    // Optional: Додаткові дані
}
```

### SendNotificationResponseDto

```typescript
{
  success: boolean;                  // Чи вдалося відправити
  message: string;                   // Опис результату
  sentVia?: string;                  // 'telegram' або 'sms'
  logId?: string;                    // UUID запису в БД
}
```

## База даних

Таблиця `notification_logs`:

| Поле | Тип | Опис |
|------|-----|------|
| id | uuid | Primary key |
| provider | string | Opticom/Veles/Opensvit/Intelekt |
| type | enum | TELEGRAM/SMS |
| recipient | string | chatId або phone |
| message | text | Текст повідомлення |
| status | enum | PENDING/SENT/FAILED/FALLBACK |
| sentVia | string | telegram/sms |
| responseData | json | Відповідь від API |
| errorMessage | text | Повідомлення про помилку |
| uid | int | User ID |
| metadata | json | Додаткові дані |
| createdAt | timestamp | Час створення |
| updatedAt | timestamp | Час оновлення |

## Приклади використання в різних сценаріях

### 1. Верифікація телефону

```typescript
async sendPhoneVerification(uid: number, phone: string, code: string) {
  return await this.notificationsService.sendNotification({
    provider: NotificationProvider.OPTICOM,
    phoneNumber: phone,
    message: `Код підтвердження: ${code}\nДійсний 5 хвилин.`,
    uid,
    metadata: {
      action: 'phone_verification',
      code: code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    },
  });
}
```

### 2. Нотифікація про платіж

```typescript
async notifyPaymentSuccess(uid: number, chatId: string, amount: number) {
  return await this.notificationsService.sendNotification({
    provider: NotificationProvider.VELES,
    chatId: chatId,
    message: `✅ Платіж ${amount} грн успішно зарахований на ваш рахунок`,
    uid,
    metadata: {
      action: 'payment_success',
      amount: amount,
    },
  });
}
```

### 3. Попередження про закінчення кредиту

```typescript
async notifyCreditExpiring(uid: number, chatId: string, phone: string, daysLeft: number) {
  return await this.notificationsService.sendNotification({
    provider: NotificationProvider.INTELEKT,
    chatId: chatId,
    phoneNumber: phone, // Fallback на SMS якщо Telegram не працює
    message: `⚠️ Ваш кредит закінчується через ${daysLeft} днів. Будь ласка, поповніть рахунок.`,
    uid,
    metadata: {
      action: 'credit_expiring_warning',
      daysLeft: daysLeft,
    },
  });
}
```

## Обробка помилок

```typescript
try {
  const result = await this.notificationsService.sendNotification({
    provider: NotificationProvider.OPENSVIT,
    chatId: 'invalid_chat_id',
    phoneNumber: '+380501234567',
    message: 'Test message',
  });

  if (result.success) {
    // Успішно відправлено
    console.log(`Sent via: ${result.sentVia}`);
  } else {
    // Не вдалося відправити навіть через fallback
    console.error(`Failed to send: ${result.message}`);
  }
} catch (error) {
  // Несподівана помилка (проблеми з БД, конфігурацією тощо)
  console.error('Unexpected error:', error);
}
```

## Troubleshooting

### Telegram не працює

1. Перевірте валідність bot token в `.env`
2. Перевірте що chatId існує та бот може відправляти повідомлення
3. Перегляньте логи в `notification_logs` для деталей помилки

### SMS не працює

1. Перевірте TurboSMS tokens в `.env`
2. Переконайтеся що номер телефону в міжнародному форматі (+380...)
3. Перевірте баланс в TurboSMS акаунті

### Повідомлення не логуються

1. Перевірте підключення до PostgreSQL
2. Запустіть Prisma міграції: `npm run prisma:migrate`
3. Перевірте що DatabaseModule імпортовано глобально
