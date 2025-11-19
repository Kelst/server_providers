import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateProviderInfoDto,
  UpdateProviderInfoDto,
  ProviderInfoResponseDto,
  CreatePhoneDto,
  UpdatePhoneDto,
  CreateEmailDto,
  UpdateEmailDto,
  CreateSocialMediaDto,
  UpdateSocialMediaDto,
  AuditLogResponseDto,
} from './dto';

@Injectable()
export class CabinetIntelektService {
  private readonly logger = new Logger(CabinetIntelektService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get provider information (public method for mobile apps)
   */
  async getProviderInfo(): Promise<ProviderInfoResponseDto> {
    this.logger.debug('Fetching provider information');

    const provider = await this.prisma.providerInfo.findFirst({
      include: {
        phones: true,
        emails: true,
        socialMedia: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider information not found');
    }

    return provider as ProviderInfoResponseDto;
  }

  /**
   * Create or update provider information (admin)
   */
  async upsertProviderInfo(
    dto: CreateProviderInfoDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ProviderInfoResponseDto> {
    this.logger.debug('Creating/updating provider information');

    const existing = await this.prisma.providerInfo.findFirst();

    let provider;
    let action: string;
    let changes = null;

    if (existing) {
      // Update existing
      action = 'updated';
      changes = this.calculateChanges(existing, dto);

      provider = await this.prisma.providerInfo.update({
        where: { id: existing.id },
        data: dto,
        include: {
          phones: true,
          emails: true,
          socialMedia: true,
        },
      });
    } else {
      // Create new
      action = 'created';
      provider = await this.prisma.providerInfo.create({
        data: dto,
        include: {
          phones: true,
          emails: true,
          socialMedia: true,
        },
      });
    }

    // Create audit log
    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action,
      entityType: 'info',
      entityId: provider.id,
      changes,
      ipAddress,
      userAgent,
    });

    return provider as ProviderInfoResponseDto;
  }

  /**
   * Partially update provider information (admin)
   */
  async updateProviderInfo(
    dto: UpdateProviderInfoDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ProviderInfoResponseDto> {
    this.logger.debug('Partially updating provider information');

    const existing = await this.prisma.providerInfo.findFirst();

    if (!existing) {
      throw new NotFoundException('Provider information not found');
    }

    const changes = this.calculateChanges(existing, dto);

    const provider = await this.prisma.providerInfo.update({
      where: { id: existing.id },
      data: dto,
      include: {
        phones: true,
        emails: true,
        socialMedia: true,
      },
    });

    // Create audit log
    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action: 'updated',
      entityType: 'info',
      entityId: provider.id,
      changes,
      ipAddress,
      userAgent,
    });

    return provider as ProviderInfoResponseDto;
  }

  /**
   * Update logo URL
   */
  async updateLogoUrl(
    logoUrl: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    this.logger.debug(`Updating logo URL: ${logoUrl}`);

    const existing = await this.prisma.providerInfo.findFirst();

    if (!existing) {
      throw new NotFoundException('Provider information not found');
    }

    await this.prisma.providerInfo.update({
      where: { id: existing.id },
      data: { logoUrl },
    });

    // Create audit log
    await this.createAuditLog({
      providerId: existing.id,
      adminId,
      action: 'logo_uploaded',
      entityType: 'info',
      entityId: existing.id,
      changes: { logoUrl: { old: existing.logoUrl, new: logoUrl } },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Delete logo
   */
  async deleteLogo(
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    this.logger.debug('Deleting logo');

    const existing = await this.prisma.providerInfo.findFirst();

    if (!existing) {
      throw new NotFoundException('Provider information not found');
    }

    const oldLogoUrl = existing.logoUrl;

    await this.prisma.providerInfo.update({
      where: { id: existing.id },
      data: { logoUrl: null },
    });

    // Create audit log
    await this.createAuditLog({
      providerId: existing.id,
      adminId,
      action: 'logo_deleted',
      entityType: 'info',
      entityId: existing.id,
      changes: { logoUrl: { old: oldLogoUrl, new: null } },
      ipAddress,
      userAgent,
    });
  }

  // ========================================
  // Phone Numbers CRUD
  // ========================================

  async createPhone(
    dto: CreatePhoneDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug('Creating phone number');

    const provider = await this.ensureProviderExists();

    const phone = await this.prisma.providerPhone.create({
      data: {
        ...dto,
        providerId: provider.id,
      },
    });

    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action: 'created',
      entityType: 'phone',
      entityId: phone.id,
      changes: { created: dto },
      ipAddress,
      userAgent,
    });

    return phone;
  }

  async updatePhone(
    id: string,
    dto: UpdatePhoneDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Updating phone number: ${id}`);

    const existing = await this.prisma.providerPhone.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Phone number not found');
    }

    const changes = this.calculateChanges(existing, dto);

    const phone = await this.prisma.providerPhone.update({
      where: { id },
      data: dto,
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'updated',
      entityType: 'phone',
      entityId: id,
      changes,
      ipAddress,
      userAgent,
    });

    return phone;
  }

  async deletePhone(
    id: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Deleting phone number: ${id}`);

    const existing = await this.prisma.providerPhone.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Phone number not found');
    }

    await this.prisma.providerPhone.delete({
      where: { id },
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'deleted',
      entityType: 'phone',
      entityId: id,
      changes: { deleted: existing },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ========================================
  // Email CRUD
  // ========================================

  async createEmail(
    dto: CreateEmailDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug('Creating email address');

    const provider = await this.ensureProviderExists();

    const email = await this.prisma.providerEmail.create({
      data: {
        ...dto,
        providerId: provider.id,
      },
    });

    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action: 'created',
      entityType: 'email',
      entityId: email.id,
      changes: { created: dto },
      ipAddress,
      userAgent,
    });

    return email;
  }

  async updateEmail(
    id: string,
    dto: UpdateEmailDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Updating email address: ${id}`);

    const existing = await this.prisma.providerEmail.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Email address not found');
    }

    const changes = this.calculateChanges(existing, dto);

    const email = await this.prisma.providerEmail.update({
      where: { id },
      data: dto,
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'updated',
      entityType: 'email',
      entityId: id,
      changes,
      ipAddress,
      userAgent,
    });

    return email;
  }

  async deleteEmail(
    id: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Deleting email address: ${id}`);

    const existing = await this.prisma.providerEmail.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Email address not found');
    }

