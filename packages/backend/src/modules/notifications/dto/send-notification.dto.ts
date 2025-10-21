import { IsString, IsOptional, IsInt, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationProvider } from '../enums/provider.enum';

/**
 * DTO for sending notifications
 */
export class SendNotificationDto {
  @ApiProperty({
    description: 'Notification provider',
    enum: NotificationProvider,
    example: NotificationProvider.OPTICOM,
  })
  @IsEnum(NotificationProvider)
  @IsNotEmpty()
  provider: NotificationProvider;

  @ApiPropertyOptional({
    description: 'Telegram chat ID (required if chatId is the primary method)',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  chatId?: string;

  @ApiPropertyOptional({
    description: 'Phone number (required for SMS fallback)',
    example: '+380501234567',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Message text to send',
    example: 'Ваш код підтвердження: 1234',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'User UID for tracking',
    example: 12345,
  })
  @IsInt()
  @IsOptional()
  uid?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { action: 'verification_code', attempt: 1 },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Response DTO for notification sending
 */
export class SendNotificationResponseDto {
  @ApiProperty({
    description: 'Whether the notification was sent successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Повідомлення відправлено через Telegram',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Method used to send the notification',
    example: 'telegram',
  })
  sentVia?: string;

  @ApiPropertyOptional({
    description: 'Notification log ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  logId?: string;
}
