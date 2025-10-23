import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(private prisma: PrismaService) {}

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
}
