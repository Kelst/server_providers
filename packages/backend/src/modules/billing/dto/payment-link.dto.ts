import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

/**
 * Request DTO for generating payment link
 */
export class GeneratePaymentLinkDto {
  @ApiProperty({
    description: 'Payment amount in UAH',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;
}

/**
 * Response DTO for payment link generation
 */
export class PaymentLinkResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Посилання на оплату успішно згенеровано',
  })
  message: string;

  @ApiProperty({
    description: 'Payment link URL',
    example: 'https://www.liqpay.ua/api/3/checkout?data=...&signature=...',
    required: false,
  })
  link?: string;
}
