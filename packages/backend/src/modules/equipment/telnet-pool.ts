import { Logger } from '@nestjs/common';
import { Telnet } from 'telnet-client';
import { createHash } from 'crypto';

/**
 * Telnet Connection Pool Entry
 */
interface PooledConnection {
  connection: Telnet;
  host: string;
  lastUsed: Date;
  inUse: boolean;
}

/**
 * Pool Configuration
 */
export interface TelnetPoolConfig {
  maxConnections: number;
  idleTimeout: number; // milliseconds
}

/**
 * Telnet Connection Pool Manager
 *
 * Manages a pool of telnet connections for reuse to avoid
 * creating new connections for every request.
 */
export class TelnetConnectionPool {
  private readonly logger = new Logger(TelnetConnectionPool.name);
  private pool: Map<string, PooledConnection> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly config: TelnetPoolConfig) {
    // Start cleanup interval to remove stale connections
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleConnections(),
      30000 // Check every 30 seconds
    );

    this.logger.log(
      `Telnet connection pool initialized (max: ${config.maxConnections}, idle timeout: ${config.idleTimeout}ms)`
    );
  }

  /**
   * Get connection key for pooling
   * Includes password hash to ensure different passwords create different pool entries
   */
  private getConnectionKey(host: string, username: string, password: string): string {
    // Hash password to avoid storing plaintext in pool key
    const passwordHash = createHash('sha256').update(password).digest('hex').substring(0, 16);
    return `${host}:${username}:${passwordHash}`;
  }

  /**
   * Acquire a connection from the pool or create a new one
   */
  async acquire(
    host: string,
    username: string,
    password: string,
    params: any
  ): Promise<Telnet> {
    const key = this.getConnectionKey(host, username, password);
    const existing = this.pool.get(key);

    // Reuse existing connection if available and not in use
    if (existing && !existing.inUse) {
      // Validate connection is still alive before reusing
      const socket = existing.connection.getSocket();
      if (socket && socket.destroyed) {
        this.logger.warn(`Connection ${key} socket is destroyed, removing from pool`);
        await this.removeConnection(key);
        // Will create new connection below
      } else {
        this.logger.debug(`Reusing existing connection for ${key}`);
        existing.inUse = true;
        existing.lastUsed = new Date();
        return existing.connection;
      }
    }

    // Check pool size limit
    if (this.pool.size >= this.config.maxConnections) {
      // Try to find and close an idle connection
      const idleConnection = this.findIdleConnection();
      if (idleConnection) {
        await this.removeConnection(idleConnection);
      } else {
        throw new Error(
          `Connection pool limit reached (${this.config.maxConnections} connections)`
        );
      }
    }

    // Create new connection
    this.logger.debug(`Creating new telnet connection for ${key}`);
    this.logger.debug(`Connection params: host=${host}, port=${params.port}, timeout=${params.timeout}`);
    const connection = new Telnet();

    try {
      await connection.connect({
        host,
        username,
        password,
        ...params,
      });

      // Add to pool
      this.pool.set(key, {
        connection,
        host,
        lastUsed: new Date(),
        inUse: true,
      });

      this.logger.log(
        `New telnet connection established for ${key} (pool size: ${this.pool.size})`
      );

      return connection;
    } catch (error) {
      this.logger.error(`Failed to create telnet connection for ${key}:`, error);
      this.logger.error(`Connection error details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Release connection back to pool
   */
  release(connection: Telnet): void {
    for (const [key, pooled] of this.pool.entries()) {
      if (pooled.connection === connection) {
        pooled.inUse = false;
        pooled.lastUsed = new Date();
        this.logger.debug(`Released connection ${key} back to pool`);
        return;
      }
    }
  }

  /**
   * Remove connection from pool and close it
   */
  private async removeConnection(key: string): Promise<void> {
    const pooled = this.pool.get(key);
    if (pooled) {
      try {
        await pooled.connection.end();
        this.logger.debug(`Closed connection ${key}`);
      } catch (error) {
        this.logger.warn(`Error closing connection ${key}:`, error.message);
      }
      this.pool.delete(key);
    }
  }

  /**
   * Find an idle (not in use) connection
   */
  private findIdleConnection(): string | null {
    for (const [key, pooled] of this.pool.entries()) {
      if (!pooled.inUse) {
        return key;
      }
    }
    return null;
  }

  /**
   * Cleanup stale connections that have been idle too long
   */
  private async cleanupStaleConnections(): Promise<void> {
    const now = new Date().getTime();
    const staleKeys: string[] = [];

    for (const [key, pooled] of this.pool.entries()) {
      const idleTime = now - pooled.lastUsed.getTime();

      if (!pooled.inUse && idleTime > this.config.idleTimeout) {
        staleKeys.push(key);
      }
    }

    if (staleKeys.length > 0) {
      this.logger.debug(
        `Cleaning up ${staleKeys.length} stale telnet connections`
      );

      for (const key of staleKeys) {
        await this.removeConnection(key);
      }
    }
  }

  /**
   * Close all connections and cleanup
   */
  async closeAll(): Promise<void> {
    this.logger.log('Closing all telnet connections...');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    const closePromises: Promise<void>[] = [];
    for (const key of this.pool.keys()) {
      closePromises.push(this.removeConnection(key));
    }

    await Promise.allSettled(closePromises);

    this.pool.clear();
    this.logger.log('All telnet connections closed');
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  } {
    let active = 0;
    let idle = 0;

    for (const pooled of this.pool.values()) {
      if (pooled.inUse) {
        active++;
      } else {
        idle++;
      }
    }

    return {
      totalConnections: this.pool.size,
      activeConnections: active,
      idleConnections: idle,
    };
  }
}
