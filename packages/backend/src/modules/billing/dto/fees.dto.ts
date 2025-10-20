import { ApiProperty } from '@nestjs/swagger';

/**
 * Single fee/payment item
 */
export class FeeItemDto {
  @ApiProperty({
    description: 'Payment date and time',
    example: '2024-01-15 14:30:00',
  })
  date: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Оплата за інтернет',
  })
  description: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 250.00,
  })
  sum: number;

  @ApiProperty({
    description: 'Deposit/balance after payment',
    example: 150.50,
  })
  deposit: number;
}

/**
 * Fees response with summary and detailed list
 */
export class FeesResponseDto {
  @ApiProperty({
    description: 'Total number of fee records',
    example: 24,
  })
  count: number;

  @ApiProperty({
    description: 'Total sum of all fees',
    example: 6000.00,
  })
  sum: number;

  @ApiProperty({
    description: 'List of fee items (up to 1000 most recent)',
    type: [FeeItemDto],
  })
  paidData: FeeItemDto[];
}
