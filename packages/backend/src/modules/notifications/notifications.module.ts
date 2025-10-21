import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';

/**
 * Notifications Module
 * Provides notification sending functionality (Telegram + SMS fallback)
 * with automatic logging to PostgreSQL
 */
@Module({
  providers: [NotificationsService, TelegramService, SmsService],
  exports: [NotificationsService], // Export for use in other modules
})
export class NotificationsModule {}
