import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { BillingApiRequest } from '../dto/session-reload.dto';

/**
 * Queue processor for session reload jobs
 * Handles delayed session hangup requests to Abills billing API
 */
@Processor('session-reload')
export class SessionReloadProcessor {
  private readonly logger = new Logger(SessionReloadProcessor.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Process session reload job (executed after 10 second delay)
   */
  @Process('hangup')
  async handleSessionHangup(job: Job<BillingApiRequest>) {
    const { acctSessionId, nasId, nasPortId, userName } = job.data;
    const uid = job.data['uid']; // Pass uid for logging

    this.logger.log(`Processing session hangup for user: ${userName} (uid: ${uid})`);

    try {
      const apiUrl = this.configService.get<string>('billing.apiUrl');
      const apiKey = this.configService.get<string>('billing.apiKey');

      if (!apiKey) {
        throw new Error('BILLING_API_KEY is not configured');
      }

      const url = `${apiUrl}/api.cgi/internet/${uid}/session/hangup`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'KEY': apiKey,
        },
        body: JSON.stringify({
          acctSessionId,
          nasId,
          nasPortId,
          userName,
        }),
      });

      const result = await response.json();

      if (result.result === 'OK') {
        this.logger.log(`Session successfully hung up for user: ${userName} (uid: ${uid})`);
        return { success: true, message: 'Сесію успішно скинуто' };
      } else {
        this.logger.warn(`Failed to hangup session for user: ${userName} (uid: ${uid}). Response: ${JSON.stringify(result)}`);
        return { success: false, message: 'Не вдалося скинути сесію' };
      }
    } catch (error) {
      this.logger.error(`Error hanging up session for user: ${userName} (uid: ${uid}):`, error);
      throw error; // Bull will retry based on job settings
    }
  }
}
