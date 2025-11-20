import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { NewsStatus } from '@prisma/client';

export class CreateNewsDto {
  @ApiProperty({ example: 'Нові тарифні плани 2025', description: 'News title' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Короткий опис новини для попереднього перегляду',
    description: 'Short summary',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({
    example: '<p>Повний текст новини з HTML форматуванням</p>',
    description: 'HTML content',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: ['новини', 'тарифи', '2025'],
    description: 'Array of tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false, description: 'Featured news' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Pinned to top' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    example: 'DRAFT',
    enum: NewsStatus,
    description: 'Publication status',
  })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({
    example: '2025-01-20T10:00:00Z',
    description: 'Scheduled publish time',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class UpdateNewsDto {
  @ApiPropertyOptional({ example: 'Нові тарифні плани 2025', description: 'News title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Короткий опис новини для попереднього перегляду',
    description: 'Short summary',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({
    example: '<p>Повний текст новини з HTML форматуванням</p>',
    description: 'HTML content',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: ['новини', 'тарифи', '2025'],
    description: 'Array of tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false, description: 'Featured news' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Pinned to top' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    example: 'DRAFT',
    enum: NewsStatus,
    description: 'Publication status',
  })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({
    example: '2025-01-20T10:00:00Z',
    description: 'Scheduled publish time',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class NewsResponseDto {
  @ApiProperty({ example: 'uuid', description: 'News ID' })
  id: string;

  @ApiProperty({ example: 'Нові тарифні плани 2025', description: 'News title' })
  title: string;

  @ApiProperty({ example: 'novi-tarifni-plani-2025', description: 'URL slug' })
  slug: string;

  @ApiPropertyOptional({
    example: 'Короткий опис новини для попереднього перегляду',
    description: 'Short summary',
  })
  excerpt?: string;

  @ApiProperty({
    example: '<p>Повний текст новини з HTML форматуванням</p>',
    description: 'HTML content',
  })
  content: string;

  @ApiPropertyOptional({ example: '/uploads/news/cover.jpg', description: 'Cover image URL' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'Category details' })
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
  };

  @ApiProperty({ example: 'uuid', description: 'Author ID' })
  authorId: string;

  @ApiPropertyOptional({ description: 'Author details' })
  author?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };

  @ApiProperty({ example: 'PUBLISHED', enum: NewsStatus, description: 'Publication status' })
  status: NewsStatus;

  @ApiProperty({
    example: ['новини', 'тарифи', '2025'],
    description: 'Array of tags',
  })
  tags: string[];

  @ApiProperty({ example: false, description: 'Featured news' })
  isFeatured: boolean;

  @ApiProperty({ example: false, description: 'Pinned to top' })
  isPinned: boolean;

  @ApiProperty({ example: 125, description: 'Number of views' })
  viewsCount: number;

  @ApiPropertyOptional({
    example: '2025-01-15T10:00:00Z',
    description: 'Published timestamp',
  })
  publishedAt?: Date;

  @ApiPropertyOptional({
    example: '2025-01-20T10:00:00Z',
    description: 'Scheduled publish time',
  })
  scheduledFor?: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00Z', description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00Z', description: 'Updated timestamp' })
  updatedAt: Date;
}

export class NewsListQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'PUBLISHED',
    enum: NewsStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;

  @ApiPropertyOptional({ example: 'новини', description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'тарифи', description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ example: true, description: 'Only featured news' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', description: 'Sort order', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class NewsListResponseDto {
  @ApiProperty({ type: [NewsResponseDto], description: 'Array of news' })
  data: NewsResponseDto[];

  @ApiProperty({ example: 100, description: 'Total count' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  totalPages: number;
}
