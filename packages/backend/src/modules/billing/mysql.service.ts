import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

/**
 * MySQL Service for Abills Database
 *
 * Provides connection pool and query execution for Abills MySQL database.
 * Uses mysql2/promise for async/await support.
 */
@Injectable()
export class MySQLService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MySQLService.name);
  private pool: mysql.Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = {
      host: this.configService.get<string>('abills.host'),
      user: this.configService.get<string>('abills.user'),
      password: this.configService.get<string>('abills.password'),
      database: this.configService.get<string>('abills.database'),
      waitForConnections: true,
      connectionLimit: 100,
      maxIdle: 100,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

    this.pool = mysql.createPool(config);
    this.logger.log('MySQL connection pool created for Abills database');

    // Test connection
    try {
      const connection = await this.pool.getConnection();
      this.logger.log('Successfully connected to Abills MySQL database');
      connection.release();
    } catch (error) {
      this.logger.error('Failed to connect to Abills MySQL database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('MySQL connection pool closed');
    }
  }

  /**
   * Execute a SQL query
   * @param sql SQL query string
   * @param params Optional query parameters for prepared statements
   * @returns Query results
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results as T;
    } catch (error) {
      this.logger.error(`MySQL query error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get the decode key for password decryption
   */
  getDecodeKey(): string {
    return this.configService.get<string>('abills.decodeKey');
  }
}
