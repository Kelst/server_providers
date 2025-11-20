import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CabinetIntelektService } from './cabinet-intelekt.service';
import {
  ProviderInfoResponseDto,
  CreateProviderInfoDto,
  UpdateProviderInfoDto,
  CreatePhoneDto,
  UpdatePhoneDto,
  CreateEmailDto,
  UpdateEmailDto,
  CreateSocialMediaDto,
  UpdateSocialMediaDto,
  AuditLogResponseDto,
} from './dto';
import { CreateVideoDto, UpdateVideoDto, VideoResponseDto } from './dto/video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Admin Cabinet Intelekt Controller
 * For admin panel with JWT authentication
 */
@ApiTags('admin/cabinet_intelekt')
@ApiBearerAuth('JWT-auth')
@Controller('admin/cabinet-intelekt')
@UseGuards(JwtAuthGuard)
export class CabinetIntelektAdminController {
  constructor(private readonly service: CabinetIntelektService) {}

  // ========================================
  // Provider Info Management
  // ========================================

  @Get()
  @ApiOperation({
    summary: 'Get provider information (Admin)',
    description: 'Retrieve complete provider information for admin panel',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider information retrieved successfully',
    type: ProviderInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider information not found' })
  async getProviderInfo(): Promise<ProviderInfoResponseDto> {
    return this.service.getProviderInfo();
  }

  @Post()
  @ApiOperation({
    summary: 'Create or update provider information',
    description:
      'Create new or update existing provider information. If provider info already exists, it will be updated.',
  })
  @ApiResponse({
    status: 201,
    description: 'Provider information created/updated successfully',
    type: ProviderInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upsertProviderInfo(
    @Body() dto: CreateProviderInfoDto,
    @Request() req,
  ): Promise<ProviderInfoResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.upsertProviderInfo(dto, adminId, ipAddress, userAgent);
  }

  @Patch()
  @ApiOperation({
    summary: 'Partially update provider information',
    description: 'Update specific fields of provider information',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider information updated successfully',
    type: ProviderInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider information not found' })
  async updateProviderInfo(
    @Body() dto: UpdateProviderInfoDto,
    @Request() req,
  ): Promise<ProviderInfoResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.updateProviderInfo(dto, adminId, ipAddress, userAgent);
  }

  @Post('logo')
  @ApiOperation({
    summary: 'Upload provider logo',
    description: 'Upload a logo image for the provider (PNG, JPG, JPEG only)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Logo image file (PNG, JPG, JPEG)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Logo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        logoUrl: { type: 'string', example: '/uploads/provider/logo.png' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/provider',
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadLogo(@UploadedFile() file: any, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    const logoUrl = `/uploads/provider/${file.filename}`;

    await this.service.updateLogoUrl(logoUrl, adminId, ipAddress, userAgent);

    return { logoUrl };
  }

  @Delete('logo')
  @ApiOperation({
    summary: 'Delete provider logo',
    description: 'Remove the provider logo',
  })
  @ApiResponse({
    status: 200,
    description: 'Logo deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider information not found' })
  async deleteLogo(@Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    await this.service.deleteLogo(adminId, ipAddress, userAgent);

    return { success: true };
  }

  // ========================================
  // Phone Numbers Management
  // ========================================

  @Post('phones')
  @ApiOperation({
    summary: 'Add phone number',
    description: 'Add a new phone number to provider information',
  })
  @ApiResponse({ status: 201, description: 'Phone number added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPhone(@Body() dto: CreatePhoneDto, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.createPhone(dto, adminId, ipAddress, userAgent);
  }

  @Put('phones/:id')
  @ApiOperation({
    summary: 'Update phone number',
    description: 'Update an existing phone number',
  })
  @ApiParam({ name: 'id', description: 'Phone ID' })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Phone number not found' })
  async updatePhone(
    @Param('id') id: string,
    @Body() dto: UpdatePhoneDto,
    @Request() req,
  ) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.updatePhone(id, dto, adminId, ipAddress, userAgent);
  }

  @Delete('phones/:id')
  @ApiOperation({
    summary: 'Delete phone number',
    description: 'Remove a phone number from provider information',
  })
  @ApiParam({ name: 'id', description: 'Phone ID' })
  @ApiResponse({
    status: 200,
    description: 'Phone number deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Phone number not found' })
  async deletePhone(@Param('id') id: string, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.deletePhone(id, adminId, ipAddress, userAgent);
  }

  // ========================================
  // Email Addresses Management
  // ========================================

  @Post('emails')
  @ApiOperation({
    summary: 'Add email address',
    description: 'Add a new email address to provider information',
  })
  @ApiResponse({ status: 201, description: 'Email address added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createEmail(@Body() dto: CreateEmailDto, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.createEmail(dto, adminId, ipAddress, userAgent);
  }

  @Put('emails/:id')
  @ApiOperation({
    summary: 'Update email address',
    description: 'Update an existing email address',
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({
    status: 200,
    description: 'Email address updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Email address not found' })
  async updateEmail(
    @Param('id') id: string,
    @Body() dto: UpdateEmailDto,
    @Request() req,
  ) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.updateEmail(id, dto, adminId, ipAddress, userAgent);
  }

  @Delete('emails/:id')
  @ApiOperation({
    summary: 'Delete email address',
    description: 'Remove an email address from provider information',
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({
    status: 200,
    description: 'Email address deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Email address not found' })
  async deleteEmail(@Param('id') id: string, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.deleteEmail(id, adminId, ipAddress, userAgent);
  }

  // ========================================
  // Social Media Management
  // ========================================

  @Post('social')
  @ApiOperation({
    summary: 'Add social media link',
    description: 'Add a new social media link to provider information',
  })
  @ApiResponse({
    status: 201,
    description: 'Social media link added successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSocialMedia(@Body() dto: CreateSocialMediaDto, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.createSocialMedia(dto, adminId, ipAddress, userAgent);
  }

  @Put('social/:id')
  @ApiOperation({
    summary: 'Update social media link',
    description: 'Update an existing social media link',
  })
  @ApiParam({ name: 'id', description: 'Social media ID' })
  @ApiResponse({
    status: 200,
    description: 'Social media link updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Social media link not found' })
  async updateSocialMedia(
    @Param('id') id: string,
    @Body() dto: UpdateSocialMediaDto,
    @Request() req,
  ) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.updateSocialMedia(
      id,
      dto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  @Delete('social/:id')
  @ApiOperation({
    summary: 'Delete social media link',
    description: 'Remove a social media link from provider information',
  })
  @ApiParam({ name: 'id', description: 'Social media ID' })
  @ApiResponse({
    status: 200,
    description: 'Social media link deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Social media link not found' })
  async deleteSocialMedia(@Param('id') id: string, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.deleteSocialMedia(id, adminId, ipAddress, userAgent);
  }

  // ========================================
  // Videos Management
  // ========================================

  @Post('videos')
  @ApiOperation({
    summary: 'Upload video',
    description: 'Upload a new video for the provider with metadata and automatic thumbnail generation',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (MP4, MOV, AVI, MKV) - max 200MB',
        },
        title: {
          type: 'string',
          example: 'Огляд послуг компанії',
          description: 'Video title',
        },
        description: {
          type: 'string',
          example: 'Детальний огляд наших послуг та можливостей',
          description: 'Video description',
        },
        order: {
          type: 'number',
          example: 0,
          description: 'Display order',
        },
        isActive: {
          type: 'boolean',
          example: true,
          description: 'Is video active',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or missing data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/videos',
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(mp4|mov|avi|mkv)$/i)) {
          return callback(
            new BadRequestException('Only video files are allowed (MP4, MOV, AVI, MKV)'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('order') order: string,
    @Body('isActive') isActive: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!title) {
      throw new BadRequestException('Title is required');
    }

    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    const dto: CreateVideoDto = {
      title,
      description: description || undefined,
      order: order ? parseInt(order, 10) : 0,
      isActive: isActive === 'true' || isActive === '1' || isActive === undefined,
    };

    return this.service.uploadVideo(file, dto, adminId, ipAddress, userAgent);
  }

  @Get('videos')
  @ApiOperation({
    summary: 'Get all videos',
    description: 'Retrieve all provider videos (including inactive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
    type: [VideoResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVideos(): Promise<VideoResponseDto[]> {
    return this.service.getVideos(true); // Include inactive for admin
  }

  @Get('videos/:id')
  @ApiOperation({
    summary: 'Get video by ID',
    description: 'Retrieve a specific video by ID',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video retrieved successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVideo(@Param('id') id: string): Promise<VideoResponseDto> {
    return this.service.getVideo(id);
  }

  @Patch('videos/:id')
  @ApiOperation({
    summary: 'Update video metadata',
    description: 'Update video title, description, order, or active status',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video updated successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateVideo(
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
    @Request() req,
  ): Promise<VideoResponseDto> {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    return this.service.updateVideo(id, dto, adminId, ipAddress, userAgent);
  }

  @Delete('videos/:id')
  @ApiOperation({
    summary: 'Delete video',
    description: 'Delete a video and its associated files (video file and thumbnail)',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video deleted successfully',
    schema: { type: 'object', properties: { message: { type: 'string' } } },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteVideo(@Param('id') id: string, @Request() req) {
    const adminId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    await this.service.deleteVideo(id, adminId, ipAddress, userAgent);

    return { message: 'Video deleted successfully' };
  }

  // ========================================
  // Audit Logs
  // ========================================

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve history of all changes to provider information',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of logs to retrieve (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAuditLogs(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.service.getAuditLogs(limit);
  }

  // ========================================
  // News Categories Management
  // ========================================

  @Get('news-categories')
  @ApiOperation({
    summary: 'Get all news categories',
    description: 'Retrieve all news categories with news count',
  })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNewsCategories() {
    return this.service.getNewsCategories();
  }

  @Get('news-categories/:id')
  @ApiOperation({
    summary: 'Get news category by ID',
    description: 'Retrieve single news category details',
  })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getNewsCategoryById(@Param('id') id: string) {
    return this.service.getNewsCategoryById(id);
  }

  @Post('news-categories')
  @ApiOperation({
    summary: 'Create news category',
    description: 'Create a new news category',
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  async createNewsCategory(@Body() createDto: any) {
    return this.service.createNewsCategory(createDto);
  }

  @Put('news-categories/:id')
  @ApiOperation({
    summary: 'Update news category',
    description: 'Update existing news category',
  })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateNewsCategory(
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.service.updateNewsCategory(id, updateDto);
  }

  @Delete('news-categories/:id')
  @ApiOperation({
    summary: 'Delete news category',
    description: 'Delete news category (only if no news exist in it)',
  })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category contains news articles' })
  async deleteNewsCategory(@Param('id') id: string) {
    await this.service.deleteNewsCategory(id);
    return { message: 'Category deleted successfully' };
  }

  // ========================================
  // News Management
  // ========================================

  @Get('news')
  @ApiOperation({
    summary: 'Get news list (admin)',
    description: 'Retrieve paginated news list with filters (includes unpublished)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'News list retrieved successfully' })
  async getNewsList(@Query() query: any) {
    return this.service.getNewsList({ ...query, includeUnpublished: true });
  }

  @Get('news/:id')
  @ApiOperation({
    summary: 'Get news by ID (admin)',
    description: 'Retrieve single news article (includes unpublished)',
  })
  @ApiResponse({ status: 200, description: 'News retrieved successfully' })
  @ApiResponse({ status: 404, description: 'News not found' })
  async getNewsById(@Param('id') id: string) {
    return this.service.getNewsById(id, true);
  }

  @Post('news')
  @ApiOperation({
    summary: 'Create news article',
    description: 'Create new news article',
  })
  @ApiResponse({ status: 201, description: 'News created successfully' })
  async createNews(
    @Body() createDto: any,
    @Request() req,
  ) {
    return this.service.createNews(createDto, req.user.id);
  }

  @Put('news/:id')
  @ApiOperation({
    summary: 'Update news article',
    description: 'Update existing news article',
  })
  @ApiResponse({ status: 200, description: 'News updated successfully' })
  @ApiResponse({ status: 404, description: 'News not found' })
  async updateNews(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Request() req,
  ) {
    return this.service.updateNews(id, updateDto, req.user.id);
  }

  @Delete('news/:id')
  @ApiOperation({
    summary: 'Delete news article',
    description: 'Delete news article permanently',
  })
  @ApiResponse({ status: 200, description: 'News deleted successfully' })
  @ApiResponse({ status: 404, description: 'News not found' })
  async deleteNews(
    @Param('id') id: string,
    @Request() req,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    await this.service.deleteNews(id, req.user.id, ipAddress);
    return { message: 'News deleted successfully' };
  }

  @Post('news/:id/cover')
  @ApiOperation({
    summary: 'Upload news cover image',
    description: 'Upload or replace cover image for news article',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cover image uploaded successfully' })
  @ApiResponse({ status: 404, description: 'News not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/news',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          callback(null, `cover-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed (JPG, PNG, WebP)'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadNewsCoverImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Request() req,
  ) {
    return this.service.uploadNewsCoverImage(id, file, req.user.id);
  }

  @Delete('news/:id/cover')
  @ApiOperation({
    summary: 'Delete news cover image',
    description: 'Remove cover image from news article',
  })
  @ApiResponse({ status: 200, description: 'Cover image deleted successfully' })
  @ApiResponse({ status: 404, description: 'News or cover image not found' })
  async deleteNewsCoverImage(
    @Param('id') id: string,
    @Request() req,
  ) {
    await this.service.deleteNewsCoverImage(id, req.user.id);
    return { message: 'Cover image deleted successfully' };
  }
}
