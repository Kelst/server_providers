import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotificationProvider } from './enums/provider.enum';

/**
 * Telegram Service
 * Handles sending messages via Telegram Bot API for different providers
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get Telegram API URL for specific provider
   */
  private getTelegramApiUrl(provider: NotificationProvider): string {
    const urls = {
      [NotificationProvider.OPTICOM]: this.configService.get<string>('notifications.telegram.opticom'),
      [NotificationProvider.VELES]: this.configService.get<string>('notifications.telegram.veles'),
      [NotificationProvider.OPENSVIT]: this.configService.get<string>('notifications.telegram.opensvit'),
      [NotificationProvider.INTELEKT]: this.configService.get<string>('notifications.telegram.intelekt'),
    };

    const url = urls[provider];
    if (!url) {
      throw new Error(`Telegram API URL not configured for provider: ${provider}`);
    }

    return url;
  }

  /**
   * Send message via Telegram
   * @returns { success: boolean, responseData?: any, error?: string }
   */
  async sendMessage(
    provider: NotificationProvider,
    chatId: string,
    message: string,
  ): Promise<{ success: boolean; responseData?: any; error?: string }> {
    try {
      const apiUrl = this.getTelegramApiUrl(provider);

      this.logger.log(`Sending Telegram message to chatId: ${chatId} via ${provider}`);

      const response = await axios.post(
        `${apiUrl}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
        },
        {
          timeout: 10000, // 10 second timeout
        },
      );

      if (response.status === 200 && response.data.ok) {
        this.logger.log(
          `Telegram message sent successfully to ${chatId} via ${provider}: ${response.data.result?.text || 'N/A'}`,
        );
        return {
          success: true,
          responseData: response.data,
        };
      } else {
        this.logger.error(`Telegram API returned non-OK response: ${JSON.stringify(response.data)}`);
        return {
          success: false,
          error: `Telegram API error: ${JSON.stringify(response.data)}`,
          responseData: response.data,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending Telegram message to ${chatId} via ${provider}:`, error.message);

      // Return detailed error info
      return {
        success: false,
        error: error.response?.data?.description || error.message || 'Unknown Telegram error',
        responseData: error.response?.data || null,
      };
    }
  }
}
