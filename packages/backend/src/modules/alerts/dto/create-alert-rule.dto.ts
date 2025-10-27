import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertType, Severity } from '@prisma/client';

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Alert rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Alert rule description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AlertType, description: 'Type of alert' })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ description: 'Metric to monitor (e.g., errorRate, cpuUsage)' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Threshold value to trigger alert' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: 'Comparison operator (>, <, >=, <=, ==)', enum: ['>', '<', '>=', '<=', '=='] })
  @IsString()
  comparisonOp: string;

  @ApiProperty({ description: 'Time window in minutes to check', default: 5 })
  @IsNumber()
  @Min(1)
  @Max(60)
  windowMinutes: number;

  @ApiProperty({ enum: Severity, description: 'Alert severity level', default: Severity.WARNING })
  @IsEnum(Severity)
  severity: Severity;

  @ApiProperty({ description: 'Cooldown period in minutes between alerts', default: 10 })
  @IsNumber()
  @Min(5)
  @Max(120)
  cooldownMinutes: number;

  @ApiProperty({ description: 'Send Telegram notification', default: true })
  @IsBoolean()
  notifyTelegram: boolean;

  @ApiProperty({ description: 'Send email notification', default: false })
  @IsBoolean()
  notifyEmail: boolean;

  @ApiProperty({ description: 'Send webhook notification', default: false })
  @IsBoolean()
  notifyWebhook: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL (required if notifyWebhook is true)' })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ description: 'Send recovery notification when issue resolves', default: true })
  @IsBoolean()
  notifyOnRecovery: boolean;

  @ApiProperty({ description: 'Is alert rule active', default: true })
  @IsBoolean()
  isActive: boolean;
}
