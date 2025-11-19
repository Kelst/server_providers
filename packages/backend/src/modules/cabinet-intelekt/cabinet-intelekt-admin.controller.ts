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
}
