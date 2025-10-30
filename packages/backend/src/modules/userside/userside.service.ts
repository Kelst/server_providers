import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

/**
 * Userside Service
 *
 * Proxies requests to Userside API (https://us.intelekt.cv.ua/api.php)
 * Handles authentication with API key and parameter forwarding
 */
@Injectable()
export class UsersideService {
  private readonly logger = new Logger(UsersideService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('userside.apiUrl');
    this.apiKey = this.configService.get<string>('userside.apiKey');

    this.logger.log(`Userside API configured: ${this.apiUrl}`);
  }

  /**
   * Forward query to Userside API
   *
   * @param params - Query parameters to send to Userside API
   * @returns Response from Userside API with status code
   */
  async query(params: Record<string, any>) {
    try {
      // Always include API key with params
      const requestParams = {
        key: this.apiKey,
        ...params,
      };

      this.logger.debug(
        `Sending request to Userside API: ${JSON.stringify({
          cat: params.cat,
          subcat: params.subcat,
        })}`,
      );

      const response = await axios.get(this.apiUrl, {
        params: requestParams,
        timeout: 10000, // 10 second timeout
      });

      this.logger.debug(`Userside API responded with status: ${response.status}`);

      return {
        data: response.data,
        status: response.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Userside API error: ${axiosError.message}`,
          axiosError.response?.data,
        );

        throw new HttpException(
          axiosError.response?.data || 'Userside API error',
          axiosError.response?.status || 500,
        );
      }

      this.logger.error(`Unexpected error calling Userside API:`, error);
      throw error;
    }
  }
}
