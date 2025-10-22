import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationProvider } from '../../notifications/enums/provider.enum';

/**
 * DTO for requesting phone login (send verification code)
 */
export class PhoneLoginRequestDto {
  @ApiProperty({
    description: 'Phone number (Ukrainian format: +380XXXXXXXXX or 0XXXXXXXXX)',
    example: '+380501234567',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Provider/Company name for user isolation',
    enum: NotificationProvider,
    example: NotificationProvider.INTELEKT,
  })
  @IsEnum(NotificationProvider)
  @IsNotEmpty()
  provider: NotificationProvider;
}

/**
 * Response DTO for phone login request
 */
export class PhoneLoginRequestResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Код підтвердження відправлено на ваш номер телефону',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when user can retry (if rate limited)',
    example: '2025-10-21T11:35:00.000Z',
    required: false,
  })
  canRetryAt?: string;
}

/**
 * DTO for verifying phone login code
 */
export class PhoneLoginVerifyDto {
  @ApiProperty({
    description: 'Phone number (must match the request)',
    example: '+380501234567',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Provider/Company name (must match the request)',
    enum: NotificationProvider,
    example: NotificationProvider.INTELEKT,
  })
  @IsEnum(NotificationProvider)
  @IsNotEmpty()
  provider: NotificationProvider;

  @ApiProperty({
    description: '6-digit verification code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

/**
 * Response DTO for phone login verification
 */
export class PhoneLoginVerifyResponseDto {
  @ApiProperty({
    description: 'Whether verification was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID (only if success=true)',
    example: 140278,
    required: false,
  })
  uid?: number;

  @ApiProperty({
    description: 'User login (only if success=true)',
    example: 'user123',
    required: false,
  })
  login?: string;

  @ApiProperty({
    description: 'Company name (only if success=true)',
    example: 'Intelekt',
    required: false,
  })
  company?: string;

  @ApiProperty({
    description: 'User status (only if success=true)',
    example: 1,
    required: false,
  })
  status?: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Успішно автентифіковано',
  })
  message: string;
}
