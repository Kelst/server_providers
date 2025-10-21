import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for requesting phone number change
 */
export class RequestPhoneChangeDto {
  @ApiProperty({
    description: 'New phone number (will be normalized to 380XXXXXXXXX format)',
    example: '+380 67 123 45 67',
    examples: {
      international: {
        value: '+380671234567',
        summary: 'International format with +'
      },
      withSpaces: {
        value: '+380 67 123 45 67',
        summary: 'With spaces'
      },
      national: {
        value: '0671234567',
        summary: 'National format (0XX)'
      },
      normalized: {
        value: '380671234567',
        summary: 'Already normalized'
      }
    }
  })
  @IsString()
  @IsNotEmpty()
  newPhone: string;
}

/**
 * Response DTO for phone change request
 */
export class RequestPhoneChangeResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Код підтвердження відправлено на новий номер телефону',
  })
  message: string;
}

/**
 * DTO for confirming phone number change
 */
export class ConfirmPhoneChangeDto {
  @ApiProperty({
    description: '6-digit verification code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only digits' })
  code: string;
}

/**
 * Response DTO for phone change confirmation
 */
export class ConfirmPhoneChangeResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Код підтверджено, номер телефону оновлено',
  })
  message: string;

  @ApiProperty({
    description: 'New phone number (if successful)',
    example: '+380671234567',
    required: false,
  })
  newPhone?: string;
}
