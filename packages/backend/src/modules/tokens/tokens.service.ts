import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class TokensService {
  constructor(private prisma: PrismaService) {}

  async create(createTokenDto: CreateTokenDto, userId: string) {
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

  async update(id: string, updateTokenDto: UpdateTokenDto, userId: string) {
    return this.prisma.apiToken.update({
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
  }

  async remove(id: string, userId: string) {
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

    const [totalRequests, recentRequests] = await Promise.all([
      this.prisma.apiRequest.count({
        where: { tokenId: id },
      }),
      this.prisma.apiRequest.findMany({
        where: { tokenId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      totalRequests,
      recentRequests,
    };
  }
}
