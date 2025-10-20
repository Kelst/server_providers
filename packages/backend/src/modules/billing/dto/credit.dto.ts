import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for add credit operation
 */
export class AddCreditResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Кредит встановлено на 5 днів, будь ласка перезавантажте обладнання',
  })
  message: string;

  @ApiProperty({
    description: 'Credit amount that was set',
    example: 4444,
    required: false,
  })
  creditSum?: number;

  @ApiProperty({
    description: 'Credit end date (ISO format)',
    example: '2025-10-25',
    required: false,
  })
  creditEndDate?: string;
}
