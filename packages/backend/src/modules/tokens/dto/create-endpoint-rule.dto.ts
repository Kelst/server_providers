import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export class CreateEndpointRuleDto {
  @ApiProperty({
    description: 'Endpoint path to block (e.g., /api/billing/users/140278/payments)',
    example: '/api/billing/users/140278/payments',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiPropertyOptional({
    description: 'HTTP method to block (leave empty to block all methods)',
    example: 'GET',
    enum: HttpMethod,
  })
  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod;

  @ApiPropertyOptional({
    description: 'Description of why this endpoint is blocked',
    example: 'Blocked access to user 140278 payments',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
