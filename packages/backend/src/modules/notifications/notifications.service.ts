import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from './telegram.service';
import { SmsService } from './sms.service';
import { SendNotificationDto, SendNotificationResponseDto } from './dto/send-notification.dto';
import { NotificationProvider } from './enums/provider.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationStatus } from './enums/notification-status.enum';

/**
 * Notifications Service
 * Main service that orchestrates sending notifications via Telegram with SMS fallback
 * Logs all attempts to PostgreSQL database
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Send notification with automatic fallback from Telegram to SMS
   * Logs all attempts to database
   */
  async sendNotification(dto: SendNotificationDto): Promise<SendNotificationResponseDto> {
    const { provider, chatId, phoneNumber, message, uid, metadata } = dto;

    // Validate that at least one delivery method is provided
    if (!chatId && !phoneNumber) {
      throw new Error('Either chatId or phoneNumber must be provided');
    }

    let notificationLog = await this.createNotificationLog({
      provider: provider,
      type: chatId ? NotificationType.TELEGRAM : NotificationType.SMS,
      recipient: chatId || phoneNumber,
      message,
      status: NotificationStatus.PENDING,
      uid,
      metadata,
    });

    try {
      // STEP 1: Try Telegram first (if chatId is provided)
      if (chatId) {
        this.logger.log(`Attempting Telegram delivery for chatId: ${chatId}, provider: ${provider}`);

        const telegramResult = await this.telegramService.sendMessage(provider, chatId, message);

        if (telegramResult.success) {
          // Telegram success - update log and return
          notificationLog = await this.updateNotificationLog(notificationLog.id, {
            status: NotificationStatus.SENT,
            sentVia: 'telegram',
            responseData: telegramResult.responseData,
          });

          return {
            success: true,
            message: 'Повідомлення відправлено через Telegram',
            sentVia: 'telegram',
            logId: notificationLog.id,
          };
        }

        // Telegram failed - log error and try SMS fallback
        this.logger.warn(`Telegram delivery failed for chatId: ${chatId}. Error: ${telegramResult.error}`);

        await this.updateNotificationLog(notificationLog.id, {
          status: NotificationStatus.FAILED,
          errorMessage: telegramResult.error,
          responseData: telegramResult.responseData,
        });
      }

      // STEP 2: Fallback to SMS (if phoneNumber is provided)
      if (phoneNumber) {
        this.logger.log(`Attempting SMS fallback to ${phoneNumber}, provider: ${provider}`);

        const smsResult = await this.smsService.sendSms(provider, phoneNumber, message);

        if (smsResult.success) {
          // SMS success via fallback - update log and return
          notificationLog = await this.updateNotificationLog(notificationLog.id, {
            status: NotificationStatus.FALLBACK,
            sentVia: 'sms',
            responseData: smsResult.responseData,
            recipient: phoneNumber, // Update recipient to phone if it was chatId before
          });

          return {
            success: true,
            message: chatId
              ? 'Telegram не вдалося, повідомлення відправлено через SMS'
              : 'Повідомлення відправлено через SMS',
            sentVia: 'sms',
            logId: notificationLog.id,
          };
        }

        // SMS also failed - log error
        this.logger.error(`SMS delivery also failed for ${phoneNumber}. Error: ${smsResult.error}`);

        await this.updateNotificationLog(notificationLog.id, {
          status: NotificationStatus.FAILED,
          errorMessage: `Telegram: ${chatId ? 'failed' : 'not provided'}. SMS: ${smsResult.error}`,
          responseData: smsResult.responseData,
        });

        return {
          success: false,
          message: 'Не вдалося відправити повідомлення ні через Telegram, ні через SMS',
          logId: notificationLog.id,
        };
      }

      // No SMS fallback available
      return {
        success: false,
        message: 'Telegram не вдалося, SMS fallback не налаштовано (відсутній номер телефону)',
        logId: notificationLog.id,
      };
    } catch (error) {
      this.logger.error(`Unexpected error in sendNotification:`, error);

      // Update log with unexpected error
      await this.updateNotificationLog(notificationLog.id, {
        status: NotificationStatus.FAILED,
        errorMessage: `Unexpected error: ${error.message}`,
      });

      throw error;
    }
  }

  /**
   * Create initial notification log entry
   */
  private async createNotificationLog(data: {
    provider: string;
    type: NotificationType;
    recipient: string;
    message: string;
    status: NotificationStatus;
    uid?: number;
    metadata?: Record<string, any>;
  }) {
    return await this.prismaService.notificationLog.create({
      data: {
        provider: data.provider,
        type: data.type,
        recipient: data.recipient,
        message: data.message,
        status: data.status,
        uid: data.uid,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Update notification log entry
   */
  private async updateNotificationLog(
    id: string,
    data: {
      status?: NotificationStatus;
      sentVia?: string;
      responseData?: any;
      errorMessage?: string;
      recipient?: string;
    },
  ) {
    return await this.prismaService.notificationLog.update({
      where: { id },
      data: {
        status: data.status,
        sentVia: data.sentVia,
        responseData: data.responseData,
        errorMessage: data.errorMessage,
        recipient: data.recipient,
      },
    });
  }

  /**
   * Get notification logs for a specific user
   */
  async getNotificationLogs(uid: number, limit = 50) {
    return await this.prismaService.notificationLog.findMany({
      where: { uid },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(provider?: NotificationProvider) {
    const where = provider ? { provider } : {};

    const [total, sent, failed, fallback] = await Promise.all([
      this.prismaService.notificationLog.count({ where }),
      this.prismaService.notificationLog.count({
        where: { ...where, status: NotificationStatus.SENT },
      }),
      this.prismaService.notificationLog.count({
        where: { ...where, status: NotificationStatus.FAILED },
      }),
      this.prismaService.notificationLog.count({
        where: { ...where, status: NotificationStatus.FALLBACK },
      }),
    ]);

    return {
      total,
      sent,
      failed,
      fallback,
      successRate: total > 0 ? ((sent + fallback) / total) * 100 : 0,
    };
  }
}
