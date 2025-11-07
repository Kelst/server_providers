import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { CreateIpRuleDto } from './dto/create-ip-rule.dto';
import { RegenerateTokenDto } from './dto/regenerate-token.dto';
import { CreateEndpointRuleDto } from './dto/create-endpoint-rule.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createTokenDto: CreateTokenDto, userId: string, ipAddress?: string, userAgent?: string) {
    // Generate random token
    const token = 'tk_' + randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    const apiToken = await this.prisma.apiToken.create({
      data: {
        token,
        tokenHash,
        projectName: createTokenDto.projectName,
        description: createTokenDto.description,
        scopes: createTokenDto.scopes || [],
        rateLimit: createTokenDto.rateLimit || 100,
        expiresAt: createTokenDto.expiresAt,
        createdBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log audit event
    await this.logAudit(
      apiToken.id,
      userId,
      'created',
      {
        projectName: apiToken.projectName,
        scopes: apiToken.scopes,
        rateLimit: apiToken.rateLimit,
        expiresAt: apiToken.expiresAt,
      },
      ipAddress,
      userAgent,
    );

    // Return token only on creation (won't be retrievable later)
    return {
      ...apiToken,
      token, // Plain token only shown once
    };
  }

  async findAll(userId: string) {
    return this.prisma.apiToken.findMany({
      where: { createdBy: userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.apiToken.findFirst({
      where: {
        id,
        createdBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
    });
  }

  async update(id: string, updateTokenDto: UpdateTokenDto, userId: string, ipAddress?: string, userAgent?: string) {
    // Get old token state before update
    const oldToken = await this.prisma.apiToken.findUnique({
      where: { id },
    });

    if (!oldToken) {
      return null;
    }

    // Update token
    const updatedToken = await this.prisma.apiToken.update({
      where: {
        id,
        createdBy: userId,
      },
      data: {
        projectName: updateTokenDto.projectName,
        description: updateTokenDto.description,
        scopes: updateTokenDto.scopes,
        isActive: updateTokenDto.isActive,
        rateLimit: updateTokenDto.rateLimit,
        expiresAt: updateTokenDto.expiresAt,
      },
    });

    // Invalidate token validation cache
    await this.cacheService.del(`token:validation:${oldToken.token}`);
    this.logger.debug(`Cache invalidated for updated token: ${id}`);

    // Calculate changes and log audit
    const changes = this.calculateChanges(oldToken, updatedToken);

    if (changes) {
      // Determine specific action if isActive changed
      let action: 'updated' | 'activated' | 'deactivated' = 'updated';
      if (changes.isActive) {
        action = changes.isActive.new === true ? 'activated' : 'deactivated';
      }

      await this.logAudit(
        id,
        userId,
        action,
        changes,
        ipAddress,
        userAgent,
      );
    }

    return updatedToken;
  }

  async remove(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    // Get token info before deletion
    const token = await this.prisma.apiToken.findUnique({
      where: { id },
    });

    if (!token) {
      return null;
    }

    // Invalidate token validation cache
    await this.cacheService.del(`token:validation:${token.token}`);
    this.logger.debug(`Cache invalidated for deleted token: ${id}`);

    // Log audit event BEFORE deletion (because we need tokenId reference)
    await this.logAudit(
      id,
      userId,
      'deleted',
      {
        projectName: token.projectName,
        scopes: token.scopes,
        wasActive: token.isActive,
      },
      ipAddress,
      userAgent,
    );

    // Delete token
    return this.prisma.apiToken.delete({
      where: {
        id,
        createdBy: userId,
      },
    });
  }

  async getStats(id: string, userId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id,
        createdBy: userId,
      },
    });

    if (!token) {
      return null;
    }

    const requests = await this.prisma.apiRequest.findMany({
      where: { tokenId: id },
      select: {
        statusCode: true,
        responseTime: true,
        createdAt: true,
      },
    });

    const totalRequests = requests.length;
    const successfulRequests = requests.filter(r => r.statusCode < 400).length;
    const errorRequests = requests.filter(r => r.statusCode >= 400).length;

    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    const avgResponseTime = totalRequests > 0
      ? requests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalRequests
      : 0;

    const lastUsed = requests.length > 0
      ? requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;

    return {
      totalRequests,
      successRate,
      errorRate,
      avgResponseTime: Math.round(avgResponseTime),
      lastUsed: lastUsed ? lastUsed.toISOString() : undefined,
    };
  }

  /**
   * Log audit event for token changes
   */
  private async logAudit(
    tokenId: string,
    adminId: string,
    action: 'created' | 'updated' | 'deleted' | 'regenerated' | 'deactivated' | 'activated',
    changes?: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await this.prisma.tokenAuditLog.create({
        data: {
          tokenId,
          adminId,
          action,
          changes: changes || null,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || null,
        },
      });

      this.logger.log(
        `Audit log created: token=${tokenId}, action=${action}, admin=${adminId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit failure shouldn't block the operation
    }
  }

  /**
   * Calculate diff between old and new token data
   */
  private calculateChanges(oldToken: any, newToken: any): any {
    const changes: any = {};

    const fieldsToCompare = [
      'projectName',
      'description',
      'scopes',
      'isActive',
      'rateLimit',
      'expiresAt',
    ];

    for (const field of fieldsToCompare) {
      if (JSON.stringify(oldToken[field]) !== JSON.stringify(newToken[field])) {
        changes[field] = {
          old: oldToken[field],
          new: newToken[field],
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Regenerate token (create new token value, keep all settings)
   */
  async regenerate(id: string, regenerateDto: RegenerateTokenDto, userId: string, ipAddress?: string, userAgent?: string) {
    const oldToken = await this.prisma.apiToken.findFirst({
      where: {
        id,
        createdBy: userId,
      },
    });

    if (!oldToken) {
      throw new NotFoundException('Token not found');
    }

    // Generate new token
    const newTokenValue = 'tk_' + randomBytes(32).toString('hex');
    const newTokenHash = await bcrypt.hash(newTokenValue, 10);

    // Invalidate old token's cache
    await this.cacheService.del(`token:validation:${oldToken.token}`);
    this.logger.debug(`Cache invalidated for regenerated token: ${id}`);

    // Store old token hash in rotation history
    await this.prisma.tokenRotationHistory.create({
      data: {
        tokenId: id,
        oldTokenHash: oldToken.tokenHash,
        reason: regenerateDto.reason,
        rotatedBy: userId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || null,
      },
    });

    // Update token with new values
    const updatedToken = await this.prisma.apiToken.update({
      where: { id },
      data: {
        token: newTokenValue,
        tokenHash: newTokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log audit event
    await this.logAudit(
      id,
      userId,
      'regenerated',
      {
        reason: regenerateDto.reason || 'Token regenerated',
      },
      ipAddress,
      userAgent,
    );

    this.logger.log(`Token regenerated: id=${id}, admin=${userId}`);

    // Return new token value (only shown once)
    return {
      ...updatedToken,
      token: newTokenValue,
    };
  }

  /**
   * Get token rotation history
   */
  async getRotationHistory(id: string, userId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.tokenRotationHistory.findMany({
      where: { tokenId: id },
      include: {
        rotator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { rotatedAt: 'desc' },
    });
  }

  /**
   * Create IP rule for token
   */
  async createIpRule(tokenId: string, createIpRuleDto: CreateIpRuleDto, userId: string) {
    // Verify token belongs to user
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Check for duplicate IP rule
    const existing = await this.prisma.ipRule.findFirst({
      where: {
        tokenId,
        ipAddress: createIpRuleDto.ipAddress,
      },
    });

    if (existing) {
      throw new ConflictException('IP rule already exists for this token');
    }

    return this.prisma.ipRule.create({
      data: {
        tokenId,
        type: createIpRuleDto.type,
        ipAddress: createIpRuleDto.ipAddress,
        description: createIpRuleDto.description,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get all IP rules for a token
   */
  async getIpRules(tokenId: string, userId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.ipRule.findMany({
      where: { tokenId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete IP rule
   */
  async deleteIpRule(tokenId: string, ruleId: string, userId: string) {
    // Verify token belongs to user
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Verify rule belongs to this token
    const rule = await this.prisma.ipRule.findFirst({
      where: {
        id: ruleId,
        tokenId,
      },
    });

    if (!rule) {
      throw new NotFoundException('IP rule not found');
    }

    return this.prisma.ipRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Get security events for a token
   */
  async getSecurityLog(tokenId: string, userId: string, limit = 100) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.securityEvent.findMany({
      where: { tokenId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Create endpoint rule for token (blacklist)
   */
  async createEndpointRule(tokenId: string, createEndpointRuleDto: CreateEndpointRuleDto, userId: string) {
    // Verify token belongs to user
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Check for duplicate endpoint rule
    const existing = await this.prisma.endpointRule.findFirst({
      where: {
        tokenId,
        endpoint: createEndpointRuleDto.endpoint,
        method: createEndpointRuleDto.method || null,
      },
    });

    if (existing) {
      throw new ConflictException('Endpoint rule already exists for this token');
    }

    return this.prisma.endpointRule.create({
      data: {
        tokenId,
        endpoint: createEndpointRuleDto.endpoint,
        method: createEndpointRuleDto.method || null,
        description: createEndpointRuleDto.description,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get all endpoint rules for a token
   */
  async getEndpointRules(tokenId: string, userId: string) {
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.prisma.endpointRule.findMany({
      where: { tokenId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete endpoint rule
   */
  async deleteEndpointRule(tokenId: string, ruleId: string, userId: string) {
    // Verify token belongs to user
    const token = await this.prisma.apiToken.findFirst({
      where: {
        id: tokenId,
        createdBy: userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Verify rule belongs to this token
    const rule = await this.prisma.endpointRule.findFirst({
      where: {
        id: ruleId,
        tokenId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Endpoint rule not found');
    }

    return this.prisma.endpointRule.delete({
      where: { id: ruleId },
    });
  }
}
