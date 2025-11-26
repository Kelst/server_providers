import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import {
  CreateProviderInfoDto,
  UpdateProviderInfoDto,
  ProviderInfoResponseDto,
  ProviderContactsResponseDto,
  ProviderCompanyResponseDto,
  CreatePhoneDto,
  UpdatePhoneDto,
  CreateEmailDto,
  UpdateEmailDto,
  CreateSocialMediaDto,
  UpdateSocialMediaDto,
  AuditLogResponseDto,
  CreateConnectionRequestDto,
  UpdateConnectionRequestDto,
  ConnectionRequestResponseDto,
  ConnectionRequestListQueryDto,
  ConnectionRequestListResponseDto,
  TelegramSettingsDto,
  CreateAppealDto,
  AppealResponseDto,
} from './dto';
import { CreateVideoDto, UpdateVideoDto, VideoResponseDto } from './dto/video.dto';
import {
  generateThumbnail,
  getVideoMetadata,
  isValidVideoFormat,
} from './utils/video.util';
import * as fs from 'fs';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as path from 'path';
import { TelegramService } from './services/telegram.service';

@Injectable()
export class CabinetIntelektService {
  private readonly logger = new Logger(CabinetIntelektService.name);

  // Redis key prefix for appeal cooldown
  private readonly APPEAL_COOLDOWN_PREFIX = 'appeal:cooldown:';
  private readonly APPEAL_COOLDOWN_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly cacheService: CacheService,
  ) {}

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
        videos: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider information not found');
    }

    return provider as ProviderInfoResponseDto;
  }

  /**
   * Get provider contacts only (public method for mobile apps)
   */
  async getProviderContacts(): Promise<ProviderContactsResponseDto> {
    this.logger.debug('Fetching provider contacts');

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

    return {
      phones: provider.phones,
      emails: provider.emails,
      socialMedia: provider.socialMedia,
    } as ProviderContactsResponseDto;
  }

  /**
   * Get provider company info only (public method for mobile apps)
   */
  async getProviderCompany(): Promise<ProviderCompanyResponseDto> {
    this.logger.debug('Fetching provider company info');

    const provider = await this.prisma.providerInfo.findFirst({
      select: {
        id: true,
        companyName: true,
        description: true,
        logoUrl: true,
        website: true,
        telegramBot: true,
        workingHours: true,
        addressStreet: true,
        addressCity: true,
        addressPostal: true,
        addressCountry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider information not found');
    }

    return provider as ProviderCompanyResponseDto;
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
  // Videos CRUD
  // ========================================

  async uploadVideo(
    file: any,
    dto: CreateVideoDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<VideoResponseDto> {
    this.logger.debug('Uploading video');

    // Validate video format
    if (!isValidVideoFormat(file.mimetype)) {
      throw new BadRequestException(
        'Invalid video format. Supported formats: MP4, MOV, AVI, MKV',
      );
    }

    const provider = await this.ensureProviderExists();

    // Get video metadata
    const metadata = await getVideoMetadata(file.path);

    // Generate thumbnail
    const thumbnailFilename = `${path.basename(file.filename, path.extname(file.filename))}.jpg`;
    const thumbnailPath = path.join(
      path.dirname(file.path),
      'thumbnails',
      thumbnailFilename,
    );

    try {
      await generateThumbnail(file.path, thumbnailPath);
    } catch (error) {
      this.logger.warn(`Failed to generate thumbnail: ${error.message}`);
      // Continue without thumbnail
    }

    const videoUrl = `/uploads/videos/${file.filename}`;
    const thumbnailUrl = fs.existsSync(thumbnailPath)
      ? `/uploads/videos/thumbnails/${thumbnailFilename}`
      : null;

    // Create video record
    const video = await this.prisma.providerVideo.create({
      data: {
        providerId: provider.id,
        title: dto.title,
        description: dto.description,
        videoUrl,
        thumbnailUrl,
        fileSize: file.size,
        duration: metadata.duration ? Math.round(metadata.duration) : null,
        mimeType: file.mimetype,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });

    // Create audit log
    await this.createAuditLog({
      providerId: provider.id,
      adminId,
      action: 'video_uploaded',
      entityType: 'video',
      entityId: video.id,
      changes: { created: dto, fileSize: file.size, mimeType: file.mimetype },
      ipAddress,
      userAgent,
    });

    return video as VideoResponseDto;
  }

  async getVideos(includeInactive: boolean = false): Promise<VideoResponseDto[]> {
    this.logger.debug('Fetching videos');

    const provider = await this.ensureProviderExists();

    const where = includeInactive
      ? { providerId: provider.id }
      : { providerId: provider.id, isActive: true };

    const videos = await this.prisma.providerVideo.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return videos as VideoResponseDto[];
  }

  async getVideo(id: string): Promise<VideoResponseDto> {
    this.logger.debug(`Fetching video: ${id}`);

    const video = await this.prisma.providerVideo.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video as VideoResponseDto;
  }

  async updateVideo(
    id: string,
    dto: UpdateVideoDto,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<VideoResponseDto> {
    this.logger.debug(`Updating video: ${id}`);

    const existing = await this.prisma.providerVideo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Video not found');
    }

    const changes = this.calculateChanges(existing, dto);

    const video = await this.prisma.providerVideo.update({
      where: { id },
      data: dto,
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'video_updated',
      entityType: 'video',
      entityId: id,
      changes,
      ipAddress,
      userAgent,
    });

    return video as VideoResponseDto;
  }

  async deleteVideo(
    id: string,
    adminId: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    this.logger.debug(`Deleting video: ${id}`);

    const existing = await this.prisma.providerVideo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Video not found');
    }

    // Delete video file
    if (existing.videoUrl) {
      const videoPath = path.join(process.cwd(), existing.videoUrl);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        this.logger.debug(`Deleted video file: ${videoPath}`);
      }
    }

    // Delete thumbnail file
    if (existing.thumbnailUrl) {
      const thumbnailPath = path.join(process.cwd(), existing.thumbnailUrl);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        this.logger.debug(`Deleted thumbnail file: ${thumbnailPath}`);
      }
    }

    await this.prisma.providerVideo.delete({
      where: { id },
    });

    await this.createAuditLog({
      providerId: existing.providerId,
      adminId,
      action: 'video_deleted',
      entityType: 'video',
      entityId: id,
      changes: { deleted: { title: existing.title, videoUrl: existing.videoUrl } },
      ipAddress,
      userAgent,
    });

    this.logger.debug(`Video deleted: ${id}`);
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

  // ==============================
  // NEWS CATEGORY METHODS
  // ==============================

  /**
   * Get all news categories
   */
  async getNewsCategories() {
    const categories = await this.prisma.newsCategory.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { news: true },
        },
      },
    });

    return categories.map((category) => ({
      ...category,
      newsCount: category._count.news,
      _count: undefined,
    }));
  }

  /**
   * Get news category by ID
   */
  async getNewsCategoryById(id: string) {
    const category = await this.prisma.newsCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { news: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`News category with ID ${id} not found`);
    }

    return {
      ...category,
      newsCount: category._count.news,
      _count: undefined,
    };
  }

  /**
   * Create news category (admin only)
   */
  async createNewsCategory(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    order?: number;
    isActive?: boolean;
  }) {
    const { generateSlug } = await import('./utils/slug.utils');
    const slug = generateSlug(data.name);

    // Check if slug already exists
    const existing = await this.prisma.newsCategory.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug "${slug}" already exists`,
      );
    }

    return this.prisma.newsCategory.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  /**
   * Update news category (admin only)
   */
  async updateNewsCategory(id: string, data: any) {
    const { generateSlug } = await import('./utils/slug.utils');

    // Check if category exists
    const category = await this.prisma.newsCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`News category with ID ${id} not found`);
    }

    // If name is being updated, regenerate slug
    let slug: string | undefined;
    if (data.name && data.name !== category.name) {
      slug = generateSlug(data.name);

      // Check if new slug conflicts with another category
      const existing = await this.prisma.newsCategory.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Category with slug "${slug}" already exists`,
        );
      }
    }

    return this.prisma.newsCategory.update({
      where: { id },
      data: {
        ...data,
        ...(slug && { slug }),
      },
    });
  }

  /**
   * Delete news category (admin only)
   */
  async deleteNewsCategory(id: string) {
    // Check if category exists and has news
    const category = await this.prisma.newsCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { news: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`News category with ID ${id} not found`);
    }

    if (category._count.news > 0) {
      throw new ConflictException(
        `Cannot delete category with ${category._count.news} news articles. Reassign or delete the news first.`,
      );
    }

    await this.prisma.newsCategory.delete({ where: { id } });
  }

  // ==============================
  // NEWS METHODS
  // ==============================

  /**
   * Get news list with pagination and filters
   */
  async getNewsList(query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    status?: any;
    search?: string;
    tag?: string;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeUnpublished?: boolean;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Build where clause
    const where: any = {};

    // Default: only published news for public API
    if (!query.includeUnpublished) {
      where.status = 'PUBLISHED';
      where.publishedAt = { lte: new Date() };
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.featured) {
      where.isFeatured = true;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await this.prisma.news.count({ where });

    // Get news with relations
    const news = await this.prisma.news.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        // Pinned news first
        { isPinned: 'desc' },
        // Then by selected field
        { [sortBy]: sortOrder },
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      data: news,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get news by ID
   */
  async getNewsById(id: string, includeUnpublished: boolean = false) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }

    // Check if news is published (for public API)
    if (!includeUnpublished && news.status !== 'PUBLISHED') {
      throw new NotFoundException(`News with ID ${id} not found`);
    }

    return news;
  }

  /**
   * Get news by slug
   */
  async getNewsBySlug(slug: string, includeUnpublished: boolean = false) {
    const news = await this.prisma.news.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException(`News with slug "${slug}" not found`);
    }

    // Check if news is published (for public API)
    if (!includeUnpublished && news.status !== 'PUBLISHED') {
      throw new NotFoundException(`News with slug "${slug}" not found`);
    }

    return news;
  }

  /**
   * Increment news view count
   */
  async incrementNewsViews(id: string) {
    await this.prisma.news.update({
      where: { id },
      data: {
        viewsCount: { increment: 1 },
      },
    });
  }

  /**
   * Create news (admin only)
   */
  async createNews(
    data: {
      title: string;
      excerpt?: string;
      content: string;
      categoryId?: string;
      tags?: string[];
      isFeatured?: boolean;
      isPinned?: boolean;
      status?: any;
      scheduledFor?: string;
    },
    authorId: string,
  ) {
    const { generateSlug, generateUniqueSlug } = await import(
      './utils/slug.utils'
    );

    // Generate base slug
    const baseSlug = generateSlug(data.title);

    // Get existing slugs
    const existingNews = await this.prisma.news.findMany({
      select: { slug: true },
    });
    const existingSlugs = existingNews.map((n) => n.slug);

    // Generate unique slug
    const slug = generateUniqueSlug(baseSlug, existingSlugs);

    // Set publishedAt if status is PUBLISHED
    const publishedAt =
      data.status === 'PUBLISHED' ? new Date() : null;

    return this.prisma.news.create({
      data: {
        ...data,
        slug,
        authorId,
        publishedAt,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
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
   * Update news (admin only)
   */
  async updateNews(id: string, data: any, adminId: string) {
    const { generateSlug, generateUniqueSlug } = await import(
      './utils/slug.utils'
    );

    // Check if news exists
    const news = await this.prisma.news.findUnique({ where: { id } });

    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }

    // Track changes for audit log
    const changes = this.calculateChanges(news, data);

    // If title is being updated, regenerate slug
    let slug: string | undefined;
    if (data.title && data.title !== news.title) {
      const baseSlug = generateSlug(data.title);

      // Get existing slugs (excluding current news)
      const existingNews = await this.prisma.news.findMany({
        where: { id: { not: id } },
        select: { slug: true },
      });
      const existingSlugs = existingNews.map((n) => n.slug);

      slug = generateUniqueSlug(baseSlug, existingSlugs);
    }

    // Handle status changes
    let publishedAt = news.publishedAt;
    if (data.status === 'PUBLISHED' && news.status !== 'PUBLISHED') {
      publishedAt = new Date();
    } else if (data.status !== 'PUBLISHED' && news.status === 'PUBLISHED') {
      publishedAt = null;
    }

    const updatedNews = await this.prisma.news.update({
      where: { id },
      data: {
        ...data,
        ...(slug && { slug }),
        publishedAt,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    if (Object.keys(changes).length > 0) {
      await this.createNewsAuditLog({
        newsId: id,
        adminId,
        action: 'updated',
        changes,
        ipAddress: '0.0.0.0', // Will be set by controller
        userAgent: undefined,
      });
    }

    return updatedNews;
  }

  /**
   * Delete news (admin only)
   */
  async deleteNews(id: string, adminId: string, ipAddress: string) {
    const news = await this.prisma.news.findUnique({ where: { id } });

    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }

    // Create audit log before deletion
    await this.createNewsAuditLog({
      newsId: id,
      adminId,
      action: 'deleted',
      changes: { deleted: { old: news, new: null } },
      ipAddress,
      userAgent: undefined,
    });

    await this.prisma.news.delete({ where: { id } });
  }

  /**
   * Upload news cover image (admin only)
   */
  async uploadNewsCoverImage(newsId: string, file: any, adminId: string) {
    const news = await this.prisma.news.findUnique({ where: { id: newsId } });

    if (!news) {
      throw new NotFoundException(`News with ID ${newsId} not found`);
    }

    // Delete old cover image if exists
    if (news.coverImageUrl) {
      const oldPath = join(process.cwd(), news.coverImageUrl);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    const coverImageUrl = `/uploads/news/${file.filename}`;

    const updatedNews = await this.prisma.news.update({
      where: { id: newsId },
      data: { coverImageUrl },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await this.createNewsAuditLog({
      newsId,
      adminId,
      action: 'cover_uploaded',
      changes: {
        coverImageUrl: { old: news.coverImageUrl, new: coverImageUrl },
      },
      ipAddress: '0.0.0.0',
      userAgent: undefined,
    });

    return updatedNews;
  }

  /**
   * Delete news cover image (admin only)
   */
  async deleteNewsCoverImage(newsId: string, adminId: string) {
    const news = await this.prisma.news.findUnique({ where: { id: newsId } });

    if (!news) {
      throw new NotFoundException(`News with ID ${newsId} not found`);
    }

    if (!news.coverImageUrl) {
      throw new NotFoundException(`News has no cover image`);
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), news.coverImageUrl);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    const updatedNews = await this.prisma.news.update({
      where: { id: newsId },
      data: { coverImageUrl: null },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await this.createNewsAuditLog({
      newsId,
      adminId,
      action: 'cover_deleted',
      changes: {
        coverImageUrl: { old: news.coverImageUrl, new: null },
      },
      ipAddress: '0.0.0.0',
      userAgent: undefined,
    });

    return updatedNews;
  }

  /**
   * Create news audit log entry
   */
  private async createNewsAuditLog(data: {
    newsId: string;
    adminId: string;
    action: string;
    changes: any;
    ipAddress: string;
    userAgent?: string;
  }) {
    await this.prisma.newsAuditLog.create({
      data,
    });
    this.logger.debug(
      `News audit log created: ${data.action} for news ${data.newsId} by ${data.adminId}`,
    );
  }

  // ==================== CONNECTION REQUESTS ====================

  /**
   * Create connection request (public API)
   */
  async createConnectionRequest(
    data: CreateConnectionRequestDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<ConnectionRequestResponseDto> {
    this.logger.debug(`Creating connection request from ${data.fullName}`);

    // Normalize phone number to +380XXXXXXXXX format
    const { normalizePhoneNumber } = await import('./utils/phone.utils');
    const normalizedPhone = normalizePhoneNumber(data.phoneNumber);

    // Check for any request within last 24 hours (cooldown period)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentRequest = await this.prisma.connectionRequest.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentRequest) {
      const hoursLeft = Math.ceil(
        (recentRequest.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) /
          (1000 * 60 * 60),
      );
      throw new HttpException(
        `Ви вже залишали заявку. Спробуйте через ${hoursLeft} год.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const request = await this.prisma.connectionRequest.create({
      data: {
        fullName: data.fullName,
        phoneNumber: normalizedPhone,
        comment: data.comment,
        ipAddress,
        userAgent,
      },
    });

    // Send Telegram notification
    try {
      const providerInfo = await this.prisma.providerInfo.findFirst();
      if (
        providerInfo?.telegramNotificationsEnabled &&
        providerInfo.telegramBotToken &&
        providerInfo.telegramChatId
      ) {
        await this.telegramService.sendConnectionRequestNotification(
          providerInfo.telegramBotToken,
          providerInfo.telegramChatId,
          request,
        );
        await this.prisma.connectionRequest.update({
          where: { id: request.id },
          data: {
            telegramSent: true,
            telegramSentAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send Telegram notification: ${error.message}`);
    }

    return request;
  }

  /**
   * Get connection requests list (admin API)
   */
  async getConnectionRequests(
    query: ConnectionRequestListQueryDto,
  ): Promise<ConnectionRequestListResponseDto> {
    const { search, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const page = parseInt(query.page as any) || 1;
    const limit = parseInt(query.limit as any) || 20;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [requests, total] = await Promise.all([
      this.prisma.connectionRequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.connectionRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get connection request by ID (admin API)
   */
  async getConnectionRequestById(id: string): Promise<ConnectionRequestResponseDto> {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Connection request with ID ${id} not found`);
    }

    return request;
  }

  /**
   * Update connection request (admin API)
   */
  async updateConnectionRequest(
    id: string,
    data: UpdateConnectionRequestDto,
    adminId: string,
  ): Promise<ConnectionRequestResponseDto> {
    const request = await this.prisma.connectionRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Connection request with ID ${id} not found`);
    }

    const updated = await this.prisma.connectionRequest.update({
      where: { id },
      data: data,
    });

    this.logger.debug(`Connection request ${id} updated by admin ${adminId}`);
    return updated;
  }

  /**
   * Delete connection request (admin API)
   */
  async deleteConnectionRequest(id: string): Promise<void> {
    const request = await this.prisma.connectionRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Connection request with ID ${id} not found`);
    }

    await this.prisma.connectionRequest.delete({ where: { id } });
    this.logger.debug(`Connection request ${id} deleted`);
  }

  // ==================== TELEGRAM SETTINGS ====================

  /**
   * Get Telegram settings
   */
  async getTelegramSettings(): Promise<TelegramSettingsDto> {
    const providerInfo = await this.prisma.providerInfo.findFirst();

    if (!providerInfo) {
      return {
        telegramBotToken: undefined,
        telegramChatId: undefined,
        telegramNotificationsEnabled: false,
        appealsTelegramChatId: undefined,
        appealsTelegramEnabled: false,
      };
    }

    return {
      telegramBotToken: providerInfo.telegramBotToken || undefined,
      telegramChatId: providerInfo.telegramChatId || undefined,
      telegramNotificationsEnabled: providerInfo.telegramNotificationsEnabled,
      appealsTelegramChatId: providerInfo.appealsTelegramChatId || undefined,
      appealsTelegramEnabled: providerInfo.appealsTelegramEnabled,
    };
  }

  /**
   * Update Telegram settings
   */
  async updateTelegramSettings(data: TelegramSettingsDto): Promise<TelegramSettingsDto> {
    const providerInfo = await this.prisma.providerInfo.findFirst();

    if (!providerInfo) {
      throw new NotFoundException('Provider info not found. Create provider info first.');
    }

    const updated = await this.prisma.providerInfo.update({
      where: { id: providerInfo.id },
      data: {
        telegramBotToken: data.telegramBotToken,
        telegramChatId: data.telegramChatId,
        telegramNotificationsEnabled: data.telegramNotificationsEnabled ?? false,
        appealsTelegramChatId: data.appealsTelegramChatId,
        appealsTelegramEnabled: data.appealsTelegramEnabled ?? false,
      },
    });

    this.logger.debug('Telegram settings updated');

    return {
      telegramBotToken: updated.telegramBotToken || undefined,
      telegramChatId: updated.telegramChatId || undefined,
      telegramNotificationsEnabled: updated.telegramNotificationsEnabled,
      appealsTelegramChatId: updated.appealsTelegramChatId || undefined,
      appealsTelegramEnabled: updated.appealsTelegramEnabled,
    };
  }

  /**
   * Test Telegram settings
   */
  async testTelegramSettings(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    return await this.telegramService.testTelegramConnection(botToken, chatId);
  }

  /**
   * Test Appeals Telegram settings
   */
  async testAppealsSettings(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    return await this.telegramService.testAppealsConnection(botToken, chatId);
  }

  // ==================== APPEALS ====================

  /**
   * Submit user appeal (send to Telegram without saving to DB)
   */
  async submitAppeal(
    data: CreateAppealDto,
    ipAddress: string,
  ): Promise<AppealResponseDto> {
    this.logger.debug(`Processing appeal from phone ${data.phoneNumber}`);

    // Normalize phone number to +380XXXXXXXXX format
    const { normalizePhoneNumber } = await import('./utils/phone.utils');
    const normalizedPhone = normalizePhoneNumber(data.phoneNumber);

    // Check phone cooldown in Redis
    const cooldownKey = `${this.APPEAL_COOLDOWN_PREFIX}${normalizedPhone}`;
    const existingCooldown = await this.cacheService.get<boolean>(cooldownKey);

    if (existingCooldown) {
      const ttl = await this.cacheService.ttl(cooldownKey);
      const minutesLeft = Math.ceil(ttl / 60);
      throw new HttpException(
        `Ви вже відправляли звернення. Спробуйте через ${minutesLeft} хв.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get provider info for Telegram settings
    const providerInfo = await this.prisma.providerInfo.findFirst();

    if (!providerInfo) {
      throw new BadRequestException('Сервіс тимчасово недоступний. Спробуйте пізніше.');
    }

    if (!providerInfo.appealsTelegramEnabled) {
      throw new BadRequestException('Прийом звернень тимчасово недоступний.');
    }

    if (!providerInfo.telegramBotToken || !providerInfo.appealsTelegramChatId) {
      this.logger.error('Appeals Telegram settings not configured');
      throw new BadRequestException('Сервіс тимчасово недоступний. Спробуйте пізніше.');
    }

    // Send to Telegram
    try {
      await this.telegramService.sendAppealNotification(
        providerInfo.telegramBotToken,
        providerInfo.appealsTelegramChatId,
        {
          phoneNumber: normalizedPhone,
          message: data.message,
          ipAddress,
        },
      );

      // Set cooldown in Redis (1 hour)
      await this.cacheService.set(cooldownKey, true, this.APPEAL_COOLDOWN_TTL);

      this.logger.log(`Appeal sent successfully for phone ${normalizedPhone}`);

      return {
        success: true,
        message: 'Ваше звернення успішно відправлено. Ми зв\'яжемося з вами найближчим часом.',
      };
    } catch (error) {
      this.logger.error(`Failed to send appeal: ${error.message}`, error.stack);
      throw new BadRequestException('Не вдалося відправити звернення. Спробуйте пізніше.');
    }
  }
}
