import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../constants/payment.constants';

/**
 * Single payment method info
 */
export class PaymentMethodDto {
  @ApiProperty({
    description: 'Payment method identifier',
    example: 'privat24',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment method display name (Ukrainian)',
    example: 'Приват24',
  })
  name: string;

  @ApiProperty({
    description: 'Whether this method is available for current user provider',
    example: true,
  })
  available: boolean;
}

/**
 * Response DTO for available payment methods
 */
export class AvailablePaymentMethodsResponseDto {
  @ApiProperty({
    description: 'User provider name',
    example: 'Intelekt',
  })
  provider: string;

  @ApiProperty({
    description: 'List of available payment methods',
    type: [PaymentMethodDto],
  })
  methods: PaymentMethodDto[];
}