    await this.prisma.providerEmail.delete({
      where: { id },
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'deleted',
      entityType: 'email',
      entityId: id,
      changes: { deleted: existing },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ========================================
  // Social Media CRUD
  // ========================================

  async createSocialMedia(
    dto: CreateSocialMediaDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug('Creating social media link');

    const provider = await this.ensureProviderExists();

    const social = await this.prisma.providerSocialMedia.create({
      data: {
        ...dto,
        providerId: provider.id,
      },
    });

    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action: 'created',
      entityType: 'social',
      entityId: social.id,
      changes: { created: dto },
      ipAddress,
      userAgent,
    });

    return social;
  }

  async updateSocialMedia(
    id: string,
    dto: UpdateSocialMediaDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Updating social media link: ${id}`);

    const existing = await this.prisma.providerSocialMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Social media link not found');
    }

    const changes = this.calculateChanges(existing, dto);

    const social = await this.prisma.providerSocialMedia.update({
      where: { id },
      data: dto,
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'updated',
      entityType: 'social',
      entityId: id,
      changes,
      ipAddress,
      userAgent,
    });

    return social;
  }

  async deleteSocialMedia(
    id: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ) {
    this.logger.debug(`Deleting social media link: ${id}`);

    const existing = await this.prisma.providerSocialMedia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Social media link not found');
    }

    await this.prisma.providerSocialMedia.delete({
      where: { id },
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'deleted',
      entityType: 'social',
      entityId: id,
      changes: { deleted: existing },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  // ========================================
  // Audit Logs
  // ========================================

  async getAuditLogs(limit = 100): Promise<AuditLogResponseDto[]> {
    this.logger.debug(`Fetching audit logs (limit: ${limit})`);

    const logs = await this.prisma.providerInfoAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return logs as AuditLogResponseDto[];
  }

  // ========================================
  // Helper Methods
  // ========================================

  private async ensureProviderExists() {
    let provider = await this.prisma.providerInfo.findFirst();

    if (!provider) {
      // Create default provider info if doesn't exist
      provider = await this.prisma.providerInfo.create({
        data: {
          companyName: 'Provider Name',
        },
      });
      this.logger.debug('Created default provider info');
    }

    return provider;
  }

  private async createAuditLog(data: {
    providerId: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: any;
    ipAddress: string;
    userAgent?: string;
  }) {
    await this.prisma.providerInfoAuditLog.create({
      data,
    });
    this.logger.debug(
      `Audit log created: ${data.action} ${data.entityType} by ${data.adminId}`,
    );
  }

  private calculateChanges(
    oldData: any,
    newData: any,
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key in newData) {
      if (newData[key] !== undefined && newData[key] !== oldData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    }

    return changes;
  }
}
