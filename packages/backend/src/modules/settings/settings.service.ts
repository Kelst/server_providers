import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import axios from 'axios';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get admin settings for a user with caching
   * Cache TTL: 5 minutes
   */
  async getSettings(userId: string) {
    const cacheKey = `settings:admin:${userId}`;

    // Try cache first (remember pattern)
    return this.cacheService.remember(
      cacheKey,
      300, // 5 minutes
      async () => {
        let settings = await this.prisma.adminSettings.findUnique({
          where: { userId },
        });

        // Create default settings if they don't exist
        if (!settings) {
          settings = await this.prisma.adminSettings.create({
            data: {
              userId,
              alertsEnabled: false,
              emailNotifications: false,
            },
          });
          this.logger.debug(`Created default settings for user ${userId}`);
        }

        return settings;
      },
    );
  }

  /**
   * Update admin settings and invalidate cache
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    // Check if settings exist
    const existingSettings = await this.prisma.adminSettings.findUnique({
      where: { userId },
    });

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      updatedSettings = await this.prisma.adminSettings.update({
        where: { userId },
        data: dto,
      });
    } else {
      // Create new settings
      updatedSettings = await this.prisma.adminSettings.create({
        data: {
          userId,
          ...dto,
        },
      });
    }

    // Invalidate cache for this user's settings
    await this.cacheService.del(`settings:admin:${userId}`);
    this.logger.debug(`Settings cache invalidated for user ${userId}`);

    return updatedSettings;
  }

  /**
   * Test Telegram bot connection
   */
  async testTelegramConnection(userId: string): Promise<{
    success: boolean;
    message: string;
    botInfo?: any;
  }> {
    const settings = await this.prisma.adminSettings.findUnique({
      where: { userId },
    });

    if (!settings?.telegramBotToken || !settings?.telegramChatId) {
      return {
        success: false,
        message: 'Telegram bot token or chat ID not configured',
      };
    }

    try {
      // 1. Test bot token by getting bot info
      const botInfoUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/getMe`;
      const botInfoResponse = await axios.get(botInfoUrl, { timeout: 5000 });

      if (!botInfoResponse.data.ok) {
        return {
          success: false,
          message: 'Invalid bot token',
        };
      }

      const botInfo = botInfoResponse.data.result;

      // 2. Try to send a test message
      const sendMessageUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
      const testMessage = `✅ *Connection Test*\n\nYour Telegram bot is properly configured!\n\n_Test performed at ${new Date().toISOString()}_`;

      const sendResponse = await axios.post(
        sendMessageUrl,
        {
          chat_id: settings.telegramChatId,
          text: testMessage,
          parse_mode: 'Markdown',
        },
        { timeout: 5000 },
      );

      if (!sendResponse.data.ok) {
        return {
          success: false,
          message: `Failed to send test message: ${sendResponse.data.description || 'Unknown error'}`,
        };
      }

      this.logger.log(`Telegram test successful for user ${userId}`);

      return {
        success: true,
        message: 'Test message sent successfully! Check your Telegram.',
        botInfo: {
          username: botInfo.username,
          firstName: botInfo.first_name,
          id: botInfo.id,
        },
      };
    } catch (error) {
      this.logger.error(`Telegram test failed for user ${userId}:`, error.message);

      if (error.response) {
        return {
          success: false,
          message: `Telegram API error: ${error.response.data?.description || error.message}`,
        };
      }

      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  /**
   * Send a Telegram message (used by alerts system)
   */
  async sendTelegramMessage(
    userId: string,
    message: string,
    options?: { parseMode?: 'Markdown' | 'HTML' },
  ): Promise<boolean> {
    const settings = await this.prisma.adminSettings.findUnique({
      where: { userId },
    });

    if (!settings?.telegramBotToken || !settings?.telegramChatId) {
      this.logger.warn(`Cannot send Telegram message: not configured for user ${userId}`);
      return false;
    }

    if (!settings.alertsEnabled) {
      this.logger.debug(`Alerts disabled for user ${userId}, skipping message`);
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;

      await axios.post(
        url,
        {
          chat_id: settings.telegramChatId,
          text: message,
          parse_mode: options?.parseMode || 'Markdown',
        },
        { timeout: 5000 },
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message for user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Test timeout by delaying response
   */
  async testTimeout(delaySeconds: number): Promise<{
    success: boolean;
    message: string;
    delaySeconds: number;
    timestamp: string;
  }> {
    this.logger.log(`Testing timeout with ${delaySeconds}s delay...`);

    // Wait for the specified delay
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

    return {
      success: true,
      message: `Request completed successfully after ${delaySeconds}s delay`,
      delaySeconds,
      timestamp: new Date().toISOString(),
    };
  }
}
