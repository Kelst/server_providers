import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Огляд послуг компанії',
    maxLength: 200,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Детальний огляд наших послуг та можливостей',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Display order',
    example: 0,
    required: false,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: 'Is video active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVideoDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Огляд послуг компанії',
    maxLength: 200,
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Детальний огляд наших послуг та можливостей',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Display order',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: 'Is video active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class VideoResponseDto {
  @ApiProperty({
    description: 'Video ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Provider ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  providerId: string;

  @ApiProperty({
    description: 'Video title',
    example: 'Огляд послуг компанії',
  })
  title: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Детальний огляд наших послуг та можливостей',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Video URL',
    example: '/uploads/videos/123e4567-e89b-12d3-a456-426614174000.mp4',
  })
  videoUrl: string;

  @ApiProperty({
    description: 'Thumbnail URL',
    example: '/uploads/videos/thumbnails/123e4567-e89b-12d3-a456-426614174000.jpg',
    required: false,
  })
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 15728640,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 120,
    required: false,
  })
  duration?: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'video/mp4',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Is video active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Display order',
    example: 0,
  })
  order: number;

  @ApiProperty({
    description: 'Created at',
    example: '2025-11-20T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
    example: '2025-11-20T12:00:00.000Z',
  })
  updatedAt: Date;
}
