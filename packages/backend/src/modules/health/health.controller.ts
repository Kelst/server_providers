import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Returns overall health status and details for all services (PostgreSQL, Redis, ABills). Also includes system metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
        },
        timestamp: { type: 'string', format: 'date-time' },
        services: {
          type: 'object',
          properties: {
            postgres: { type: 'object' },
            redis: { type: 'object' },
            abills: { type: 'object' },
          },
        },
        system: { type: 'object' },
      },
    },
  })
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('enhanced')
  @ApiOperation({
    summary: 'Enhanced health check endpoint',
    description:
      'Returns detailed health metrics including PostgreSQL (connections, db size), Redis (memory, clients, ops/sec), System (CPU %, disk, network), and Application (event loop lag).',
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced health metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
        },
        timestamp: { type: 'string', format: 'date-time' },
        services: {
          type: 'object',
          properties: {
            postgres: {
              type: 'object',
              description: 'PostgreSQL health with connections, db size, performance metrics',
            },
            redis: {
              type: 'object',
              description: 'Redis health with memory usage, clients, operations per second',
            },
            abills: { type: 'object' },
          },
        },
        system: {
          type: 'object',
          description: 'System metrics: CPU%, memory%, disk usage, network interfaces',
        },
        application: {
          type: 'object',
          description: 'Application metrics: event loop lag, active connections',
        },
      },
    },
  })
  async getEnhancedHealth() {
    return this.healthService.getEnhancedHealth();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Simple endpoint to check if the service is running. Always returns 200 OK.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  async getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Check if the service is ready to accept traffic. Returns 200 if critical services (PostgreSQL, Redis) are available, 503 otherwise.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async getReadiness() {
    try {
      return await this.healthService.getReadiness();
    } catch (error) {
      throw new ServiceUnavailableException('Service not ready');
    }
  }
}
