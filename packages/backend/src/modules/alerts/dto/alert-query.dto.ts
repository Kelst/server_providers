import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, Severity } from '@prisma/client';
import { Type } from 'class-transformer';

export class AlertQueryDto {
  @ApiPropertyOptional({ enum: Severity })
  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @ApiPropertyOptional({ enum: AlertType })
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ruleId?: string;

  @ApiPropertyOptional({ description: 'Filter by resolved status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  resolved?: boolean;

  @ApiPropertyOptional({ description: 'From date (ISO string)' })
  @IsString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date (ISO string)' })
  @IsString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsOptional()
  offset?: number;
}
