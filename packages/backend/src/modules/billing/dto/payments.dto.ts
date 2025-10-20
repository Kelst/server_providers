import { ApiProperty } from '@nestjs/swagger';

/**
 * Single payment item (incoming funds)
 */
export class PaymentItemDto {
  @ApiProperty({
    description: 'Payment date and time',
    example: '2024-01-20 10:00:00',
  })
  date: string;

  @ApiProperty({
    description: 'Payment description',
    example: 'Поповнення через термінал',
  })
  description: string;

  @ApiProperty({
    description: 'Payment amount (incoming funds)',
    example: 500.00,
  })
  sum: number;

  @ApiProperty({
    description: 'Deposit/balance after payment',
    example: 650.00,
  })
  deposit: number;
}

/**
 * Payments response with summary and detailed list
 */
export class PaymentsResponseDto {
  @ApiProperty({
    description: 'Total number of payment records',
    example: 12,
  })
  count: number;

  @ApiProperty({
    description: 'Total sum of all payments (incoming funds)',
    example: 3000.00,
  })
  sum: number;

  @ApiProperty({
    description: 'List of payment items (up to 1000 most recent)',
    type: [PaymentItemDto],
  })
  paidData: PaymentItemDto[];
}
