import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Period enum for time range filtering
 */
export enum AnalyticsPeriod {
  HOURS_24 = '24h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
}

/**
 * Query DTO for endpoints by token
 */
export class GetEndpointsByTokenQueryDto {
  @ApiProperty({
    description: 'Time period for analytics',
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.HOURS_24,
    default: AnalyticsPeriod.HOURS_24,
    required: false,
  })
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period?: AnalyticsPeriod = AnalyticsPeriod.HOURS_24;

  @ApiProperty({
    description: 'Filter by specific token ID (optional)',
    example: '9b856363-de1d-4e1b-bfd7-5ef5140f795c',
    required: false,
  })
  @IsString()
  @IsOptional()
  tokenId?: string;
}

/**
 * Endpoint statistics DTO
 */
export class EndpointStatsDto {
  @ApiProperty({
    description: 'Endpoint path',
    example: '/api/billing/users/140278',
  })
  endpoint: string;

  @ApiProperty({
    description: 'HTTP method',
    example: 'POST',
  })
  method: string;

  @ApiProperty({
    description: 'Total number of requests',
    example: 1234,
  })
  totalRequests: number;

  @ApiProperty({
    description: 'Number of successful requests (status < 400)',
    example: 1215,
  })
  successRequests: number;

  @ApiProperty({
    description: 'Number of error requests (status >= 400)',
    example: 19,
  })
  errorRequests: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 98.5,
  })
  successRate: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 245,
  })
  avgResponseTime: number;
}

/**
 * Token endpoint statistics DTO
 */
export class TokenEndpointStatsDto {
  @ApiProperty({
    description: 'Token ID',
    example: '9b856363-de1d-4e1b-bfd7-5ef5140f795c',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Production API',
  })
  projectName: string;

  @ApiProperty({
    description: 'List of endpoints with statistics',
    type: [EndpointStatsDto],
  })
  endpoints: EndpointStatsDto[];
}

/**
 * Response DTO for endpoints by token
 */
export class EndpointsByTokenResponseDto {
  @ApiProperty({
    description: 'Time period of the data',
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.HOURS_24,
  })
  period: AnalyticsPeriod;

  @ApiProperty({
    description: 'List of tokens with their endpoint statistics',
    type: [TokenEndpointStatsDto],
  })
  tokens: TokenEndpointStatsDto[];
}
