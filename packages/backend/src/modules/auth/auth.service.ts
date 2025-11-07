import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenUpdateQueue = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: CacheService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
  }

  /**
   * Validate API token with caching
   * Cache TTL: 5 minutes
   * LastUsedAt updates are batched every 30 seconds
   */
  async validateApiToken(token: string) {
    const cacheKey = `token:validation:${token}`;

    // Try to get from cache first
    let apiToken = await this.cacheService.get<any>(cacheKey);

    if (!apiToken) {
      // Cache miss - fetch from database
      apiToken = await this.prisma.apiToken.findFirst({
        where: {
          token: token,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          ipRules: true,
          endpointRules: true,
        },
      });

      if (!apiToken) {
        this.logger.debug(`Token validation failed: token not found`);
        return null;
      }

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, apiToken, 300);
      this.logger.debug(`Token cached: ${token.substring(0, 10)}...`);
    }

    // Check if token is expired
    if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
      this.logger.debug(`Token validation failed: token expired`);
      // Invalidate cache for expired token
      await this.cacheService.del(cacheKey);
      return null;
    }

    // Queue token for batch lastUsedAt update (non-blocking)
    this.queueTokenUsageUpdate(apiToken.id);

    return apiToken;
  }

  /**
   * Queue token ID for batch lastUsedAt update
   */
  private queueTokenUsageUpdate(tokenId: string): void {
    this.tokenUpdateQueue.add(tokenId);
  }

  /**
   * Batch update lastUsedAt for queued tokens
   * Runs every 30 seconds via cron
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processTokenUsageUpdates() {
    if (this.tokenUpdateQueue.size === 0) {
      return;
    }

    // Get all queued token IDs and clear the queue
    const tokenIds = Array.from(this.tokenUpdateQueue);
    this.tokenUpdateQueue.clear();

    try {
      // Batch update all tokens at once
      const result = await this.prisma.apiToken.updateMany({
        where: {
          id: { in: tokenIds },
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      this.logger.debug(
        `Batch updated lastUsedAt for ${result.count} tokens (${tokenIds.length} queued)`,
      );
    } catch (error) {
      this.logger.error('Error batch updating token usage:', error);
      // Re-queue failed updates
      tokenIds.forEach((id) => this.tokenUpdateQueue.add(id));
    }
  }
}
