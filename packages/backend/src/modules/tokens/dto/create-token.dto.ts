import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiScope } from '../../../common/constants/scopes.constants';

export class CreateTokenDto {
  @ApiProperty({
    description: 'Project name for the API token',
    example: 'My Project',
  })
  @IsString()
  @IsNotEmpty()
  projectName: string;

  @ApiPropertyOptional({
    description: 'Description of the API token',
    example: 'Token for production API',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Access scopes for this token',
    example: ['billing', 'userside'],
    type: [String],
    enum: ApiScope,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ApiScope, { each: true })
  @IsOptional()
  scopes?: ApiScope[];

  @ApiPropertyOptional({
    description: 'Rate limit per minute',
    example: 100,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Token expiration date (ISO 8601 format)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: Date;
}
