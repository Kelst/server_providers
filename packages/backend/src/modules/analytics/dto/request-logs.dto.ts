import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRequestLogsQueryDto {
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
