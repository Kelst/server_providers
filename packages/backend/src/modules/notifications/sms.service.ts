import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotificationProvider } from './enums/provider.enum';

/**
 * SMS Service (TurboSMS)
 * Handles sending SMS messages via TurboSMS API for different providers
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly turboSmsUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.turboSmsUrl = this.configService.get<string>('notifications.sms.url');
  }

  /**
   * Get TurboSMS token for specific provider
   */
  private getTurboSmsToken(provider: NotificationProvider): string {
    const tokens = {
      [NotificationProvider.OPTICOM]: this.configService.get<string>('notifications.sms.tokens.opticom'),
      [NotificationProvider.VELES]: this.configService.get<string>('notifications.sms.tokens.veles'),
      [NotificationProvider.OPENSVIT]: this.configService.get<string>('notifications.sms.tokens.opensvit'),
      [NotificationProvider.INTELEKT]: this.configService.get<string>('notifications.sms.tokens.intelekt'),
    };

    const token = tokens[provider];
    if (!token) {
      throw new Error(`TurboSMS token not configured for provider: ${provider}`);
    }

    return token;
  }

  /**
   * Get SMS sender name for specific provider
   */
  private getSmsSender(provider: NotificationProvider): string {
    const senders = {
      [NotificationProvider.OPTICOM]: this.configService.get<string>('notifications.sms.senders.opticom'),
      [NotificationProvider.VELES]: this.configService.get<string>('notifications.sms.senders.veles'),
      [NotificationProvider.OPENSVIT]: this.configService.get<string>('notifications.sms.senders.opensvit'),
      [NotificationProvider.INTELEKT]: this.configService.get<string>('notifications.sms.senders.intelekt'),
    };

    const sender = senders[provider];
    if (!sender) {
      throw new Error(`SMS sender not configured for provider: ${provider}`);
    }

    return sender;
  }

  /**
   * Send SMS via TurboSMS
   * @returns { success: boolean, responseData?: any, error?: string }
   */
  async sendSms(
    provider: NotificationProvider,
    phoneNumber: string,
    message: string,
  ): Promise<{ success: boolean; responseData?: any; error?: string }> {
    try {
      const token = this.getTurboSmsToken(provider);
      const sender = this.getSmsSender(provider);

      this.logger.log(`Sending SMS to ${phoneNumber} via TurboSMS (${provider}, sender: ${sender})`);

      const response = await axios.get(this.turboSmsUrl, {
        params: {
          'recipients[0]': phoneNumber,
          'sms[sender]': sender,
          'sms[text]': message,
          token: token,
        },
        timeout: 10000, // 10 second timeout
      });

      this.logger.log(`TurboSMS response: ${JSON.stringify(response.data)}`);

      // Check if SMS was sent successfully
      if (
        response.data &&
        response.data.response_result &&
        response.data.response_result[0]?.response_status === 'OK'
      ) {
        this.logger.log(`SMS sent successfully to ${phoneNumber} via ${provider}`);
        return {
          success: true,
          responseData: response.data,
        };
      } else {
        this.logger.error(`TurboSMS API returned non-OK status: ${JSON.stringify(response.data)}`);
        return {
          success: false,
          error: `TurboSMS error: ${response.data.response_result?.[0]?.response_status || 'Unknown'}`,
          responseData: response.data,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending SMS to ${phoneNumber} via ${provider}:`, error.message);

      return {
        success: false,
        error: error.response?.data?.description || error.message || 'Unknown TurboSMS error',
        responseData: error.response?.data || null,
      };
    }
  }
}
