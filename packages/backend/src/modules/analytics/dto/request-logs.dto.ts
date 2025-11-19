import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class JsonFieldFilterDto {
  @ApiProperty({ description: 'JSON field path (e.g., "login", "uid", "data.user.phone")', example: 'login' })
  @IsString()
  fieldPath: string;

  @ApiProperty({ description: 'Filter operator', enum: ['equals', 'contains', 'gt', 'lt', 'gte', 'lte'], example: 'equals' })
  @IsEnum(['equals', 'contains', 'gt', 'lt', 'gte', 'lte'])
  operator: string;

  @ApiProperty({ description: 'Value to filter by', example: 'vlad_b_1' })
  @IsString()
  value: string;
}

export class GetRequestLogsQueryDto {
  @ApiPropertyOptional({ description: 'Global search term (searches across all JSON fields, endpoint, IP)', example: 'vlad_b_1' })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'IP address to filter by', example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'JSON field filters', type: [JsonFieldFilterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonFieldFilterDto)
  jsonFilters?: JsonFieldFilterDto[];
  @ApiPropertyOptional({ description: 'Token ID to filter by' })
  @IsOptional()
  @IsString()
  tokenId?: string;

  @ApiPropertyOptional({ description: 'Endpoint to filter by' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'HTTP method to filter by' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Status code to filter by' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Time period', enum: ['1h', '24h', '7d', '30d'], default: '24h' })
  @IsOptional()
  @IsIn(['1h', '24h', '7d', '30d'])
  period?: string = '24h';
}

export class RequestLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tokenId: string;

  @ApiProperty({ required: false })
  tokenName?: string;

  @ApiProperty({ required: false })
  projectName?: string;

  @ApiProperty()
  endpoint: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  responseTime: number;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty({ required: false })
  userAgent?: string;

  @ApiProperty({ required: false, type: 'object' })
  requestPayload?: any;

  @ApiProperty({ required: false, type: 'object' })
  responsePayload?: any;

  @ApiProperty({ required: false })
  errorMessage?: string;

  @ApiProperty()
  createdAt: Date;
}

export class RequestLogsResponseDto {
  @ApiProperty({ type: [RequestLogDto] })
  requests: RequestLogDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
