import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CabinetIntelektService } from './cabinet-intelekt.service';
import {
  ProviderInfoResponseDto,
  VideoResponseDto,
  NewsResponseDto,
  NewsListResponseDto,
  NewsCategoryResponseDto,
} from './dto';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { EndpointAccessGuard } from '../../common/guards/endpoint-access.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { ApiScope } from '../../common/constants/scopes.constants';

/**
 * Public Cabinet Intelekt Controller
 * For mobile apps with API Token authentication
 */
@ApiTags('cabinet_intelekt')
@ApiBearerAuth('API-token')
@Controller('cabinet-intelekt')
@UseGuards(ApiTokenGuard, RateLimitGuard, ScopeGuard, EndpointAccessGuard)
@RequireScopes(ApiScope.CABINET_INTELEKT)
export class CabinetIntelektController {
  constructor(private readonly service: CabinetIntelektService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get provider information',
    description:
      'Retrieve complete provider information including company details, contact information, and social media links. This endpoint is intended for mobile applications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider information retrieved successfully',
    type: ProviderInfoResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 404, description: 'Provider information not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getProviderInfo(): Promise<ProviderInfoResponseDto> {
    return this.service.getProviderInfo();
  }

  @Get('videos')
  @ApiOperation({
    summary: 'Get provider videos',
    description:
      'Retrieve all active provider videos. Videos are sorted by display order. This endpoint is intended for mobile applications to display promotional videos.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive videos (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
    type: [VideoResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getVideos(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<VideoResponseDto[]> {
    const include = includeInactive === 'true';
    return this.service.getVideos(include);
  }

  @Get('news-categories')
  @ApiOperation({
    summary: 'Get news categories',
    description:
      'Retrieve all active news categories. This endpoint is intended for mobile applications.',
  })
  @ApiResponse({
    status: 200,
    description: 'News categories retrieved successfully',
    type: [NewsCategoryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getNewsCategories(): Promise<NewsCategoryResponseDto[]> {
    return this.service.getNewsCategories();
  }

  @Get('news')
  @ApiOperation({
    summary: 'Get published news',
    description:
      'Retrieve paginated list of published news. Pinned news appear first. Supports filtering by category, tags, search, and featured status. This endpoint is intended for mobile applications.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category ID',
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    type: String,
    description: 'Filter by tag',
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'Only featured news (default: false)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in title, excerpt, and content',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'News list retrieved successfully',
    type: NewsListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getNews(@Query() query: any): Promise<NewsListResponseDto> {
    return this.service.getNewsList({ ...query, includeUnpublished: false });
  }

  @Get('news/slug/:slug')
  @ApiOperation({
    summary: 'Get news by slug',
    description:
      'Retrieve single published news article by slug and increment view count. This endpoint is intended for mobile applications.',
  })
  @ApiResponse({
    status: 200,
    description: 'News retrieved successfully',
    type: NewsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 404, description: 'News not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getNewsBySlug(@Param('slug') slug: string): Promise<NewsResponseDto> {
    const news = await this.service.getNewsBySlug(slug, false);
    // Increment view count asynchronously
    this.service.incrementNewsViews(news.id).catch((err) => {
      // Log error but don't fail the request
      console.error('Failed to increment news views:', err);
    });
    return news;
  }

  @Get('news/:id')
  @ApiOperation({
    summary: 'Get news by ID',
    description:
      'Retrieve single published news article by ID and increment view count. This endpoint is intended for mobile applications.',
  })
  @ApiResponse({
    status: 200,
    description: 'News retrieved successfully',
    type: NewsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing API token' })
  @ApiResponse({ status: 403, description: 'API token missing required scope' })
  @ApiResponse({ status: 404, description: 'News not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async getNewsById(@Param('id') id: string): Promise<NewsResponseDto> {
    const news = await this.service.getNewsById(id, false);
    // Increment view count asynchronously
    this.service.incrementNewsViews(id).catch((err) => {
      // Log error but don't fail the request
      console.error('Failed to increment news views:', err);
    });
    return news;
  }
}
