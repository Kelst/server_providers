import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  /**
   * Відправка повідомлення про нову заявку на підключення в Telegram
   */
  async sendConnectionRequestNotification(
    botToken: string,
    chatId: string,
    request: {
      id: string;
      fullName: string;
      phoneNumber: string;
      createdAt: Date;
      ipAddress: string;
    },
  ): Promise<void> {
    try {
      const message = this.formatConnectionRequestMessage(request);
      await this.sendMessage(botToken, chatId, message);
      this.logger.log(`Telegram notification sent for request ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to send Telegram notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Тестування підключення до Telegram
   */
  async testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const testMessage = '✅ Тестове повідомлення від Cabinet Intelekt API\n\nТелеграм бот налаштовано успішно!';
      await this.sendMessage(botToken, chatId, testMessage);

      return {
        success: true,
        message: 'Тестове повідомлення успішно відправлено в Telegram',
      };
    } catch (error) {
      this.logger.error(`Telegram connection test failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Помилка підключення: ${error.message}`,
      };
    }
  }

  /**
   * Відправка повідомлення про звернення абонента в Telegram
   */
  async sendAppealNotification(
    botToken: string,
    chatId: string,
    appeal: {
      phoneNumber: string;
      message: string;
      ipAddress: string;
    },
  ): Promise<void> {
    try {
      const formattedMessage = this.formatAppealMessage(appeal);
      await this.sendMessage(botToken, chatId, formattedMessage);
      this.logger.log(`Appeal notification sent for phone ${appeal.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send appeal notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Тестування підключення для звернень абонентів
   */
  async testAppealsConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const testMessage = '✅ Тестове повідомлення для звернень абонентів\n\nЧат для звернень налаштовано успішно!';
      await this.sendMessage(botToken, chatId, testMessage);

      return {
        success: true,
        message: 'Тестове повідомлення успішно відправлено',
      };
    } catch (error) {
      this.logger.error(`Appeals connection test failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Помилка підключення: ${error.message}`,
      };
    }
  }

  /**
   * Форматування повідомлення про заявку
   */
  private formatConnectionRequestMessage(request: {
    id: string;
    fullName: string;
    phoneNumber: string;
    createdAt: Date;
    ipAddress: string;
  }): string {
    const date = new Date(request.createdAt).toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
🆕 <b>Нова заявка на підключення!</b>

👤 <b>ПІБ:</b> ${this.escapeHtml(request.fullName)}
📞 <b>Телефон:</b> <code>${request.phoneNumber}</code>

🕐 <b>Дата:</b> ${date}
🌐 <b>IP:</b> <code>${request.ipAddress}</code>
`.trim();
  }

  /**
   * Форматування повідомлення про звернення абонента
   */
  private formatAppealMessage(appeal: {
    phoneNumber: string;
    message: string;
    ipAddress: string;
  }): string {
    const date = new Date().toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
📩 <b>Нове звернення абонента!</b>

📞 <b>Телефон:</b> <code>${appeal.phoneNumber}</code>

💬 <b>Звернення:</b>
${this.escapeHtml(appeal.message)}

🕐 <b>Дата:</b> ${date}
🌐 <b>IP:</b> <code>${appeal.ipAddress}</code>
`.trim();
  }

  /**
   * Відправка повідомлення в Telegram
   */
  private async sendMessage(botToken: string, chatId: string, message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }, {
        timeout: 10000, // 10 seconds timeout
      });

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Unknown Telegram API error');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Telegram API повернув помилку
          const errorMessage = error.response.data?.description || error.message;
          throw new BadRequestException(`Помилка Telegram API: ${errorMessage}`);
        } else if (error.request) {
          // Запит відправлено, але немає відповіді
          throw new BadRequestException('Не вдалося підключитися до Telegram API. Перевірте інтернет-з\'єднання.');
        }
      }
      throw new BadRequestException(`Помилка відправки повідомлення: ${error.message}`);
    }
  }

  /**
   * Екранування HTML спецсимволів
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
