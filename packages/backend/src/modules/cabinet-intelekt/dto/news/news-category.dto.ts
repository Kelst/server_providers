import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, MaxLength, Matches } from 'class-validator';

export class CreateNewsCategoryDto {
  @ApiProperty({ example: 'Новини компанії', description: 'Category name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Важливі новини та оновлення', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color code' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code (e.g., #FF5733)' })
  color?: string;

  @ApiPropertyOptional({ example: '📰', description: 'Icon name or emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: true, description: 'Is category active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNewsCategoryDto {
  @ApiPropertyOptional({ example: 'Новини компанії', description: 'Category name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Важливі новини та оновлення', description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color code' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code (e.g., #FF5733)' })
  color?: string;

  @ApiPropertyOptional({ example: '📰', description: 'Icon name or emoji' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: true, description: 'Is category active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class NewsCategoryResponseDto {
  @ApiProperty({ example: 'uuid', description: 'Category ID' })
  id: string;

  @ApiProperty({ example: 'Новини компанії', description: 'Category name' })
  name: string;

  @ApiProperty({ example: 'novini-kompanii', description: 'URL slug' })
  slug: string;

  @ApiPropertyOptional({ example: 'Важливі новини та оновлення', description: 'Category description' })
  description?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Hex color code' })
  color?: string;

  @ApiPropertyOptional({ example: '📰', description: 'Icon name or emoji' })
  icon?: string;

  @ApiProperty({ example: 0, description: 'Display order' })
  order: number;

  @ApiProperty({ example: true, description: 'Is category active' })
  isActive: boolean;

  @ApiProperty({ example: 10, description: 'Number of news in this category' })
  newsCount?: number;

  @ApiProperty({ example: '2025-01-15T10:00:00Z', description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00Z', description: 'Updated timestamp' })
  updatedAt: Date;
}
