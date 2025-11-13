import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePppoeVlanDto, UpdatePppoeVlanDto, PppoeVlanQueryDto } from './dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class PppoeVlanService {
  private readonly logger = new Logger(PppoeVlanService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all PPPoE VLAN configurations with optional filtering
   */
  async findAll(query?: PppoeVlanQueryDto) {
    try {
      const where: any = {};

      // Apply filters if provided
      if (query?.oltIp) {
        where.oltIp = query.oltIp;
      }

      if (query?.vlanId) {
        where.vlanId = query.vlanId;
      }

      const configs = await this.prisma.pppoeVlanConfig.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        total: configs.length,
        data: configs,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch PPPoE VLAN configs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get single PPPoE VLAN configuration by ID
   */
  async findOne(id: string) {
    try {
      const config = await this.prisma.pppoeVlanConfig.findUnique({
        where: { id },
      });

      if (!config) {
        throw new NotFoundException(`PPPoE VLAN configuration with ID ${id} not found`);
      }

      return config;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch PPPoE VLAN config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get VLAN ID by OLT IP address (fast lookup)
   */
  async findByIp(oltIp: string) {
    try {
      const config = await this.prisma.pppoeVlanConfig.findUnique({
        where: { oltIp },
      });

      if (!config) {
        throw new NotFoundException(`PPPoE VLAN configuration for IP ${oltIp} not found`);
      }

      return config;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch PPPoE VLAN config by IP: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create new PPPoE VLAN configuration
   */
  async create(dto: CreatePppoeVlanDto, tokenId: string) {
    try {
      // Check if IP already exists
      const existing = await this.prisma.pppoeVlanConfig.findUnique({
        where: { oltIp: dto.oltIp },
      });

      if (existing) {
        throw new ConflictException(
          `Configuration for OLT IP ${dto.oltIp} already exists. Please use update instead.`
        );
      }

      const config = await this.prisma.pppoeVlanConfig.create({
        data: {
          oltIp: dto.oltIp,
          vlanId: dto.vlanId,
          description: dto.description,
          tokenId,
        },
      });

      this.logger.log(`Created PPPoE VLAN config: ${dto.oltIp} -> VLAN ${dto.vlanId}`);

      return config;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Configuration for OLT IP ${dto.oltIp} already exists`
          );
        }
      }

      this.logger.error(`Failed to create PPPoE VLAN config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update existing PPPoE VLAN configuration
   */
  async update(id: string, dto: UpdatePppoeVlanDto) {
    try {
      // Check if config exists
      const existing = await this.prisma.pppoeVlanConfig.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`PPPoE VLAN configuration with ID ${id} not found`);
      }

      // If updating IP, check uniqueness
      if (dto.oltIp && dto.oltIp !== existing.oltIp) {
        const duplicate = await this.prisma.pppoeVlanConfig.findUnique({
          where: { oltIp: dto.oltIp },
        });

        if (duplicate) {
          throw new ConflictException(
            `Configuration for OLT IP ${dto.oltIp} already exists`
          );
        }
      }

      const updated = await this.prisma.pppoeVlanConfig.update({
        where: { id },
        data: {
          ...dto,
        },
      });

      this.logger.log(`Updated PPPoE VLAN config: ${updated.oltIp} -> VLAN ${updated.vlanId}`);

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Configuration for OLT IP ${dto.oltIp} already exists`
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException(`PPPoE VLAN configuration with ID ${id} not found`);
        }
      }

      this.logger.error(`Failed to update PPPoE VLAN config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete PPPoE VLAN configuration
   */
  async delete(id: string) {
    try {
      const config = await this.prisma.pppoeVlanConfig.findUnique({
        where: { id },
      });

      if (!config) {
        throw new NotFoundException(`PPPoE VLAN configuration with ID ${id} not found`);
      }

      await this.prisma.pppoeVlanConfig.delete({
        where: { id },
      });

      this.logger.log(`Deleted PPPoE VLAN config: ${config.oltIp} -> VLAN ${config.vlanId}`);

      return {
        message: 'PPPoE VLAN configuration deleted successfully',
        deletedConfig: config,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`PPPoE VLAN configuration with ID ${id} not found`);
        }
      }

      this.logger.error(`Failed to delete PPPoE VLAN config: ${error.message}`, error.stack);
      throw error;
    }
  }
}
