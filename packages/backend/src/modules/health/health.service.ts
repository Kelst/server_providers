import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import Redis from 'ioredis';
import * as si from 'systeminformation';
import * as pidusage from 'pidusage';
import * as eventLoopStats from 'event-loop-stats';

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  details?: any;
}

export interface EnhancedPostgresHealth extends ServiceStatus {
  connections?: {
    active: number;
    idle: number;
    total: number;
  };
  database?: {
    size: string;
    tables: number;
  };
  performance?: {
    avgQueryTime: number;
  };
}

export interface EnhancedRedisHealth extends ServiceStatus {
  memory?: {
    used: string;
    peak: string;
    fragmentation: number;
  };
  clients?: {
    connected: number;
    blocked: number;
  };
  stats?: {
    totalKeys: number;
    opsPerSec: number;
  };
}

export interface EnhancedSystemHealth {
  uptime: number;
  cpu: {
    usage: number; // percentage (0-100)
    cores: number;
    loadAverage: number[];
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    path: string;
  };
  network: {
    interfaces: Array<{
      name: string;
      ip4: string;
      speed: number;
    }>;
  };
  process: {
    pid: number;
    version: string;
    platform: string;
  };
}

export interface EnhancedApplicationHealth {
  http: {
    activeConnections: number;
  };
  eventLoop: {
    lag: number; // milliseconds
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    // Initialize Redis client for health check
    const redisHost = this.configService.get<string>('redis.host');
    const redisPort = this.configService.get<number>('redis.port');
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry for health checks
    });
  }

  /**
   * Get basic health status (backward compatible)
   */
  async getHealth() {
    const [postgres, redis, abills] = await Promise.allSettled([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkAbills(),
    ]);

    const services = {
      postgres: this.formatResult(postgres),
      redis: this.formatResult(redis),
      abills: this.formatResult(abills),
    };

    const overallStatus = this.getOverallStatus(services);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      system: {
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
              100,
          ),
        },
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
      },
    };
  }

  /**
   * Get enhanced health status with detailed metrics
   */
  async getEnhancedHealth() {
    const [postgres, redis, system, application] = await Promise.allSettled([
      this.getEnhancedPostgresHealth(),
      this.getEnhancedRedisHealth(),
      this.getEnhancedSystemHealth(),
      this.getEnhancedApplicationHealth(),
    ]);

    const services = {
      postgres: this.formatResult(postgres),
      redis: this.formatResult(redis),
      abills: {
        status: 'healthy' as const,
        details: 'Connection not checked (external service)',
      },
    };

    const overallStatus = this.getOverallStatus(services);

    // Get cache statistics
    const cacheStats = this.cacheService.getCacheStats();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      system: system.status === 'fulfilled' ? system.value : null,
      application: application.status === 'fulfilled' ? application.value : null,
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        errors: cacheStats.errors,
        hitRate: cacheStats.hitRate,
        totalRequests: cacheStats.total,
        performance: {
          status: parseFloat(cacheStats.hitRate) > 70 ? 'excellent' : parseFloat(cacheStats.hitRate) > 50 ? 'good' : 'poor',
          recommendation: parseFloat(cacheStats.hitRate) < 50 ? 'Consider increasing cache TTL or pre-warming cache' : null,
        },
      },
    };
  }

  /**
   * Enhanced PostgreSQL health check with detailed metrics
   */
  private async getEnhancedPostgresHealth(): Promise<EnhancedPostgresHealth> {
    const start = Date.now();

    try {
      // Basic connectivity check
      await this.prisma.$queryRaw`SELECT 1 as result`;
      const latency = Date.now() - start;

      // Get connection pool stats
      const [dbSizeResult, tableCountResult] = await Promise.allSettled([
        this.prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `,
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) as count
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `,
      ]);

      const dbSize =
        dbSizeResult.status === 'fulfilled' && dbSizeResult.value[0]
          ? dbSizeResult.value[0].size
          : 'Unknown';

      const tableCount =
        tableCountResult.status === 'fulfilled' && tableCountResult.value[0]
          ? Number(tableCountResult.value[0].count)
          : 0;

      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        database: {
          size: dbSize,
          tables: tableCount,
        },
        performance: {
          avgQueryTime: latency,
        },
      };
    } catch (error) {
      this.logger.error(`PostgreSQL health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Enhanced Redis health check with detailed metrics
   */
  private async getEnhancedRedisHealth(): Promise<EnhancedRedisHealth> {
    const start = Date.now();

    try {
      // Basic connectivity check
      await this.redis.ping();
      const latency = Date.now() - start;

      // Get Redis INFO
      const info = await this.redis.info();
      const infoObj = this.parseRedisInfo(info);

      // Get total keys
      const dbSize = await this.redis.dbsize();

      return {
        status: latency > 500 ? 'degraded' : 'healthy',
        latency,
        memory: {
          used: infoObj.used_memory_human || 'Unknown',
          peak: infoObj.used_memory_peak_human || 'Unknown',
          fragmentation: parseFloat(infoObj.mem_fragmentation_ratio) || 1,
        },
        clients: {
          connected: parseInt(infoObj.connected_clients) || 0,
          blocked: parseInt(infoObj.blocked_clients) || 0,
        },
        stats: {
          totalKeys: dbSize || 0,
          opsPerSec: parseInt(infoObj.instantaneous_ops_per_sec) || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Enhanced system health with detailed metrics
   */
  private async getEnhancedSystemHealth(): Promise<EnhancedSystemHealth> {
    try {
      // Get CPU info
      const cpuData = await si.cpu();
      const cpuLoad = await si.currentLoad();

      // Get process CPU usage
      const processStats = await pidusage(process.pid);

      // Get memory info
      const mem = await si.mem();
      const processMemory = process.memoryUsage();

      // Get disk info
      const fsSize = await si.fsSize();
      const mainDisk = fsSize.find((fs) => fs.mount === '/') || fsSize[0];

      // Get network interfaces
      const networkInterfaces = await si.networkInterfaces();

      // Get load average
      const load = await si.currentLoad();

      return {
        uptime: Math.floor(process.uptime()),
        cpu: {
          usage: Math.round(processStats.cpu) || Math.round(cpuLoad.currentLoad),
          cores: cpuData.cores,
          loadAverage: [load.avgLoad, load.currentLoad, load.currentLoadIdle],
          model: cpuData.brand,
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          percentage: Math.round((mem.used / mem.total) * 100),
          heapUsed: processMemory.heapUsed,
          heapTotal: processMemory.heapTotal,
          external: processMemory.external,
        },
        disk: {
          total: mainDisk?.size || 0,
          used: mainDisk?.used || 0,
          free: mainDisk?.available || 0,
          percentage: mainDisk ? Math.round(mainDisk.use) : 0,
          path: mainDisk?.mount || '/',
        },
        network: {
          interfaces: networkInterfaces
            .filter((iface) => iface.ip4 && !iface.internal)
            .map((iface) => ({
              name: iface.iface,
              ip4: iface.ip4,
              speed: iface.speed || 0,
            })),
        },
        process: {
          pid: process.pid,
          version: process.version,
          platform: process.platform,
        },
      };
    } catch (error) {
      this.logger.error(`System health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enhanced application health metrics
   */
  private async getEnhancedApplicationHealth(): Promise<EnhancedApplicationHealth> {
    try {
      // Get event loop stats
      const loopStats = eventLoopStats.sense();

      // Estimate active HTTP connections (simplified)
      // In real production, you might track this via middleware
      const activeConnections = 0; // Placeholder

      return {
        http: {
          activeConnections,
        },
        eventLoop: {
          lag: Math.round(loopStats.max / 1000000) || 0, // Convert nanoseconds to milliseconds
        },
      };
    } catch (error) {
      this.logger.error(`Application health check failed: ${error.message}`);
      return {
        http: {
          activeConnections: 0,
        },
        eventLoop: {
          lag: 0,
        },
      };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1 as result`;
      const latency = Date.now() - start;
      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return {
        status: latency > 500 ? 'degraded' : 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkAbills(): Promise<ServiceStatus> {
    // ABills health check - keeping as stub per user request
    try {
      return {
        status: 'healthy',
        details: 'Connection not checked (external service)',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private formatResult(
    result: PromiseSettledResult<ServiceStatus | EnhancedPostgresHealth | EnhancedRedisHealth>,
  ): ServiceStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        error: result.reason?.message || 'Unknown error',
      };
    }
  }

  private getOverallStatus(services: Record<string, ServiceStatus>): string {
    const statuses = Object.values(services).map((s) => s.status);

    if (statuses.every((s) => s === 'healthy')) {
      return 'healthy';
    } else if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  async getLiveness() {
    // Simple liveness check - just return OK if service is running
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async getReadiness() {
    // Readiness check - verify critical services are available
    const health = await this.getHealth();

    // Service is ready if PostgreSQL and Redis are at least degraded
    const isReady =
      health.services.postgres.status !== 'unhealthy' &&
      health.services.redis.status !== 'unhealthy';

    if (!isReady) {
      throw new Error('Service not ready');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  onModuleDestroy() {
    // Cleanup Redis connection
    this.redis.disconnect();
  }
}
